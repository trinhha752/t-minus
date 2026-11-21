// Owner: Backend. Starting values from the spec — tune once, early.

export const POINTS = {
  checkin: 10, // once per station per day
  triviaCorrect: 15,
  cleanRoundBonus: 5,
  guessExact: 50,
  guessPenaltyPerMinute: 10,
  bossDefeated: 100, // to every rider on the line
} as const;

export const BOSS = {
  damagePerCorrect: 10,
  hpPerRider: 50,
  minHp: 50,
  delayThresholdSeconds: 5 * 60, // 5+ minutes behind schedule...
  minDelayedStations: 3, // ...at 3+ stations on the line
} as const;

/** Trivia questions per round: <3 min -> 1, 3-8 min -> 3, 8+ min or boss -> 5. */
export function roundSize(waitSeconds: number, bossActive: boolean): number {
  if (bossActive || waitSeconds >= 8 * 60) return 5;
  if (waitSeconds >= 3 * 60) return 3;
  return 1;
}

/** Arrival guess: 50 for exact, minus 10 per minute off, never below 0. */
export function guessPoints(guessMinutes: number, actualMinutes: number): number {
  const off = Math.abs(guessMinutes - actualMinutes);
  return Math.max(0, POINTS.guessExact - POINTS.guessPenaltyPerMinute * off);
}

/** Boss HP scales with riders checked in on the line, so one rider can win. */
export function bossHp(ridersOnLine: number): number {
  return Math.max(BOSS.minHp, BOSS.hpPerRider * ridersOnLine);
}

// TODO: pick one cited CO2 factor (kg saved per ride vs driving), label it an estimate.
export const CO2_KG_PER_RIDE = 0; // placeholder until a sourced figure is chosen
