// Owner: Backend. MOCK — check the answer server-side against trivia_questions,
// and apply boss damage in one transaction.
import type { TriviaAnswerRequest, TriviaAnswerResult } from "@/types";
import { fail, ok, readJson } from "@/lib/respond";
import { POINTS } from "@/lib/scoring";

export async function POST(request: Request) {
  const body = await readJson<TriviaAnswerRequest>(request);
  if (!body || typeof body.questionId !== "string" || typeof body.choiceIndex !== "number") {
    return fail("expected { questionId, choiceIndex }");
  }

  const correct = body.choiceIndex === 0; // mock: option A is always right
  const result: TriviaAnswerResult = {
    correct,
    pointsEarned: correct ? POINTS.triviaCorrect : 0,
    bossDamage: 0,
    bossHpRemaining: null,
  };
  return ok(result);
}
