// POST /api/final-boss/hit { fightId }
// One landed attack. Call it each time the player clears a round or answers
// correctly during the fight. At most one hit per 1.5 s per fight.
import { hitFinalBoss, GameRuleError } from "@/lib/progress";
import { currentUserId } from "@/lib/session";
import { fail, ok, readJson } from "@/lib/respond";
import type { FinalBossHitRequest } from "@/types";

export async function POST(request: Request) {
  const body = await readJson<FinalBossHitRequest>(request);
  if (!body || typeof body.fightId !== "string" || !/^\d+$/.test(body.fightId)) {
    return fail("expected { fightId }");
  }

  try {
    return ok(await hitFinalBoss(await currentUserId(), body.fightId));
  } catch (e) {
    if (e instanceof GameRuleError) return fail(e.message, e.message === "too fast" ? 429 : 400);
    console.error("[final-boss/hit]", e);
    return fail("could not land the hit", 500);
  }
}
