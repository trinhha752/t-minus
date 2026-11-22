// lib/progress.ts
// Progression: stations are levels, each chapter ends in a final boss, and
// buffs from delay (mini) bosses make that final fight easier.
//
// Chapters come from the UI's components/run/stations.ts via lib/chapters.ts.
// Both bosses are trivia fights: answers are checked here, never in the browser.

import { randomUUID } from "node:crypto";
import { q, tx } from "./db";
import { CHAPTERS, chapterById, toMbtaId, type ChapterDef } from "./chapters";
import { answerFor, questionsForStations } from "./trivia";
import {
  BUFF_DAMAGE_BONUS,
  BUFF_LIFETIME_HOURS,
  FINAL_BOSS_ANSWER_COOLDOWN_MS,
  FINAL_BOSS_DEMO_HP,
  FINAL_BOSS_HP,
  MAX_DAMAGE_MULTIPLIER,
  MINIGAME_MAX_SCORE,
  MINIGAME_MIN_CLEAR_MS,
  POINTS,
  comboDamage,
} from "./scoring";
import type {
  Buff,
  Chapter,
  FinalBossAnswerResult,
  FinalBossFight,
  MiniGameResult,
  MiniGameResultRequest,
  Progress,
  TeamLine,
  TriviaQuestion,
} from "../types";

export { CHAPTERS };

/** How many questions a final boss fight draws. The UI cycles through them. */
const FIGHT_QUESTIONS = 20;

/** A rule broken by the request, as opposed to a server fault. Routes send these as 400s. */
export class GameRuleError extends Error {}

/** Boston local date, so "once a day" means a Boston day. */
const BOSTON_DAY = `(created_at AT TIME ZONE 'America/New_York')::date`;

/* ---------- mini-game results ---------- */

export async function recordMiniGame(
  userId: string,
  body: MiniGameResultRequest
): Promise<MiniGameResult> {
  const stationId = toMbtaId(String(body.stationId ?? ""));
  const entry = stationId
    ? CHAPTERS.flatMap((c) => c.stations).find((s) => s.stationId === stationId)
    : undefined;
  if (!stationId || !entry) throw new GameRuleError("unknown station");
  // gameId is optional; if sent it must be this station's game.
  if (body.gameId !== undefined && body.gameId !== entry.gameId) {
    throw new GameRuleError(`that game is not played here (this station plays "${entry.gameId}")`);
  }

  // You have to be there: a run only counts at a station you checked in at today.
  const [here] = await q(
    `SELECT 1 FROM checkins
      WHERE user_id = $1 AND station_id = $2 AND ${BOSTON_DAY} = (now() AT TIME ZONE 'America/New_York')::date
      LIMIT 1`,
    [userId, stationId]
  );
  if (!here) throw new GameRuleError("check in at this station first");

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
    [userId, stationId]
  );

  const pointsEarned = cleared && !prior?.today ? POINTS.minigameClear : 0;
  const runId = randomUUID();

  await q(
    `INSERT INTO minigame_runs
       (id, user_id, station_id, game_id, score, cleared, duration_ms, points_earned)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [runId, userId, stationId, entry.gameId, score, cleared, durationMs, pointsEarned]
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
        slug: s.slug,
        name: s.name,
        gameId: s.gameId,
        title: s.title,
        genre: s.genre,
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

/* ---------- final boss: a solo trivia fight ---------- */

interface FightRow {
  id: string;
  user_id: string;
  chapter_id: string;
  hp_total: number;
  hp_remaining: number;
  damage_multiplier: string;
  combo: number;
  defeated: boolean;
  started_at: Date;
  last_hit_at: Date | null;
  ended_at: Date | null;
}

function toFight(r: FightRow, questions: TriviaQuestion[]): FinalBossFight {
  return {
    id: String(r.id),
    chapterId: r.chapter_id,
    bossName: chapterById(r.chapter_id)?.bossName ?? "The Boss",
    hpTotal: r.hp_total,
    hpRemaining: r.hp_remaining,
    damageMultiplier: Number(r.damage_multiplier),
    combo: r.combo,
    defeated: r.defeated,
    startedAt: r.started_at.toISOString(),
    endedAt: r.ended_at?.toISOString() ?? null,
    questions,
  };
}

const chapterStationIds = (c: ChapterDef) => [...new Set(c.stations.map((s) => s.stationId))];

/**
 * Start (or resume) this rider's fight with a chapter's final boss.
 * Spends every active buff on it: each adds BUFF_DAMAGE_BONUS to the damage
 * multiplier, capped at MAX_DAMAGE_MULTIPLIER. demo=true gives 300 HP, not 1000.
 */
export async function startFinalBoss(
  userId: string,
  chapterId: string,
  demo = false
): Promise<FinalBossFight> {
  const chapter = chapterById(chapterId);
  if (!chapter) throw new GameRuleError("unknown chapter");

  const status = await chapterStatus(userId);
  if (!status.get(chapterId)?.unlocked) {
    throw new GameRuleError("clear every station in this chapter first");
  }

  const questions = await questionsForStations(chapterStationIds(chapter), FIGHT_QUESTIONS);
  if (!questions.length) throw new GameRuleError("no verified questions for this chapter yet");

  return tx(async (c) => {
    const open = await c.query<FightRow>(
      `SELECT * FROM final_boss_fights
        WHERE user_id = $1 AND chapter_id = $2 AND ended_at IS NULL`,
      [userId, chapterId]
    );
    if (open.rows[0]) return toFight(open.rows[0], questions);

    const buffs = await c.query<{ id: string; value: string }>(
      `SELECT id, value FROM buffs
        WHERE user_id = $1 AND used_in_fight_id IS NULL AND expires_at > now()
        FOR UPDATE`,
      [userId]
    );
    const bonus = buffs.rows.reduce((sum, b) => sum + Number(b.value), 0);
    const multiplier = Math.min(MAX_DAMAGE_MULTIPLIER, 1 + bonus);
    const hp = demo ? FINAL_BOSS_DEMO_HP : FINAL_BOSS_HP;

    const fight = await c.query<FightRow>(
      `INSERT INTO final_boss_fights (user_id, chapter_id, hp_total, hp_remaining, damage_multiplier)
       VALUES ($1, $2, $3, $3, $4) RETURNING *`,
      [userId, chapterId, hp, multiplier]
    );
    if (buffs.rows.length) {
      await c.query(`UPDATE buffs SET used_in_fight_id = $1 WHERE id = ANY($2)`, [
        fight.rows[0].id,
        buffs.rows.map((b) => b.id),
      ]);
    }
    return toFight(fight.rows[0], questions);
  });
}

/**
 * One answer in a final boss fight. Right: damage with combo and buffs.
 * Wrong: combo resets (hearts are tracked by the UI). Locked so a double-tap
 * cannot land two killing blows, and rate-limited per fight.
 */
export async function answerFinalBoss(
  userId: string,
  fightId: string,
  questionId: string,
  choiceIndex: number
): Promise<FinalBossAnswerResult> {
  const question = await answerFor(questionId);
  if (!question) throw new GameRuleError("unknown question");

  return tx(async (c) => {
    const { rows } = await c.query<FightRow>(
      `SELECT * FROM final_boss_fights WHERE id = $1 FOR UPDATE`,
      [fightId]
    );
    const fight = rows[0];
    if (!fight || fight.user_id !== userId) throw new GameRuleError("unknown fight");
    if (fight.ended_at) throw new GameRuleError("this fight is over");
    if (fight.last_hit_at && Date.now() - fight.last_hit_at.getTime() < FINAL_BOSS_ANSWER_COOLDOWN_MS) {
      throw new GameRuleError("too fast");
    }
    const chapter = chapterById(fight.chapter_id);
    if (!chapter || !chapterStationIds(chapter).includes(question.station_id)) {
      throw new GameRuleError("that question is not part of this fight");
    }

    const correct = choiceIndex === question.answer_index;
    const damage = correct
      ? Math.min(fight.hp_remaining, comboDamage(fight.combo, Number(fight.damage_multiplier)))
      : 0;
    const combo = correct ? fight.combo + 1 : 0;
    const hpRemaining = fight.hp_remaining - damage;
    const defeated = hpRemaining <= 0;

    await c.query(
      `UPDATE final_boss_fights
          SET hp_remaining = $2, combo = $3, last_hit_at = now(), defeated = $4,
              ended_at = CASE WHEN $4 THEN now() ELSE NULL END
        WHERE id = $1`,
      [fight.id, hpRemaining, combo, defeated]
    );

    let pointsEarned = 0;
    if (defeated) {
      pointsEarned = POINTS.finalBossDefeated;
      await c.query(`UPDATE users SET points = points + $2 WHERE id = $1`, [userId, pointsEarned]);
      await c.query(
        `INSERT INTO badges (user_id, type, label) VALUES ($1, 'boss', $2)
         ON CONFLICT DO NOTHING`,
        [userId, `Defeated ${chapter.bossName}`]
      );
    }

    return {
      correct,
      correctIndex: question.answer_index,
      explanation: question.explanation,
      damage,
      combo,
      hpRemaining,
      defeated,
      pointsEarned,
    };
  });
}

/** Out of hearts, or walked away. Ends the fight without a win; the next start is a fresh boss. */
export async function forfeitFinalBoss(userId: string, fightId: string): Promise<FinalBossFight> {
  const [row] = await q<FightRow>(
    `UPDATE final_boss_fights SET ended_at = now()
      WHERE id = $1 AND user_id = $2 AND ended_at IS NULL
      RETURNING *`,
    [fightId, userId]
  );
  if (!row) throw new GameRuleError("no open fight with that id");
  return toFight(row, []);
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
