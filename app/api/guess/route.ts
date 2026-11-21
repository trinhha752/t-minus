// Owner: Backend. MOCK — store the guess against the next real arrival.
import type { GuessCreated, GuessRequest } from "@/types";
import { fail, ok, readJson } from "@/lib/respond";

export async function POST(request: Request) {
  const body = await readJson<GuessRequest>(request);
  if (!body || typeof body.stationId !== "string" || typeof body.guessMinutes !== "number") {
    return fail("expected { stationId, guessMinutes }");
  }

  const created: GuessCreated = {
    guessId: "guess-mock-1",
    targetArrivalAt: new Date(Date.now() + 4 * 60_000).toISOString(),
  };
  return ok(created);
}
