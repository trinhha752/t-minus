// GET /api/predictions?stop=place-pktrm (or a UI slug like "park")&limit=3
// -> the next arrivals, soonest first, both directions. limit 1..10, default 3.
import type { NextRequest } from "next/server";
import { getPredictions } from "@/lib/mbta";
import { fail, ok } from "@/lib/respond";
import { toMbtaId } from "@/lib/chapters";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("stop");
  if (!raw) return fail("stop is required");
  const stop = toMbtaId(raw) ?? raw;

  try {
    const limit = Math.min(10, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 3));
    return ok(await getPredictions(stop, limit));
  } catch (e) {
    console.error("[predictions]", e);
    return fail("could not reach the MBTA", 502);
  }
}
