// lib/progress.ts
// Progression: stations are levels, each chapter ends in a final boss, and
// buffs from delay (mini) bosses make that final fight easier.
//
// Chapters are data, in data/chapters.json: add or reorder stations there,
// no code change needed. Every station id in it must exist in `stations`.

import { randomUUID } from "node:crypto";
import chaptersJson from "../data/chapters.json";
import { one, q, tx } from "./db";
import {
  BUFF_DAMAGE_BONUS,
  BUFF_LIFETIME_HOURS,
  FINAL_BOSS_DAMAGE_PER_HIT,
  FINAL_BOSS_HIT_COOLDOWN_MS,
  FINAL_BOSS_HP,
  MAX_DAMAGE_MULTIPLIER,
  MINIGAME_MAX_SCORE,
  MINIGAME_MIN_CLEAR_MS,
  POINTS,
} from "./scoring";
import type {
  Buff,
  Chapter,
  FinalBossFight,
  FinalBossHitResult,
  GameEngine,
  MiniGameResult,
  MiniGameResultRequest,
  Progress,
  TeamLine,
} from "../types";

interface ChapterDef {
  id: string;
  name: string;
  line: TeamLine;
  bossStationId: string;
  bossName: string;
  stations: { stationId: string; gameId: string; engine: GameEngine }[];
}

export const CHAPTERS = chaptersJson as ChapterDef[];

/** A rule broken by the request, as opposed to a server fault. Routes send these as 400s. */
export class GameRuleError extends Error {}

const chapterById = (id: string) => CHAPTERS.find((c) => c.id === id) ?? null;

/** Boston local date, so "once a day" means a Boston day. */
const BOSTON_DAY = `(created_at AT TIME ZONE 'America/New_York')::date`;

/* ---------- mini-game results ---------- */

export async function recordMiniGame(
  userId: string,
  body: MiniGameResultRequest
): Promise<MiniGameResult> {
  const station = await one<{ id: string }>(`SELECT id FROM stations WHERE id = $1`, [
    body.stationId,
  ]);
  if (!station) throw new GameRuleError("unknown station");

  // The game must be the one this station runs in some chapter, or it does not count.
  const inChapter = CHAPTERS.some((c) =>
    c.stations.some((s) => s.stationId === body.stationId && s.gameId === body.gameId)
  );
  if (!inChapter) throw new GameRuleError("that game is not played at this station");

  const score = Math.max(0, Math.min(MINIGAME_MAX_SCORE, Math.round(Number(body.score) || 0)));
  const durationMs = Math.max(0, Math.round(Number(body.durationMs) || 0));
  if (body.cleared && durationMs < MINIGAME_MIN_CLEAR_MS) {
    throw new GameRuleError("a cleared run that short is not believable");
  }
  const cleared = body.cleared === true;

  const before = await chapterStatus(userId);

  const [prior] = await q<{ ever: boolean; today: boolean }>(
    `SELECT bool_or(cleared) AS ever,
            bool_or(cleared AND ${BOSTON_DAY} = (now() AT TIME ZONE 'America/New_York')::date) AS today
       FROM minigame_runs WHERE user_id = $1 AND station_id = $2`,
    [userId, body.stationId]
  );

  const pointsEarned = cleared && !prior?.today ? POINTS.minigameClear : 0;
  const runId = randomUUID();

  await q(
    `INSERT INTO minigame_runs
       (id, user_id, station_id, game_id, score, cleared, duration_ms, points_earned)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [runId, userId, body.stationId, body.gameId, score, cleared, durationMs, pointsEarned]
  );
  if (pointsEarned) {
    await q(`UPDATE users SET points = points + $2 WHERE id = $1`, [userId, pointsEarned]);
  }

  const after = await chapterStatus(userId);
  const unlocked = CHAPTERS.find((c) => after.get(c.id)?.unlocked && !before.get(c.id)?.unlocked);

  return {
    runId,
    pointsEarned,
    stationCleared: cleared && !prior?.ever,
    chapterBossUnlocked: unlocked?.id ?? null,
  };
}

/* ---------- progress ---------- */

/** Which stations this rider has cleared, with their best score. */
async function clearedStations(userId: string): Promise<Map<string, number>> {
  const rows = await q<{ station_id: string; best: number }>(
    `SELECT station_id, max(score) AS best FROM minigame_runs
      WHERE user_id = $1 AND cleared GROUP BY station_id`,
    [userId]
  );
  return new Map(rows.map((r) => [r.station_id, Number(r.best)]));
}

async function chapterStatus(userId: string): Promise<Map<string, { unlocked: boolean }>> {
  const cleared = await clearedStations(userId);
  return new Map(
    CHAPTERS.map((c) => [c.id, { unlocked: c.stations.every((s) => cleared.has(s.stationId)) }])
  );
}

/** Unspent, unexpired buffs. */
async function activeBuffs(userId: string): Promise<Buff[]> {
  const rows = await q<{
    id: string;
    type: "boss_damage";
    value: string;
    granted_at: Date;
    expires_at: Date;
    line: TeamLine | null;
  }>(
    `SELECT b.id, b.type, b.value, b.granted_at, b.expires_at, e.line
       FROM buffs b LEFT JOIN boss_events e ON e.id = b.source_boss_event_id
      WHERE b.user_id = $1 AND b.used_in_fight_id IS NULL AND b.expires_at > now()
      ORDER BY b.granted_at`,
    [userId]
  );
  return rows.map((r) => ({
    id: String(r.id),
    type: r.type,
    value: Number(r.value),
    grantedAt: r.granted_at.toISOString(),
    expiresAt: r.expires_at.toISOString(),
    fromLine: r.line,
  }));
}

export async function getProgress(userId: string): Promise<Progress> {
  const cleared = await clearedStations(userId);

  const ids = [...new Set(CHAPTERS.flatMap((c) => c.stations.map((s) => s.stationId)))];
  const names = new Map(
    (await q<{ id: string; name: string }>(`SELECT id, name FROM stations WHERE id = ANY($1)`, [
      ids,
    ])).map((r) => [r.id, r.name])
  );

  const fights = await q<{ id: string; chapter_id: string; defeated: boolean; ended_at: Date | null }>(
    `SELECT id, chapter_id, defeated, ended_at FROM final_boss_fights WHERE user_id = $1`,
    [userId]
  );

  const chapters: Chapter[] = CHAPTERS.map((c) => {
    const mine = fights.filter((f) => f.chapter_id === c.id);
    return {
      id: c.id,
      name: c.name,
      line: c.line,
      bossStationId: c.bossStationId,
      bossName: c.bossName,
      stations: c.stations.map((s) => ({
        stationId: s.stationId,
        name: names.get(s.stationId) ?? s.stationId,
        gameId: s.gameId,
        engine: s.engine,
        cleared: cleared.has(s.stationId),
        bestScore: cleared.get(s.stationId) ?? null,
      })),
      bossUnlocked: c.stations.every((s) => cleared.has(s.stationId)),
      bossDefeated: mine.some((f) => f.defeated),
      activeFightId: mine.find((f) => !f.ended_at)?.id.toString() ?? null,
    };
  });

  return { chapters, buffs: await activeBuffs(userId) };
}

/* ---------- final boss ---------- */

interface FightRow {
  id: string;
  chapter_id: string;
  hp_total: number;
  hp_remaining: number;
  damage_multiplier: string;
  defeated: boolean;
  started_at: Date;
  ended_at: Date | null;
}

function toFight(r: FightRow): FinalBossFight {
  return {
    id: String(r.id),
    chapterId: r.chapter_id,
    bossName: chapterById(r.chapter_id)?.bossName ?? "The Boss",
    hpTotal: r.hp_total,
    hpRemaining: r.hp_remaining,
    damageMultiplier: Number(r.damage_multiplier),
    defeated: r.defeated,
    startedAt: r.started_at.toISOString(),
    endedAt: r.ended_at?.toISOString() ?? null,
  };
}

/**
 * Start (or resume) this rider's fight with a chapter's final boss.
 * Spends every active buff on it: each adds BUFF_DAMAGE_BONUS to the damage
 * multiplier, capped at MAX_DAMAGE_MULTIPLIER.
 */
export async function startFinalBoss(userId: string, chapterId: string): Promise<FinalBossFight> {
  const chapter = chapterById(chapterId);
  if (!chapter) throw new GameRuleError("unknown chapter");

  const status = await chapterStatus(userId);
  if (!status.get(chapterId)?.unlocked) {
    throw new GameRuleError("clear every station in this chapter first");
  }

  return tx(async (c) => {
    const open = await c.query<FightRow>(
      `SELECT * FROM final_boss_fights
        WHERE user_id = $1 AND chapter_id = $2 AND ended_at IS NULL`,
      [userId, chapterId]
    );
    if (open.rows[0]) return toFight(open.rows[0]);

    const buffs = await c.query<{ id: string; value: string }>(
      `SELECT id, value FROM buffs
        WHERE user_id = $1 AND used_in_fight_id IS NULL AND expires_at > now()
        FOR UPDATE`,
      [userId]
    );
    const bonus = buffs.rows.reduce((sum, b) => sum + Number(b.value), 0);
    const multiplier = Math.min(MAX_DAMAGE_MULTIPLIER, 1 + bonus);

    const fight = await c.query<FightRow>(
      `INSERT INTO final_boss_fights (user_id, chapter_id, hp_total, hp_remaining, damage_multiplier)
       VALUES ($1, $2, $3, $3, $4) RETURNING *`,
      [userId, chapterId, FINAL_BOSS_HP, multiplier]
    );
    if (buffs.rows.length) {
      await c.query(`UPDATE buffs SET used_in_fight_id = $1 WHERE id = ANY($2)`, [
        fight.rows[0].id,
        buffs.rows.map((b) => b.id),
      ]);
    }
    return toFight(fight.rows[0]);
  });
}

/**
 * One landed attack on a final boss. Locked so a double-tap cannot land
 * two killing blows, and rate-limited per fight.
 */
export async function hitFinalBoss(userId: string, fightId: string): Promise<FinalBossHitResult> {
  return tx(async (c) => {
    const { rows } = await c.query<FightRow & { user_id: string; last_hit_at: Date | null }>(
      `SELECT * FROM final_boss_fights WHERE id = $1 FOR UPDATE`,
      [fightId]
    );
    const fight = rows[0];
    if (!fight || fight.user_id !== userId) throw new GameRuleError("unknown fight");
    if (fight.ended_at) throw new GameRuleError("this fight is over");
    if (fight.last_hit_at && Date.now() - fight.last_hit_at.getTime() < FINAL_BOSS_HIT_COOLDOWN_MS) {
      throw new GameRuleError("too fast");
    }

    const damage = Math.min(
      fight.hp_remaining,
      Math.round(FINAL_BOSS_DAMAGE_PER_HIT * Number(fight.damage_multiplier))
    );
    const hpRemaining = fight.hp_remaining - damage;
    const defeated = hpRemaining <= 0;

    await c.query(
      `UPDATE final_boss_fights
          SET hp_remaining = $2, last_hit_at = now(), defeated = $3,
              ended_at = CASE WHEN $3 THEN now() ELSE NULL END
        WHERE id = $1`,
      [fight.id, hpRemaining, defeated]
    );

    let pointsEarned = 0;
    if (defeated) {
      pointsEarned = POINTS.finalBossDefeated;
      await c.query(`UPDATE users SET points = points + $2 WHERE id = $1`, [userId, pointsEarned]);
      await c.query(
        `INSERT INTO badges (user_id, type, label) VALUES ($1, 'boss', $2)
         ON CONFLICT DO NOTHING`,
        [userId, `Defeated ${chapterById(fight.chapter_id)?.bossName ?? "the boss"}`]
      );
    }

    return { damage, hpRemaining, defeated, pointsEarned };
  });
}

/* ---------- buffs, granted from lib/boss.ts ---------- */

/** SQL that gives every fighter of a defeated mini boss a damage buff. Run inside its transaction. */
export const GRANT_BUFFS_SQL = `
  INSERT INTO buffs (user_id, type, value, source_boss_event_id, expires_at)
  SELECT DISTINCT ta.user_id, 'boss_damage', ${BUFF_DAMAGE_BONUS}, $1::bigint,
         now() + INTERVAL '${BUFF_LIFETIME_HOURS} hours'
    FROM trivia_answers ta
   WHERE ta.boss_event_id = $1
  ON CONFLICT DO NOTHING`;
