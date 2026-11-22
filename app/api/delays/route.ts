// GET /api/delays?line=Green&hours=3
// -> { line, points: [{ t, avgDelaySeconds, maxDelaySeconds }], stats: { snapshotRows, compressionSavedPct } }
// Delay history from the delay_5m continuous aggregate in Tiger Data (see lib/delays.ts).

import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/respond";
import { delayHistory, tigerStats } from "@/lib/delays";
import type { TeamLine } from "@/types";
import { ALL_TEAMS } from "@/types";

export async function GET(req: NextRequest) {
  const line = req.nextUrl.searchParams.get("line") as TeamLine | null;
  if (!line || !ALL_TEAMS.includes(line)) return fail("line must be Red, Orange, Blue or Green");
  const hours = Math.min(12, Math.max(1, Number(req.nextUrl.searchParams.get("hours")) || 3));
  const [points, stats] = await Promise.all([delayHistory(line, hours), tigerStats()]);
  return ok({ line, hours, points, stats });
}
