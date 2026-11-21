// GET /api/predictions?stop=place-pktrm -> the next 3 arrivals, soonest first.
import type { NextRequest } from "next/server";
import { getPredictions } from "@/lib/mbta";
import { fail, ok } from "@/lib/respond";

export async function GET(request: NextRequest) {
  const stop = request.nextUrl.searchParams.get("stop");
  if (!stop) return fail("stop is required");

  try {
    return ok(await getPredictions(stop, 3));
  } catch (e) {
    console.error("[predictions]", e);
    return fail("could not reach the MBTA", 502);
  }
}
