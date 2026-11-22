// POST /api/final-boss/answer { fightId, questionId, choiceIndex }
// One answer in the final boss fight, checked here. Max one per 1.5s (429).
import { answerFinalBoss, GameRuleError } from "@/lib/progress";
import { currentUserId } from "@/lib/session";
import { fail, ok, readJson } from "@/lib/respond";
import type { FinalBossAnswerRequest } from "@/types";

export async function POST(request: Request) {
  const body = await readJson<FinalBossAnswerRequest>(request);
  if (!body || typeof body.fightId !== "string" || typeof body.questionId !== "string" || typeof body.choiceIndex !== "number") {
    return fail("expected { fightId, questionId, choiceIndex }");
  }
  try {
    return ok(await answerFinalBoss(await currentUserId(), body.fightId, body.questionId, body.choiceIndex));
  } catch (e) {
    if (e instanceof GameRuleError) return fail(e.message, e.message === "too fast" ? 429 : 400);
    console.error("[final-boss/answer]", e);
    return fail("could not record the answer", 500);
  }
}
