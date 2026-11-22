// POST /api/final-boss/forfeit { fightId }
// Out of hearts or walked away: ends the fight without a win.
import { forfeitFinalBoss, GameRuleError } from "@/lib/progress";
import { currentUserId } from "@/lib/session";
import { fail, ok, readJson } from "@/lib/respond";
import type { FinalBossForfeitRequest } from "@/types";

export async function POST(request: Request) {
  const body = await readJson<FinalBossForfeitRequest>(request);
  if (!body || typeof body.fightId !== "string") return fail("expected { fightId }");
  try {
    return ok(await forfeitFinalBoss(await currentUserId(), body.fightId));
  } catch (e) {
    if (e instanceof GameRuleError) return fail(e.message);
    console.error("[final-boss/forfeit]", e);
    return fail("could not end the fight", 500);
  }
}
