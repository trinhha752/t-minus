// GET /api/me — the current rider: points, level, streak, badges, and the
// stations they have stamped (checked in at, or cleared the mini-game at).
// The map reads stampedStationIds to fill in collected stations.

import { connection } from "next/server";
import { fail, ok } from "@/lib/respond";
import { q, one } from "@/lib/db";
import { currentUserId } from "@/lib/session";
import { levelFor } from "@/lib/scoring";
import type { Badge, Me, TeamLine } from "@/types";

export async function GET() {
  await connection();
  const userId = await currentUserId();

  const user = await one<{
    id: string;
    name: string;
    team_line: TeamLine;
    points: number;
    streak: number;
    co2_saved_kg: string;
  }>(`SELECT id, name, team_line, points, streak, co2_saved_kg FROM users WHERE id = $1`, [userId]);
  if (!user) return fail("rider not found", 404);

  const [stamps, badges] = await Promise.all([
    q<{ station_id: string }>(
      `SELECT station_id FROM checkins WHERE user_id = $1
        UNION
       SELECT station_id FROM minigame_runs WHERE user_id = $1 AND cleared
        ORDER BY station_id`,
      [userId]
    ),
    q<{ type: Badge["type"]; label: string; earned_at: Date }>(
      `SELECT type, label, earned_at FROM badges WHERE user_id = $1 ORDER BY earned_at`,
      [userId]
    ),
  ]);

  const me: Me = {
    id: user.id,
    name: user.name,
    team: user.team_line,
    level: levelFor(user.points),
    points: user.points,
    streak: user.streak,
    co2SavedKg: Number(user.co2_saved_kg),
    stampedStationIds: stamps.map((s) => s.station_id),
    badges: badges.map((b) => ({ type: b.type, label: b.label, earnedAt: b.earned_at.toISOString() })),
  };
  return ok(me);
}
