// Game balance in one place. Items will modify these (e.g. +damage, +max hearts).
// Mock for now: real fights must apply damage server-side (README), so these
// numbers move to the backend once /api/boss handles player stats.

export const PLAYER = {
  /** Hearts at the start of a boss fight. Each wrong answer costs one. */
  maxHearts: 3,
  /** Damage per correct answer, before the combo multiplier. */
  damage: 20,
  /** Correct answers in a row multiply damage, up to this. */
  maxCombo: 3,
}

export const MINI_BOSS = {
  hp: 200,
  /** Seconds until the train arrives and the boss escapes. */
  trainSeconds: 120,
  /** Gold for a win: this plus the damage dealt. */
  winBonus: 200,
  /** Share of damage dealt paid out when the boss escapes or knocks you out. */
  partialRate: 0.6,
}

export const END_BOSS = {
  hp: 1000,
  /** Shorter fight for showing judges the whole loop in a few minutes. */
  demoHp: 300,
  winGold: 2500,
  /** Share of damage dealt paid out on a knockout. */
  partialRate: 0.5,
}

// Fixed loadout until the Armory exists; these will come from the player's inventory.
export const LOADOUT = {
  /** Conductor's Badge: extra heart slot (gold outline). */
  badgeHearts: 1,
  /** Signal Shard buff from beating a Delay Boss: +10% damage. */
  shardBonus: 0.1,
}

/** Damage for the next correct answer, given how many you've got in a row. */
export const hitDamage = (combo: number) => PLAYER.damage * Math.min(combo + 1, PLAYER.maxCombo)
