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
} as const;

/** Damage one correct answer does to a boss, instead of solo points. */
export const BOSS_DAMAGE_PER_CORRECT = 10;

/** HP = this times the riders currently checked in on the line. */
export const BOSS_HP_PER_RIDER = 50;
export const BOSS_HP_MIN = 50; // so one person can still win in a demo

/** A line is "behind" at this many seconds late... */
export const BOSS_DELAY_THRESHOLD_SECONDS = 300;
/** ...at this many stops at once. */
export const BOSS_MIN_LAGGING_STOPS = 3;

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
