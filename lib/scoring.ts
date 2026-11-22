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

/* ---------- arrival guess ---------- */

/** The train you guess on must be at least this far out: no guessing a train you can see. */
export const GUESS_MIN_LEAD_SECONDS = 90;
/** ...and no further out than this. */
export const GUESS_MAX_LEAD_SECONDS = 30 * 60;
/** A guess whose train vanished from predictions this long before its time is void (cancelled). */
export const GUESS_VOID_IF_GONE_EARLY_SECONDS = 120;

/* ---------- progression ---------- */

// Fight numbers match components/run/stats.ts (the UI's balance file).

/** Damage per correct answer, before the combo multiplier. stats.ts PLAYER.damage */
export const ANSWER_DAMAGE = 20;
/** Correct answers in a row multiply damage, up to this. stats.ts PLAYER.maxCombo */
export const MAX_COMBO = 3;

/** Damage for the next correct answer, given how many were right in a row before it. */
export function comboDamage(combo: number, multiplier = 1): number {
  return Math.round(ANSWER_DAMAGE * Math.min(combo + 1, MAX_COMBO) * multiplier);
}

/** Final bosses are solo. stats.ts END_BOSS.hp / demoHp */
export const FINAL_BOSS_HP = 1_000;
export const FINAL_BOSS_DEMO_HP = 300;
/** Minimum gap between answers in one fight, so a script cannot spam the endpoint. */
export const FINAL_BOSS_ANSWER_COOLDOWN_MS = 1_500;

/** What a mini boss gives every rider who fought it. */
export const BUFF_DAMAGE_BONUS = 0.1; // +10% damage: the Signal Shard, stats.ts LOADOUT.shardBonus
export const BUFF_LIFETIME_HOURS = 24;
/** Buffs stack, but the multiplier never goes above this. */
export const MAX_DAMAGE_MULTIPLIER = 2;

/** Server-side sanity limits on a submitted mini-game run. */
export const MINIGAME_MAX_SCORE = 10_000;
export const MINIGAME_MIN_CLEAR_MS = 3_000;

/** Damage one correct answer does to a boss, instead of solo points. */

/** HP = this times the riders currently checked in on the line. */
export const BOSS_HP_PER_RIDER = 200;
export const BOSS_HP_MIN = 200; // stats.ts MINI_BOSS.hp: one rider can win it solo

/** A train is "late" at this many seconds behind schedule, at its next stop... */
export const BOSS_DELAY_THRESHOLD_SECONDS = 300;
/** ...a boss needs at least this many distinct late trains, so a 4-train Red Line can't spawn on 2... */
export const BOSS_MIN_LATE_TRAINS = 3;
/**
 * ...and spawns when at least this share of the line's trains are late.
 * Tuned on 313 real polls (21 Nov 2026): a fixed count of 3 kept Orange and
 * Green up 100% of the time, because a big line always has 3 late trains.
 */
export const BOSS_SPAWN_LATE_SHARE = 0.5;
/**
 * Once up, the boss holds until the share drops below this (hysteresis).
 * One threshold for both made Green flicker on and off 9 times in 78 minutes.
 */
export const BOSS_CLEAR_LATE_SHARE = 0.3;
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
