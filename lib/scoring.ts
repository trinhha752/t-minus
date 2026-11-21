// lib/scoring.ts
// Every number the game balances on, in one file. Tune these ONCE, early.
// Nobody should be editing point values at 3am.

export const POINTS = {
  checkin: 10,
  triviaCorrect: 15,
  cleanRoundBonus: 5,
  guessExact: 50,
  guessPenaltyPerMinute: 10,
  bossDefeatedBonus: 100,
  /** First clear of a station's mini-game each day. Replays score nothing. */
  minigameClear: 25,
  finalBossDefeated: 200,
} as const;

/* ---------- progression ---------- */

/** Final bosses are solo, so fixed HP: about 10 landed hits unbuffed. */
export const FINAL_BOSS_HP = 100;
export const FINAL_BOSS_DAMAGE_PER_HIT = 10;
/** Minimum gap between hits on one fight, so a script cannot spam the endpoint. */
export const FINAL_BOSS_HIT_COOLDOWN_MS = 1_500;

/** What a mini boss gives every rider who fought it. */
export const BUFF_DAMAGE_BONUS = 0.5; // +50% damage
export const BUFF_LIFETIME_HOURS = 24;
/** Buffs stack, but the multiplier never goes above this. */
export const MAX_DAMAGE_MULTIPLIER = 2;

/** Server-side sanity limits on a submitted mini-game run. */
export const MINIGAME_MAX_SCORE = 10_000;
export const MINIGAME_MIN_CLEAR_MS = 3_000;

/** Damage one correct answer does to a boss, instead of solo points. */
export const BOSS_DAMAGE_PER_CORRECT = 10;

/** HP = this times the riders currently checked in on the line. */
export const BOSS_HP_PER_RIDER = 50;
export const BOSS_HP_MIN = 50; // so one person can still win in a demo

/** A train is "late" at this many seconds behind schedule, at its next stop... */
export const BOSS_DELAY_THRESHOLD_SECONDS = 300;
/** ...and a boss spawns when this many distinct trains on one line are late. */
export const BOSS_MIN_LATE_TRAINS = 3;
/** A detected boss escapes after this many clean polls in a row (15s each). */
export const BOSS_CLEAR_POLLS = 2;

/**
 * Rough kg of CO2 saved versus driving the same trip.
 *
 * APPROXIMATE. Pick one figure, show it as an estimate in the UI, and cite
 * wherever you got it. Do not present this as measured.
 */
export const CO2_KG_SAVED_PER_RIDE = 0.9;

/** How many questions a wait of this length is worth. */
export function roundSize(secondsUntilTrain: number, bossActive: boolean): number {
  if (bossActive) return 5;
  if (secondsUntilTrain < 180) return 1;
  if (secondsUntilTrain < 480) return 3;
  return 5;
}

/** Closer guess, more points. Never negative. */
export function scoreGuess(guessMinutes: number, actualMinutes: number): number {
  const off = Math.abs(guessMinutes - actualMinutes);
  return Math.max(0, Math.round(POINTS.guessExact - off * POINTS.guessPenaltyPerMinute));
}

export function bossHpFor(ridersOnLine: number): number {
  return Math.max(BOSS_HP_MIN, ridersOnLine * BOSS_HP_PER_RIDER);
}

/** Level curve. Deliberately gentle: a first-time rider should see level 2. */
export function levelFor(points: number): number {
  return Math.max(1, Math.floor(Math.sqrt(points / 50)) + 1);
}

/**
 * Streak rule: riding today continues it, skipping a whole day breaks it.
 * Pass the dates as YYYY-MM-DD in Boston local time.
 */
export function nextStreak(
  currentStreak: number,
  lastRideDate: string | null,
  todayDate: string
): number {
  if (!lastRideDate) return 1;
  if (lastRideDate === todayDate) return currentStreak;

  const dayBefore = new Date(`${todayDate}T00:00:00Z`);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  const yesterday = dayBefore.toISOString().slice(0, 10);

  return lastRideDate === yesterday ? currentStreak + 1 : 1;
}
