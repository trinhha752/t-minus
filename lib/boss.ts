// lib/boss.ts
// Delay Boss: spawn, damage, defeat.
//
// The detector is a pure function over delay samples, so you can unit-test it
// with made-up numbers instead of waiting for the Green Line to break.

import { q, tx } from "./db";
import {
  BOSS_CLEAR_POLLS,
  BOSS_DAMAGE_PER_CORRECT,
  BOSS_DELAY_THRESHOLD_SECONDS,
  BOSS_MIN_LATE_TRAINS,
  bossHpFor,
} from "./scoring";
import { GRANT_BUFFS_SQL } from "./progress";
import type { BossState, RouteId, TeamLine } from "../types";
import { ALL_TEAMS, routeToTeam } from "../types";

/** One prediction as the poller saw it. Every one of these is stored raw. */
export interface DelaySample {
  route: RouteId;
  tripId: string;
  stopId: string;
  /** Predicted time at this stop, ms since epoch. */
  predictedMs: number;
  delaySeconds: number;
}

/* ---------- the pure bit ---------- */

export interface LineVerdict {
  line: TeamLine;
  shouldBeActive: boolean;
  /** Distinct trains at least BOSS_DELAY_THRESHOLD_SECONDS late. */
  lateTrains: number;
  /** Distinct trains with a schedule to compare against. */
  trainsSampled: number;
  /** Worst per-train delay, clamped at 0. */
  worstDelaySeconds: number;
  delayAlert: boolean;
}

/**
 * Decide, per line, whether a boss should be up right now.
 *
 * Why count trains, not stops: a prediction exists for every stop a trip has
 * left to make, so one train 6 minutes late shows up as 12 "late stops" on
 * the Blue Line. Counting stops spawned bosses on three lines at once on the
 * first live run, with no delay alert anywhere. So each trip contributes one
 * sample: its NEXT stop (earliest predicted time), which is its most current
 * delay.
 *
 * Negative delays are clamped to 0. Green-E reads ~7 minutes "early" on
 * average; that is schedule-matching noise, not a train running ahead, and
 * it must never cancel out a real delay.
 *
 * An official MBTA delay alert on any of a line's routes also qualifies.
 */
export function evaluateLines(
  samples: DelaySample[],
  alertRoutes: Set<RouteId> = new Set()
): LineVerdict[] {
  // Next stop per trip.
  const nextStop = new Map<string, DelaySample>();
  for (const s of samples) {
    const seen = nextStop.get(s.tripId);
    if (!seen || s.predictedMs < seen.predictedMs) nextStop.set(s.tripId, s);
  }

  return ALL_TEAMS.map((line) => {
    const trains = [...nextStop.values()].filter((s) => routeToTeam(s.route) === line);
    const delays = trains.map((t) => Math.max(0, t.delaySeconds));
    const lateTrains = delays.filter((d) => d >= BOSS_DELAY_THRESHOLD_SECONDS).length;
    const delayAlert = [...alertRoutes].some((r) => routeToTeam(r) === line);

    return {
      line,
      shouldBeActive: lateTrains >= BOSS_MIN_LATE_TRAINS || delayAlert,
      lateTrains,
      trainsSampled: trains.length,
      worstDelaySeconds: delays.length ? Math.max(...delays) : 0,
      delayAlert,
    };
  });
}

/* ---------- the database bit ---------- */

/** Riders checked in on this line in the last 30 minutes. Sets boss HP. */
export async function activeRidersOn(line: TeamLine): Promise<number> {
  const rows = await q<{ n: string }>(
    `SELECT COUNT(DISTINCT c.user_id) AS n
       FROM checkins c
       JOIN stations s ON s.id = c.station_id
      WHERE c.created_at > now() - INTERVAL '30 minutes'
        AND EXISTS (
          SELECT 1 FROM unnest(s.routes) r
           WHERE CASE WHEN r LIKE 'Green%' THEN 'Green' ELSE r END = $1
        )`,
    [line]
  );
  return Number(rows[0]?.n ?? 0);
}

/**
 * Record each line's numbers, spawn bosses that should exist, and retire
 * detected bosses once their line has been clean for BOSS_CLEAR_POLLS polls.
 * Manual bosses (scripts/fake-boss.ts) are never retired here.
 * Call this from the poller, not from a request handler.
 */
export async function reconcileBosses(verdicts: LineVerdict[]): Promise<void> {
  for (const v of verdicts) {
    const [status] = await q<{ clean_polls: number }>(
      `INSERT INTO line_status
         (line, late_trains, trains_sampled, worst_delay_seconds, delay_alert, clean_polls, updated_at)
       VALUES ($1, $2, $3, $4, $5, CASE WHEN $6 THEN 0 ELSE 1 END, now())
       ON CONFLICT (line) DO UPDATE SET
         late_trains = EXCLUDED.late_trains,
         trains_sampled = EXCLUDED.trains_sampled,
         worst_delay_seconds = EXCLUDED.worst_delay_seconds,
         delay_alert = EXCLUDED.delay_alert,
         clean_polls = CASE WHEN $6 THEN 0 ELSE line_status.clean_polls + 1 END,
         updated_at = now()
       RETURNING clean_polls`,
      [v.line, v.lateTrains, v.trainsSampled, v.worstDelaySeconds, v.delayAlert, v.shouldBeActive]
    );

    const live = await q<{ id: number; source: string }>(
      `SELECT id, source FROM boss_events WHERE line = $1 AND ended_at IS NULL`,
      [v.line]
    );

    if (v.shouldBeActive && live.length === 0) {
      const hp = bossHpFor(await activeRidersOn(v.line));
      await q(
        `INSERT INTO boss_events (line, hp_total, hp_remaining, source)
         VALUES ($1, $2, $2, 'detected')
         ON CONFLICT DO NOTHING`,
        [v.line, hp]
      );
      console.log(`[boss] ${v.line} boss spawned: ${v.lateTrains} late trains, alert=${v.delayAlert}`);
    }

    const boss = live[0];
    if (boss?.source === "detected" && status.clean_polls >= BOSS_CLEAR_POLLS) {
      // Delay cleared and the bar was never drained: the boss escapes.
      await q(`UPDATE boss_events SET ended_at = now() WHERE id = $1`, [boss.id]);
      console.log(`[boss] ${v.line} boss escaped: line clean for ${status.clean_polls} polls`);
    }
  }
}

/**
 * Apply one correct answer to a line's boss.
 * Runs in a transaction with a row lock so two riders answering at the same
 * instant cannot take the bar below zero or both land the killing blow.
 */
export async function damageBoss(
  line: TeamLine,
  userId: string
): Promise<{ damage: number; hpRemaining: number | null; defeated: boolean }> {
  return tx(async (c) => {
    const { rows } = await c.query<{ id: number; hp_remaining: number }>(
      `SELECT id, hp_remaining FROM boss_events
        WHERE line = $1 AND ended_at IS NULL
        FOR UPDATE`,
      [line]
    );
    if (rows.length === 0) return { damage: 0, hpRemaining: null, defeated: false };

    const boss = rows[0];
    const damage = Math.min(BOSS_DAMAGE_PER_CORRECT, boss.hp_remaining);
    const hpRemaining = boss.hp_remaining - damage;
    const defeated = hpRemaining <= 0;

    await c.query(
      `UPDATE boss_events
          SET hp_remaining = $2,
              defeated = $3,
              ended_at = CASE WHEN $3 THEN now() ELSE ended_at END
        WHERE id = $1`,
      [boss.id, hpRemaining, defeated]
    );

    if (defeated) {
      // Everyone who fought gets the badge, not just whoever landed the hit.
      await c.query(
        `INSERT INTO badges (user_id, type, label)
         SELECT DISTINCT ta.user_id, 'boss', $2
           FROM trivia_answers ta
          WHERE ta.boss_event_id = $1
         ON CONFLICT DO NOTHING`,
        [boss.id, `Beat the ${line} Line boss`]
      );
      // ...and a damage buff for their next final boss fight.
      await c.query(GRANT_BUFFS_SQL, [boss.id]);
    }

    void userId; // the caller records the answer row itself
    return { damage, hpRemaining, defeated };
  });
}

/** Current state of every line, for GET /api/boss. */
export async function readBossStates(): Promise<BossState[]> {
  const rows = await q<{
    line: TeamLine;
    hp_total: number;
    hp_remaining: number;
    started_at: Date;
    defeated: boolean;
  }>(
    `SELECT line, hp_total, hp_remaining, started_at, defeated
       FROM boss_events WHERE ended_at IS NULL`
  );

  const live = new Map(rows.map((r) => [r.line, r]));

  const delays = await q<{ route: string; avg_delay_seconds: string }>(
    `SELECT route, AVG(avg_delay_seconds) AS avg_delay_seconds
       FROM delay_5m
      WHERE bucket > now() - INTERVAL '15 minutes'
      GROUP BY route`
  );

  const status = await q<{ line: TeamLine; late_trains: number }>(
    `SELECT line, late_trains FROM line_status`
  );
  const lateByLine = new Map(status.map((r) => [r.line, r.late_trains]));

  // Green has four branches: average them, rather than keeping whichever came last.
  const byLine = new Map<TeamLine, number[]>();
  for (const d of delays) {
    const line = routeToTeam(d.route as RouteId);
    byLine.set(line, [...(byLine.get(line) ?? []), Number(d.avg_delay_seconds)]);
  }
  const avgByLine = new Map<TeamLine, number>();
  for (const [line, xs] of byLine) {
    avgByLine.set(line, Math.round(xs.reduce((a, b) => a + b, 0) / xs.length));
  }

  return ALL_TEAMS.map((line) => {
    const b = live.get(line);
    return {
      line,
      active: !!b,
      // Clamped at 0 for display: negative means schedule-matching noise.
      avgDelaySeconds: Math.max(0, avgByLine.get(line) ?? 0),
      lateTrains: lateByLine.get(line) ?? 0,
      hpTotal: b?.hp_total ?? 0,
      hpRemaining: b?.hp_remaining ?? 0,
      startedAt: b ? b.started_at.toISOString() : null,
      defeated: b?.defeated ?? false,
    };
  });
}
