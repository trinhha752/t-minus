// lib/trivia.ts
// Shared question lookups. Answers never leave the server.

import { q } from "./db";
import type { TriviaQuestion } from "../types";

/**
 * Only verified questions are ever served. For local development before
 * anyone has checked the sources, ALLOW_UNVERIFIED_TRIVIA=1 in .env.local
 * serves unverified ones too. It is ignored in production builds.
 */
export const ALLOW_UNVERIFIED =
  process.env.ALLOW_UNVERIFIED_TRIVIA === "1" && process.env.NODE_ENV !== "production";

/** SQL condition for "this question may be served". */
export const SERVABLE = ALLOW_UNVERIFIED ? "true" : "verified";

interface Row {
  id: string;
  station_id: string;
  question: string;
  options: string[];
  verified: boolean;
}

const toQuestion = (r: Row): TriviaQuestion => ({
  id: r.id,
  stationId: r.station_id,
  question: r.question,
  options: r.options,
  verified: r.verified,
});

/** Random servable questions from these stations. */
export async function questionsForStations(stationIds: string[], limit: number): Promise<TriviaQuestion[]> {
  const rows = await q<Row>(
    `SELECT id, station_id, question, options, verified
       FROM trivia_questions
      WHERE station_id = ANY($1) AND ${SERVABLE}
      ORDER BY random()
      LIMIT $2`,
    [stationIds, limit]
  );
  return rows.map(toQuestion);
}

/** The answer for one servable question, or null. Server-side only. */
export async function answerFor(questionId: string) {
  const [row] = await q<{ id: string; station_id: string; answer_index: number; explanation: string | null }>(
    `SELECT id, station_id, answer_index, explanation
       FROM trivia_questions WHERE id = $1 AND ${SERVABLE}`,
    [questionId]
  );
  return row ?? null;
}
