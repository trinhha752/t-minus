'use client'

// Run state shared across the map → station → game → results → boss routes.
// Played stations, gold (points) and streak come from the server (/api/progress
// and /api/me), so they survive a refresh and match what the backend counts.
// Boss-fight gold (addGold) is still local until the bosses are wired up.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { BOSSES } from './DelayBoss'
import { END_BOSS } from './stats'
import { CURRENT_STATION } from './stations'
import type { GameResult } from './GameFrame'
import type { Chapter } from '@/types'

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
  /** Re-read stamps, points and streak from the server (after a stamp, or a new rider). */
  refresh: () => Promise<void>
  /** Start over as a new rider (demo mode only). */
  newRider: () => Promise<void>
}

const RunContext = createContext<Run | null>(null)

export function RunProvider({ children }: { children: ReactNode }) {
  const [played, setPlayed] = useState<Set<string>>(() => new Set())
  const [streak, setStreak] = useState(0)
  const [gold, setGold] = useState(0)
  const [result, setResult] = useState<GameResult | null>(null)
  const [runId, setRunId] = useState(0)
  const [bossIndex, setBossIndex] = useState(0)

  const startGame = () => setRunId((n) => n + 1)

  const refresh = useCallback(async () => {
    const [progress, me] = await Promise.all([
      fetch('/api/progress').then((r) => r.json()).catch(() => null),
      fetch('/api/me').then((r) => r.json()).catch(() => null),
    ])
    if (progress?.ok) {
      const stamped = (progress.data.chapters as Chapter[]).flatMap((c) => c.stations.filter((s) => s.cleared).map((s) => s.slug))
      setPlayed(new Set(stamped))
    }
    if (me?.ok) {
      setGold(me.data.points)
      setStreak(me.data.streak)
    }
  }, [])
  useEffect(() => {
    const t = setTimeout(refresh, 0)
    return () => clearTimeout(t)
  }, [refresh])

  const newRider = useCallback(async () => {
    await fetch('/api/session/reset', { method: 'POST' }).catch(() => null)
    setResult(null)
    await refresh()
  }, [refresh])

  /** Records a finished station game on the server (its best score), then re-syncs. */
  const finishGame = (r: GameResult, stationId = CURRENT_STATION) => {
    setResult(r)
    void fetch('/api/minigame/result', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        stationId,
        score: r.score,
        cleared: true,
        durationMs: Math.max(3000, Math.round(r.secondsUsed * 1000)),
      }),
    })
      .catch(() => null)
      .then(refresh)
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
        refresh,
        newRider,
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
