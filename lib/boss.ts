// lib/boss.ts
// Delay Boss: spawn, damage, defeat.
//
// The detector is a pure function over delay samples, so you can unit-test it
// with made-up numbers instead of waiting for the Green Line to break.

import { q, tx } from "./db";
import {
  BOSS_DAMAGE_PER_CORRECT,
  BOSS_DELAY_THRESHOLD_SECONDS,
  BOSS_MIN_LAGGING_STOPS,
  bossHpFor,
} from "./scoring";
import type { BossState, RouteId, TeamLine } from "../types";
import { ALL_TEAMS, routeToTeam } from "../types";

export interface DelaySample {
  route: RouteId;
  stopId: string;
  delaySeconds: number;
}

/* ---------- the pure bit ---------- */

export interface LineVerdict {
  line: TeamLine;
  shouldBeActive: boolean;
  avgDelaySeconds: number;
  laggingStops: number;
}

/**
 * Decide, per line, whether a boss should be up right now.
 * A line qualifies when enough distinct stops are far enough behind.
 */
export function evaluateLines(samples: DelaySample[]): LineVerdict[] {
  const byLine = new Map<TeamLine, DelaySample[]>();
  for (const team of ALL_TEAMS) byLine.set(team, []);
  for (const s of samples) byLine.get(routeToTeam(s.route))!.push(s);

  return ALL_TEAMS.map((line) => {
    const rows = byLine.get(line)!;
    if (rows.length === 0) {
      return { line, shouldBeActive: false, avgDelaySeconds: 0, laggingStops: 0 };
    }

    const lagging = new Set(
      rows
        .filter((r) => r.delaySeconds >= BOSS_DELAY_THRESHOLD_SECONDS)
        .map((r) => r.stopId)
    );

    const avg = Math.round(
      rows.reduce((sum, r) => sum + r.delaySeconds, 0) / rows.length
    );

    return {
      line,
      shouldBeActive: lagging.size >= BOSS_MIN_LAGGING_STOPS,
      avgDelaySeconds: avg,
      laggingStops: lagging.size,
    };
  });
}

/* ---------- the database bit ---------- */

/** Riders checked in on this line in the last 30 minutes. Sets boss HP. */
async function activeRidersOn(line: TeamLine): Promise<number> {
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
 * Spawn bosses that should exist, retire ones that should not.
 * Call this from the poller, not from a request handler.
 */
export async function reconcileBosses(samples: DelaySample[]): Promise<void> {
  for (const v of evaluateLines(samples)) {
    const live = await q<{ id: number }>(
      `SELECT id FROM boss_events WHERE line = $1 AND ended_at IS NULL`,
      [v.line]
    );

    if (v.shouldBeActive && live.length === 0) {
      const hp = bossHpFor(await activeRidersOn(v.line));
      await q(
        `INSERT INTO boss_events (line, hp_total, hp_remaining)
         VALUES ($1, $2, $2)
         ON CONFLICT DO NOTHING`,
        [v.line, hp]
      );
    }

    if (!v.shouldBeActive && live.length > 0) {
      // Delay cleared and the bar was never drained: the boss escapes.
      await q(`UPDATE boss_events SET ended_at = now() WHERE id = $1`, [live[0].id]);
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

  const avgByLine = new Map<TeamLine, number>();
  for (const d of delays) {
    const line = routeToTeam(d.route as RouteId);
    avgByLine.set(line, Math.round(Number(d.avg_delay_seconds)));
  }

  return ALL_TEAMS.map((line) => {
    const b = live.get(line);
    return {
      line,
      active: !!b,
      avgDelaySeconds: avgByLine.get(line) ?? 0,
      laggingStops: 0, // filled by the poller's verdict if you want it live
      hpTotal: b?.hp_total ?? 0,
      hpRemaining: b?.hp_remaining ?? 0,
      startedAt: b ? b.started_at.toISOString() : null,
      defeated: b?.defeated ?? false,
    };
  });
}
