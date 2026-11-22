// Items the rider can own. Gear goes into the 3 battle-loadout slots; buffs are always on.
// Mock data until the backend has an inventory (and the gold shop / reforging exist).
// The first four match the End-of-Line Boss's loadout (EndBoss.tsx).

import { PLAYER } from './stats'
import type { Sprite } from './pixelSprites'

export type Rarity = 'common' | 'rare' | 'epic'

export type Item = {
  id: string
  name: string
  kind: 'gear' | 'buff'
  rarity: Rarity
  /** Shown as I, II, III; reforging will raise it later. */
  level: 1 | 2 | 3
  /** What it does, in one line. */
  effect: string
  flavor: string
  /** Where it came from. */
  source: string
  sprite: Sprite
  bonus?: { hearts?: number; damagePct?: number; combo?: number; goldPct?: number }
  /** Gold price in the shop; items without one can't be bought. */
  price?: number
}

export const LOADOUT_SLOTS = 3

export const RARITY: Record<Rarity, { label: string; color: string; glow: string }> = {
  common: { label: 'Common', color: '#B8B0A0', glow: '#E8E1D2' },
  rare: { label: 'Rare', color: '#3B82F6', glow: '#BFD8FF' },
  epic: { label: 'Epic', color: '#9B5DE5', glow: '#E2CCFF' },
}

export const ITEMS: Item[] = [
  {
    id: 'badge',
    name: "Conductor's Badge",
    kind: 'gear',
    rarity: 'common',
    level: 1,
    effect: '+1 heart in boss fights',
    flavor: 'Polished by a hundred years of thumbs.',
    source: 'Starter item',
    bonus: { hearts: 1 },
    sprite: {
      rows: [
        '....kk....',
        '...kggk...',
        'kkkkggkkkk',
        'kggggggggk',
        '.kgggyggk.',
        '..kggggk..',
        '.kggkkggk.',
        '.kgk..kgk.',
        '.kk....kk.',
      ],
    },
  },
  {
    id: 'shield',
    name: 'Brass Shield',
    kind: 'gear',
    rarity: 'rare',
    level: 2,
    effect: 'Blocks your first miss',
    flavor: 'Hammered from an old turnstile.',
    source: 'Starter item',
    sprite: {
      rows: [
        'kkkkkkkkkk',
        'kggggggggk',
        'kgyyggoogk',
        'kgyggggogk',
        'kggggggggk',
        '.kggggggk.',
        '.kgggoogk.',
        '..kggggk..',
        '...kggk...',
        '....kk....',
      ],
      pal: { o: '#B8862B' },
    },
  },
  {
    id: 'tonic',
    name: 'Healing Tonic',
    kind: 'gear',
    rarity: 'common',
    level: 1,
    effect: 'Tap in a fight to heal 1 heart',
    flavor: 'Tastes like a Fluffernutter.',
    source: 'Starter item',
    sprite: {
      rows: [
        '...kkkk...',
        '...kttk...',
        '....kk....',
        '...kwwk...',
        '..kwwwwk..',
        '.kGGGGGGk.',
        '.kGlGGGGk.',
        '.kGlGGGGk.',
        '.kGGGGGGk.',
        '..kkkkkk..',
      ],
      pal: { G: '#2F9E5A', l: '#9BFFB0', w: '#DDEFF0' },
    },
  },
  {
    id: 'spike',
    name: 'Old Rail Spike',
    kind: 'gear',
    rarity: 'rare',
    level: 1,
    effect: '+15% damage',
    flavor: 'Pulled from the first subway tracks of 1897.',
    source: 'Found in the Boylston tunnel',
    bonus: { damagePct: 15 },
    sprite: {
      rows: [
        'kkkkkkkk..',
        'kssssssk..',
        'kkksskkk..',
        '..kssk....',
        '..kssk....',
        '..kssk....',
        '..kssk....',
        '..kssk....',
        '...kk.....',
      ],
      pal: { s: '#8C939C' },
    },
  },
  {
    id: 'feather',
    name: 'Pigeon Feather',
    kind: 'gear',
    rarity: 'common',
    level: 1,
    effect: 'Combo can reach ×4',
    flavor: 'Every platform has one. Nobody knows who drops them.',
    source: 'Found at Park Street',
    bonus: { combo: 1 },
    sprite: {
      rows: [
        '.......kk.',
        '......kssk',
        '.....ksssk',
        '....kslsk.',
        '...kslsk..',
        '..kslsk...',
        '.kssk.....',
        '.kk.......',
        'k.........',
      ],
      pal: { s: '#9AA3AD', l: '#D3D9DF' },
    },
  },
  {
    id: 'ticket',
    name: 'Lucky Transfer',
    kind: 'gear',
    rarity: 'rare',
    level: 1,
    effect: '+10% gold from games',
    flavor: 'A paper transfer from 1970. Still valid, somehow.',
    source: 'Found at Harvard',
    bonus: { goldPct: 10 },
    sprite: {
      rows: [
        'kkkkkkkkkk',
        'kwwwwwwwwk',
        'kRRRRRRRRk',
        'kwwkwwkwwk',
        'kwwwwwwwwk',
        'kwkkkkkwwk',
        'kwwwwwwwwk',
        'kkkkkkkkkk',
      ],
      pal: { R: '#DA291C' },
    },
  },
  {
    id: 'shard',
    name: 'Signal Shard',
    kind: 'buff',
    rarity: 'epic',
    level: 2,
    effect: '+10% damage, always on',
    flavor: 'Still humming with the boss’s stolen power.',
    source: 'Won from a Delay Boss',
    bonus: { damagePct: 10 },
    sprite: {
      rows: [
        '....kk....',
        '...kpPk...',
        '..kpPPPk..',
        '..kpPPPk..',
        '.kpPPPPPk.',
        '.kpPPPwPk.',
        '..kpPPPk..',
        '...kpPk...',
        '....kk....',
      ],
      pal: { p: '#7B3FC4', P: '#B98AF0' },
    },
  },

  // ---- Shop stock ----
  {
    id: 'thermos',
    name: 'Hot Thermos',
    kind: 'gear',
    rarity: 'common',
    level: 1,
    effect: '+1 heart in boss fights',
    flavor: 'Keeps coffee warm from Alewife to Braintree.',
    source: 'Station Shop',
    price: 300,
    bonus: { hearts: 1 },
    sprite: {
      rows: [
        '...kkkk...',
        '..kRRRRk..',
        '..kkkkkk..',
        '..kssssk..',
        '..kswssk..',
        '..kswssk..',
        '..kssssk..',
        '..kssssk..',
        '..kkkkkk..',
      ],
      pal: { R: '#7A1E14', s: '#C0392B', w: '#F2A497' },
    },
  },
  {
    id: 'map',
    name: 'Pocket Map',
    kind: 'gear',
    rarity: 'rare',
    level: 1,
    effect: '+15% gold from games',
    flavor: 'Folded so many times the Green Line is fuzzy.',
    source: 'Station Shop',
    price: 500,
    bonus: { goldPct: 15 },
    sprite: {
      rows: [
        'kkkkkkkkkk',
        'kwwkwwkwwk',
        'kwRkwwkGwk',
        'kRwkwRkwGk',
        'kwwkRwkwwk',
        'kwwkwwkwwk',
        'kkkkkkkkkk',
      ],
      pal: { R: '#DA291C', G: '#00843D' },
    },
  },
  {
    id: 'whistle',
    name: "Conductor's Whistle",
    kind: 'gear',
    rarity: 'rare',
    level: 1,
    effect: 'Combo can reach ×4',
    flavor: 'One blast and the whole car goes quiet.',
    source: 'Station Shop',
    price: 600,
    bonus: { combo: 1 },
    sprite: {
      rows: [
        '.kkkkkk...',
        'kggggggkk.',
        'kgkkgggggk',
        'kggggggggk',
        '.kgggggggk',
        '..kkkkkkk.',
      ],
    },
  },
  {
    id: 'lantern',
    name: 'Tunnel Lantern',
    kind: 'gear',
    rarity: 'epic',
    level: 2,
    effect: '+20% damage',
    flavor: 'Lights the way through the Ancient Tunnels.',
    source: 'Station Shop',
    price: 900,
    bonus: { damagePct: 20 },
    sprite: {
      rows: [
        '....kk....',
        '...k..k...',
        '..kkkkkk..',
        '..kGyyGk..',
        '..kyyyyk..',
        '..kyyyyk..',
        '..kGyyGk..',
        '..kkkkkk..',
        '...kkkk...',
      ],
      pal: { G: '#00843D' },
    },
  },
]

/** What the Station Shop sells. */
export const SHOP = ITEMS.filter((i) => i.price)

export const itemById = (id: string) => ITEMS.find((i) => i.id === id)

/** Fight stats from the base player plus equipped gear and all owned buffs. */
export function loadoutStats(equipped: (string | null)[], owned: string[]) {
  const active = [
    ...equipped.filter((id): id is string => !!id),
    ...owned.filter((id) => itemById(id)?.kind === 'buff'),
  ]
    .map(itemById)
    .filter((i): i is Item => !!i)
  const sum = (k: keyof NonNullable<Item['bonus']>) => active.reduce((n, i) => n + (i.bonus?.[k] ?? 0), 0)
  return {
    hearts: PLAYER.maxHearts + sum('hearts'),
    damage: Math.round(PLAYER.damage * (1 + sum('damagePct') / 100)),
    combo: PLAYER.maxCombo + sum('combo'),
    goldPct: sum('goldPct'),
  }
}
