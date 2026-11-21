// POST /api/guess { stationId, guessMinutes }
// Locks a guess onto the next train at least 90s out. One open guess per rider.
// Then poll GET /api/guess/:id every 10s until resolved is true.

import { fail, ok, readJson } from "@/lib/respond";
import { currentUserId } from "@/lib/session";
import { createGuess } from "@/lib/guess";
import { GameRuleError } from "@/lib/progress";
import { toMbtaId } from "@/lib/chapters";
import type { GuessRequest } from "@/types";

export async function POST(request: Request) {
  const body = await readJson<GuessRequest>(request);
  if (!body || typeof body.stationId !== "string" || typeof body.guessMinutes !== "number") {
    return fail("expected { stationId, guessMinutes }");
  }
  const userId = await currentUserId();
  try {
    return ok(await createGuess(userId, toMbtaId(body.stationId) ?? body.stationId, body.guessMinutes));
  } catch (e) {
    if (e instanceof GameRuleError) return fail(e.message, e.message.startsWith("you already") ? 409 : 400);
    throw e;
  }
}
