// GET /api/stations/nearest?lat=42.3734&lon=-71.1189
// The game station (from components/run/stations.ts) closest to the player,
// and whether they're close enough to check in (150 m).
// -> { slug, stationId, name, metres, inRange }

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
  const rows = await q<{ id: string; name: string; lat: number; lon: number }>(
    `SELECT id, name, lat, lon FROM stations WHERE id = ANY($1)`,
    [[...game.keys()]]
  );

  let best: { slug: string; stationId: string; name: string; metres: number } | null = null;
  for (const r of rows) {
    const metres = metresBetween(lat, lon, r.lat, r.lon);
    if (!best || metres < best.metres) best = { slug: game.get(r.id)!.slug, stationId: r.id, name: game.get(r.id)!.name, metres };
  }
  if (!best) return fail("no stations", 500);
  return ok({ ...best, inRange: best.metres <= CHECKIN_RADIUS_M });
}
