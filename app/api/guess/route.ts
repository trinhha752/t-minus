// MOCK — store the guess against the next real arrival.
import type { Guess, GuessRequest } from "@/types";
import { fail, ok, readJson } from "@/lib/respond";

export async function POST(request: Request) {
  const body = await readJson<GuessRequest>(request);
  if (!body || typeof body.stationId !== "string" || typeof body.guessMinutes !== "number") {
    return fail("expected { stationId, guessMinutes }");
  }

  const created: Guess = {
    id: "guess-mock-1",
    stationId: body.stationId,
    guessMinutes: body.guessMinutes,
    targetArrivalIso: new Date(Date.now() + 4 * 60_000).toISOString(),
    resolved: false,
    actualMinutes: null,
    pointsEarned: null,
  };
  return ok(created);
}
