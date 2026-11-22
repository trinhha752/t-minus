// lib/guess.ts
// The arrival guess: "how many minutes until the next train?"
//
// A guess locks onto one physical train (trip id), not a clock time. If that
// train slips 3 minutes, the answer slips with it. That's the point: you're
// betting on the real T, not the schedule.

import { randomUUID } from "node:crypto";
import { q, one } from "./db";
import { getPredictions } from "./mbta";
import {
  GUESS_MAX_LEAD_SECONDS,
  GUESS_MIN_LEAD_SECONDS,
  GUESS_VOID_IF_GONE_EARLY_SECONDS,
  scoreGuess,
} from "./scoring";
import { GameRuleError } from "./progress";
import type { Arrival, Guess } from "../types";

interface GuessRow {
  id: string;
  user_id: string;
  station_id: string;
  guess_minutes: string;
  target_arrival: Date;
  trip_id: string | null;
  actual_minutes: string | null;
  points_earned: number | null;
  resolved: boolean;
  created_at: Date;
}

function toGuess(r: GuessRow): Guess {
  return {
    id: r.id,
    stationId: r.station_id,
    guessMinutes: Number(r.guess_minutes),
    targetArrivalIso: r.target_arrival.toISOString(),
    resolved: r.resolved,
    actualMinutes: r.actual_minutes === null ? null : Number(r.actual_minutes),
    pointsEarned: r.points_earned,
  };
}

/* ---------- the pure bit ---------- */

export type GuessDecision =
  | { kind: "wait"; targetMs: number }
  | { kind: "score"; arrivedMs: number }
  | { kind: "void" };

/**
 * What to do with an open guess, given the train's current prediction
 * (null if it no longer appears at the station).
 *  - still coming: wait, moving the target to the latest prediction
 *  - at the platform: score against its arrival time
 *  - gone after its time: it left; score against the last time we saw
 *  - gone well before its time: cancelled or rerouted; void, no points
 */
export function decideGuess(
  targetMs: number,
  current: Pick<Arrival, "time" | "secondsAway"> | null,
  nowMs: number
): GuessDecision {
  if (current) {
    const t = Date.parse(current.time);
    return current.secondsAway > 0 ? { kind: "wait", targetMs: t } : { kind: "score", arrivedMs: t };
  }
  if (targetMs - nowMs > GUESS_VOID_IF_GONE_EARLY_SECONDS * 1000) return { kind: "void" };
  return { kind: "score", arrivedMs: Math.min(targetMs, nowMs) };
}

/* ---------- the database bit ---------- */

export async function createGuess(
  userId: string,
  stationId: string,
  guessMinutes: number
): Promise<Guess> {
  if (!Number.isFinite(guessMinutes) || guessMinutes <= 0 || guessMinutes > GUESS_MAX_LEAD_SECONDS / 60) {
    throw new GameRuleError(`guessMinutes must be between 0 and ${GUESS_MAX_LEAD_SECONDS / 60}`);
  }
  const open = await one(`SELECT id FROM guesses WHERE user_id = $1 AND NOT resolved`, [userId]);
  if (open) throw new GameRuleError("you already have a guess riding on a train");

  const arrivals = await getPredictions(stationId, 20);
  const target = arrivals.find(
    (a) => a.tripId && a.secondsAway >= GUESS_MIN_LEAD_SECONDS && a.secondsAway <= GUESS_MAX_LEAD_SECONDS
  );
  if (!target) throw new GameRuleError("no train far enough out to guess on");

  const [row] = await q<GuessRow>(
    `INSERT INTO guesses (id, user_id, station_id, guess_minutes, target_arrival, trip_id, route)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [randomUUID(), userId, stationId, Math.round(guessMinutes * 100) / 100, target.time, target.tripId, target.route]
  );
  return toGuess(row);
}

/** Read a guess, resolving it if its train has arrived. Safe to poll. */
export async function checkGuess(userId: string, id: string): Promise<Guess | null> {
  const g = await one<GuessRow>(`SELECT * FROM guesses WHERE id = $1 AND user_id = $2`, [id, userId]);
  if (!g) return null;
  if (g.resolved) return toGuess(g);

  const arrivals = await getPredictions(g.station_id, 20);
  const current = arrivals.find((a) => a.tripId === g.trip_id) ?? null;
  const decision = decideGuess(g.target_arrival.getTime(), current, Date.now());

  if (decision.kind === "wait") {
    const [row] = await q<GuessRow>(
      `UPDATE guesses SET target_arrival = $2 WHERE id = $1 RETURNING *`,
      [id, new Date(decision.targetMs)]
    );
    return toGuess(row);
  }

  const actual =
    decision.kind === "score"
      ? Math.max(0, Math.round(((decision.arrivedMs - g.created_at.getTime()) / 60_000) * 100) / 100)
      : null;
  const points = actual === null ? 0 : scoreGuess(Number(g.guess_minutes), actual);

  // "AND NOT resolved" makes this award exactly once, however many polls race.
  const [row] = await q<GuessRow>(
    `UPDATE guesses
        SET resolved = true, actual_minutes = $2, points_earned = $3,
            target_arrival = COALESCE($4, target_arrival)
      WHERE id = $1 AND NOT resolved
      RETURNING *`,
    [id, actual, points, decision.kind === "score" ? new Date(decision.arrivedMs) : null]
  );
  if (!row) return toGuess((await one<GuessRow>(`SELECT * FROM guesses WHERE id = $1`, [id]))!);
  if (points) await q(`UPDATE users SET points = points + $2 WHERE id = $1`, [userId, points]);
  return toGuess(row);
}
