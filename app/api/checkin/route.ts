// POST /api/checkin  { stationId, lat, lon, teleport? }

import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/respond";
import { q, one } from "@/lib/db";
import { currentUserId } from "@/lib/session";
import { withinCheckinRange } from "@/lib/geo";
import { POINTS, CO2_KG_SAVED_PER_RIDE, nextStreak } from "@/lib/scoring";
import type { Badge, CheckinRequest, CheckinResult, RouteId } from "@/types";
import { routeToTeam } from "@/types";

/** Boston local date as YYYY-MM-DD, which is what the streak rule wants. */
function todayInBoston(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function POST(req: NextRequest) {
  let body: CheckinRequest;
  try {
    body = (await req.json()) as CheckinRequest;
  } catch {
    return fail("bad json", 400);
  }

  const userId = await currentUserId();

  const station = await one<{
    id: string;
    name: string;
    lat: number;
    lon: number;
    routes: string[];
  }>(`SELECT id, name, lat, lon, routes FROM stations WHERE id = $1`, [body.stationId]);

  if (!station) {
    const miss: CheckinResult = {
      accepted: false,
      reason: "unknown_station",
      pointsEarned: 0,
      newBadges: [],
    };
    return ok(miss);
  }

  // Distance test, unless this is the demo teleport.
  if (!body.teleport) {
    const { ok: near, metres } = withinCheckinRange(
      body.lat,
      body.lon,
      station.lat,
      station.lon
    );
    if (!near) {
      const far: CheckinResult = {
        accepted: false,
        reason: "too_far",
        metresAway: metres,
        pointsEarned: 0,
        newBadges: [],
      };
      return ok(far);
    }
  }

  // The unique index does the real work: a second tap today is a no-op.
  const inserted = await q(
    `INSERT INTO checkins (user_id, station_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [userId, station.id]
  );

  if (inserted.length === 0) {
    const dupe: CheckinResult = {
      accepted: false,
      reason: "already_today",
      pointsEarned: 0,
      newBadges: [],
    };
    return ok(dupe);
  }

  /* ---- score it ---- */

  const user = await one<{ streak: number; last_ride_date: string | null }>(
    `SELECT streak, to_char(last_ride_date,'YYYY-MM-DD') AS last_ride_date
       FROM users WHERE id = $1`,
    [userId]
  );

  const today = todayInBoston();
  const streak = nextStreak(user?.streak ?? 0, user?.last_ride_date ?? null, today);

  await q(
    `UPDATE users
        SET points = points + $2,
            streak = $3,
            last_ride_date = $4::date,
            co2_saved_kg = co2_saved_kg + $5
      WHERE id = $1`,
    [userId, POINTS.checkin, streak, today, CO2_KG_SAVED_PER_RIDE]
  );

  /* ---- badges ---- */

  const newBadges: Badge[] = [];

  const stationBadge = await q<{ earned_at: Date }>(
    `INSERT INTO badges (user_id, type, label)
     VALUES ($1, 'station', $2)
     ON CONFLICT DO NOTHING
     RETURNING earned_at`,
    [userId, station.name]
  );
  if (stationBadge.length) {
    newBadges.push({
      type: "station",
      label: station.name,
      earnedAt: stationBadge[0].earned_at.toISOString(),
    });
  }

  // Did that complete a whole line?
  for (const route of station.routes as RouteId[]) {
    const [row] = await q<{ total: string; stamped: string }>(
      `SELECT
         (SELECT COUNT(*) FROM stations WHERE $2 = ANY(routes)) AS total,
         (SELECT COUNT(DISTINCT c.station_id)
            FROM checkins c JOIN stations s ON s.id = c.station_id
           WHERE c.user_id = $1 AND $2 = ANY(s.routes)) AS stamped`,
      [userId, route]
    );
    if (row && Number(row.total) > 0 && row.total === row.stamped) {
      const label = `${routeToTeam(route)} Line complete`;
      const got = await q<{ earned_at: Date }>(
        `INSERT INTO badges (user_id, type, label) VALUES ($1,'line',$2)
         ON CONFLICT DO NOTHING RETURNING earned_at`,
        [userId, label]
      );
      if (got.length) {
        newBadges.push({ type: "line", label, earnedAt: got[0].earned_at.toISOString() });
      }
    }
  }

  const result: CheckinResult = {
    accepted: true,
    pointsEarned: POINTS.checkin,
    newBadges,
  };
  return ok(result);
}
