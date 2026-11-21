// GET /api/predictions?stop=place-pktrm (or a UI slug like "park") -> the next 3 arrivals, soonest first.
import type { NextRequest } from "next/server";
import { getPredictions } from "@/lib/mbta";
import { fail, ok } from "@/lib/respond";
import { toMbtaId } from "@/lib/chapters";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("stop");
  if (!raw) return fail("stop is required");
  const stop = toMbtaId(raw) ?? raw;

  try {
    return ok(await getPredictions(stop, 3));
  } catch (e) {
    console.error("[predictions]", e);
    return fail("could not reach the MBTA", 502);
  }
}
