'use client'

// Run state shared across the map → station → game → results → boss routes.
// Mock, in-memory only: it resets on refresh until we wire /api/me.

import { createContext, useContext, useState, type ReactNode } from 'react'
import { BOSSES } from './DelayBoss'
import { END_BOSS } from './stats'
import { CURRENT_STATION, INITIAL_PLAYED } from './stations'
import type { GameResult } from './GameFrame'

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
