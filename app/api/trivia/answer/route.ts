// POST /api/trivia/answer  { roundId, questionId, choiceIndex }
//
// The answer is checked here, on the server. Boss damage is applied in a
// locked transaction so simultaneous answers cannot overdraw the bar.

import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/respond";
import { q, one } from "@/lib/db";
import { currentUserId } from "@/lib/session";
import { damageBoss } from "@/lib/boss";
import { answerFor } from "@/lib/trivia";
import { POINTS } from "@/lib/scoring";
import type {
  RouteId,
  TeamLine,
  TriviaAnswerRequest,
  TriviaAnswerResult,
} from "@/types";
import { routeToTeam } from "@/types";

export async function POST(req: NextRequest) {
  let body: TriviaAnswerRequest;
  try {
    body = (await req.json()) as TriviaAnswerRequest;
  } catch {
    return fail("bad json", 400);
  }

  const userId = await currentUserId();

  const question = await answerFor(body.questionId);
  if (!question) return fail("unknown question", 404);

  const correct = body.choiceIndex === question.answer_index;

  // Only the first answer to a question each Boston day counts. Without this,
  // one rider could answer the same question in a loop and solo the boss.
  const repeat = await one(
    `SELECT 1 FROM trivia_answers
      WHERE user_id = $1 AND question_id = $2
        AND (created_at AT TIME ZONE 'America/New_York')::date
          = (now() AT TIME ZONE 'America/New_York')::date
      LIMIT 1`,
    [userId, question.id]
  );
  if (repeat) {
    const result: TriviaAnswerResult = {
      correct,
      correctIndex: question.answer_index,
      explanation: question.explanation,
      pointsEarned: 0,
      bossDamage: 0,
      bossHpRemaining: null,
      combo: 0,
      alreadyAnswered: true,
    };
    return ok(result);
  }

  // Which line is this station on, and is its boss up?
  const station = await one<{ routes: string[] }>(
    `SELECT routes FROM stations WHERE id = $1`,
    [question.station_id]
  );
  const lines = [...new Set(((station?.routes ?? []) as RouteId[]).map(routeToTeam))];

  const liveBoss = await one<{ id: number; line: TeamLine }>(
    `SELECT id, line FROM boss_events
      WHERE ended_at IS NULL AND line = ANY($1::text[])
      LIMIT 1`,
    [lines]
  );

  // Combo: this rider's correct answers in a row on this boss so far.
  let comboBefore = 0;
  if (liveBoss) {
    const recent = await q<{ correct: boolean }>(
      `SELECT correct FROM trivia_answers
        WHERE user_id = $1 AND boss_event_id = $2
        ORDER BY created_at DESC LIMIT 10`,
      [userId, liveBoss.id]
    );
    for (const r of recent) {
      if (!r.correct) break;
      comboBefore++;
    }
  }
  const combo = liveBoss ? (correct ? comboBefore + 1 : 0) : 0;

  await q(
    `INSERT INTO trivia_answers (user_id, question_id, correct, boss_event_id)
     VALUES ($1, $2, $3, $4)`,
    [userId, question.id, correct, liveBoss?.id ?? null]
  );

  let pointsEarned = 0;
  let bossDamage = 0;
  let bossHpRemaining: number | null = null;

  if (correct) {
    if (liveBoss) {
      // During a boss the answer feeds the shared bar instead of your score.
      const hit = await damageBoss(liveBoss.line, userId, comboBefore);
      bossDamage = hit.damage;
      bossHpRemaining = hit.hpRemaining;

      if (hit.defeated) {
        await q(
          `UPDATE users SET points = points + $2
            WHERE id IN (
              SELECT DISTINCT user_id FROM trivia_answers WHERE boss_event_id = $1
            )`,
          [liveBoss.id, POINTS.bossDefeatedBonus]
        );
      }
    } else {
      pointsEarned = POINTS.triviaCorrect;
      await q(`UPDATE users SET points = points + $2 WHERE id = $1`, [
        userId,
        pointsEarned,
      ]);
    }
  }

  const result: TriviaAnswerResult = {
    correct,
    correctIndex: question.answer_index,
    explanation: question.explanation,
    pointsEarned,
    bossDamage,
    bossHpRemaining,
    combo,
    alreadyAnswered: false,
  };
  return ok(result);
}
