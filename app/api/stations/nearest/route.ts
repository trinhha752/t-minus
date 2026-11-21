// GET /api/stations/nearest?lat=42.3734&lon=-71.1189
// The game station (from components/run/stations.ts) closest to the player,
// and whether they're close enough to check in (150 m). Also the closest real
// MBTA station of any kind, so the UI can say "you're at BU East, which isn't
// in the game yet" instead of pretending you're nowhere.
// -> { slug, stationId, name, metres, inRange, lat, lon,
//      nearestAny: { stationId, name, routes, metres } }

import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/respond";
import { q } from "@/lib/db";
import { CHAPTERS } from "@/lib/chapters";
import { CHECKIN_RADIUS_M, metresBetween } from "@/lib/geo";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return fail("lat and lon are required");
  }

  const game = new Map(CHAPTERS.flatMap((c) => c.stations).map((s) => [s.stationId, s]));
  const rows = await q<{ id: string; name: string; lat: number; lon: number; routes: string[] }>(
    `SELECT id, name, lat, lon, routes FROM stations`
  );

  let best: { slug: string; stationId: string; name: string; metres: number } | null = null;
  let any: { stationId: string; name: string; routes: string[]; metres: number } | null = null;
  for (const r of rows) {
    const metres = metresBetween(lat, lon, r.lat, r.lon);
    if (!any || metres < any.metres) any = { stationId: r.id, name: r.name, routes: r.routes, metres };
    const g = game.get(r.id);
    if (g && (!best || metres < best.metres)) best = { slug: g.slug, stationId: r.id, name: g.name, metres };
  }
  if (!best || !any) return fail("no stations", 500);
  return ok({ ...best, inRange: best.metres <= CHECKIN_RADIUS_M, lat, lon, nearestAny: any });
}
