'use client'

// Run state shared across the map → station → game → results → boss routes.
// Mock, in-memory only: it resets on refresh until we wire /api/me.

import { createContext, useContext, useState, type ReactNode } from 'react'
import { BOSSES } from './DelayBoss'
import { END_BOSS } from './stats'
import { CURRENT_STATION, INITIAL_PLAYED } from './stations'
import type { GameResult } from './GameFrame'
import { LOADOUT_SLOTS, itemById } from './items'

type Run = {
  played: Set<string>
  streak: number
  /** Gold balance. Earned in games and boss fights; later spent in the shop. Mock until /api/me has it. */
  gold: number
  result: GameResult | null
  /** Bumped on every new game or fight so that screen starts fresh (see PlayView, BossView). */
  runId: number
  /** Which delay boss the current fight uses. */
  bossIndex: number
  startGame: () => void
  /** Records a finished game: gold, streak, and the station's fact card. */
  finishGame: (r: GameResult, stationId?: string) => void
  startBoss: () => void
  /** HP for the current End-of-Line Boss fight (lower in demo mode). */
  endBossHp: number
  startEndBoss: (demo: boolean) => void
  addGold: (amount: number) => void
  /** Item ids the rider owns (mock until /api/me has an inventory). */
  owned: string[]
  /** The battle loadout: one item id (or null) per slot. */
  equipped: (string | null)[]
  /** Put an item in the first empty loadout slot. Returns false when the loadout is full. */
  equip: (id: string) => boolean
  unequip: (id: string) => void
  /** Buy a shop item with gold. Returns false when it's unaffordable or already owned. */
  buy: (id: string) => boolean
}

const RunContext = createContext<Run | null>(null)

export function RunProvider({ children }: { children: ReactNode }) {
  const [played, setPlayed] = useState(() => new Set(INITIAL_PLAYED))
  const [streak, setStreak] = useState(7)
  const [gold, setGold] = useState(1250) // mock: gold from the 6 stations already played
  const [result, setResult] = useState<GameResult | null>(null)
  const [runId, setRunId] = useState(0)
  const [bossIndex, setBossIndex] = useState(0)

  const startGame = () => setRunId((n) => n + 1)

  const finishGame = (r: GameResult, stationId = CURRENT_STATION) => {
    setResult(r)
    setGold((g) => g + r.points)
    setStreak(8) // first play today extends the streak
    setPlayed((p) => new Set(p).add(stationId))
  }

  const startBoss = () => {
    setRunId((n) => n + 1)
    setBossIndex(Math.floor(Math.random() * BOSSES.length))
  }

  const [endBossHp, setEndBossHp] = useState(END_BOSS.hp)
  const startEndBoss = (demo: boolean) => {
    setRunId((n) => n + 1)
    setEndBossHp(demo ? END_BOSS.demoHp : END_BOSS.hp)
  }

  const addGold = (amount: number) => setGold((g) => g + amount)

  const [owned, setOwned] = useState(['badge', 'shield', 'tonic', 'spike', 'feather', 'ticket', 'shard'])
  // Starts with the End-of-Line Boss's loadout
  const [equipped, setEquipped] = useState<(string | null)[]>(['badge', 'shield', 'tonic'])
  const equip = (id: string) => {
    if (equipped.includes(id)) return true
    const free = equipped.indexOf(null)
    if (free < 0 || equipped.length > LOADOUT_SLOTS) return false
    setEquipped(equipped.map((e, i) => (i === free ? id : e)))
    return true
  }
  const unequip = (id: string) => setEquipped((eq) => eq.map((e) => (e === id ? null : e)))
  const buy = (id: string) => {
    const price = itemById(id)?.price
    if (!price || owned.includes(id) || gold < price) return false
    setGold((g) => g - price)
    setOwned((o) => [...o, id])
    return true
  }

  return (
    <RunContext
      value={{
        played,
        streak,
        gold,
        result,
        runId,
        bossIndex,
        startGame,
        finishGame,
        startBoss,
        endBossHp,
        startEndBoss,
        addGold,
        owned,
        equipped,
        equip,
        unequip,
        buy,
      }}
    >
      {children}
    </RunContext>
  )
}

export function useRun() {
  const run = useContext(RunContext)
  if (!run) throw new Error('useRun must be used inside <RunProvider>')
  return run
}
