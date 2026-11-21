// Owner: Characters. MOCK — replace with trivia_questions (verified only).
// Never send answerIndex to the browser.
import type { NextRequest } from "next/server";
import type { TriviaQuestion, TriviaRound } from "@/types";
import { fail, ok } from "@/lib/respond";
import { roundSize } from "@/lib/scoring";

const MOCK_QUESTIONS: TriviaQuestion[] = [1, 2, 3, 4, 5].map((n) => ({
  id: `q-mock-${n}`,
  stationId: "place-pktrm",
  question: `Placeholder question ${n} (replace with a verified question)`,
  options: ["Option A", "Option B", "Option C", "Option D"],
  verified: false,
}));

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const stop = params.get("stop");
  const wait = Number(params.get("wait"));
  if (!stop) return fail("missing ?stop=");
  if (!Number.isFinite(wait) || wait < 0) return fail("bad ?wait= (seconds)");

  const bossActive = false; // TODO: read from boss_events for this stop's line
  const round: TriviaRound = {
    stationId: stop,
    waitSeconds: wait,
    bossEventId: bossActive ? "boss-mock-1" : null,
    questions: MOCK_QUESTIONS.slice(0, roundSize(wait, bossActive)),
  };
  return ok(round);
}
