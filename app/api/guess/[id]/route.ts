// MOCK — resolve once the target arrival has happened.
// The client polls this every 10 seconds until resolved is true.
import type { NextRequest } from "next/server";
import type { Guess } from "@/types";
import { ok } from "@/lib/respond";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/guess/[id]">) {
  const { id } = await ctx.params;
  const status: Guess = {
    id,
    stationId: "place-pktrm",
    guessMinutes: 4,
    targetArrivalIso: new Date(Date.now() + 4 * 60_000).toISOString(),
    resolved: false,
    actualMinutes: null,
    pointsEarned: null,
  };
  return ok(status);
}
