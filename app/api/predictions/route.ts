// Owner: Transit. MOCK — replace with lib/mbta.ts (/predictions, 10s cache).
import type { NextRequest } from "next/server";
import type { PredictionsResponse } from "@/types";
import { fail, ok } from "@/lib/respond";

const MOCK: PredictionsResponse = [
  { route: "Red", direction: "Alewife", secondsAway: 150 },
  { route: "Red", direction: "Ashmont/Braintree", secondsAway: 280 },
  { route: "Green-B", direction: "Boston College", secondsAway: 420 },
];

export async function GET(request: NextRequest) {
  const stop = request.nextUrl.searchParams.get("stop");
  if (!stop) return fail("missing ?stop=");
  return ok(MOCK);
}
