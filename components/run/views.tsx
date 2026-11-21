'use client'

// One client view per route in the run flow:
//   /                         MapView
//   /station/[id]             StationView  (map with the station card open)
//   /station/[id]/play        PlayView     (Harvard: Two Truths and a Lie)
//   /station/[id]/results     ResultsView
//   /boss                     BossView     (Delay Boss mini-boss fight)
//   /final-boss               EndBossView  (End-of-Line Boss: The Iron Archivist)

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Swords, TriangleAlert } from 'lucide-react'
import { StationCard } from '@/components/cards/StationCard'
import { DelayBoss } from './DelayBoss'
import { EndBoss } from './EndBoss'
import { GameFrame } from './GameFrame'
import { MapScreen } from './MapScreen'
import { ResultsScreen } from './ResultsScreen'
import { useRun } from './RunProvider'
import { CURRENT_STATION, NEXT_STATION, stationById } from './stations'
import { BottomNav, HomeIndicator, StatusBar, type Tab } from './ui'

// Collection and Profile screens aren't ported yet; both go to the /profile stub.
const TAB_HREF: Record<Tab, string> = { map: '/', collection: '/profile', profile: '/profile' }

// Stations where the End-of-Line Boss can be challenged. Only the Red Line boss exists so far.
const END_OF_LINE = new Set(['alewife'])

function MapLayer() {
  const router = useRouter()
  const { played, streak, gold } = useRun()
  return (
    <>
      <MapScreen played={played} streak={streak} gold={gold} onSelect={(id) => router.push(`/station/${id}`)} />
      <StatusBar />
      <BottomNav tab="map" onChange={(t) => router.push(TAB_HREF[t])} />
    </>
  )
}

export function MapView() {
  const router = useRouter()
  const { startBoss, startEndBoss } = useRun()
  return (
    <>
      <MapLayer />
      {/* Demo trigger. Later: open the takeover when /api/boss reports an active delay. */}
      <button
        type="button"
        onClick={() => {
          startBoss()
          router.push('/boss')
        }}
        className="absolute right-4 top-[166px] z-10 flex h-9 items-center gap-1.5 rounded-full border-2 border-[#F6D47E] bg-[#DA291C] px-3 font-fantasy text-[12px] font-black tracking-[0.05em] text-white shadow-[0_3px_0_#6E120B] active:translate-y-[2px]"
      >
        <TriangleAlert size={14} strokeWidth={2.8} />
        Simulate delay
      </button>
      {/* Demo trigger: short End-of-Line Boss fight (demo HP). The real one starts from Alewife's card. */}
      <button
        type="button"
        onClick={() => {
          startEndBoss(true)
          router.push('/final-boss')
        }}
        className="absolute right-4 top-[210px] z-10 flex h-9 items-center gap-1.5 rounded-full border-2 border-[#F6D47E] bg-[#1B1F24] px-3 font-fantasy text-[12px] font-black tracking-[0.05em] text-[#F6D47E] shadow-[0_3px_0_#000] active:translate-y-[2px]"
      >
        <Swords size={14} strokeWidth={2.8} />
        Final boss (demo)
      </button>
      <HomeIndicator />
    </>
  )
}

export function EndBossView() {
  const router = useRouter()
  const { runId, endBossHp, gold, addGold } = useRun()
  return (
    <>
      {/* Keyed on runId: each challenge is a fresh fight even though Next keeps this route alive. */}
      <EndBoss
        key={runId}
        maxHp={endBossHp}
        gold={gold}
        onExit={(earned) => {
          addGold(earned)
          router.push('/')
        }}
      />
      <HomeIndicator tone="light" />
    </>
  )
}

export function BossView() {
  const router = useRouter()
  const { runId, bossIndex, gold, played, streak, addGold } = useRun()
  return (
    <>
      {/* Keyed on runId: each delay is a fresh fight even though Next keeps this route alive. */}
      <DelayBoss
        key={runId}
        bossIndex={bossIndex}
        gold={gold}
        played={played}
        streak={streak}
        onExit={(earned) => {
          addGold(earned)
          router.push('/')
        }}
      />
      <HomeIndicator tone="light" />
    </>
  )
}

export function StationView({ id }: { id: string }) {
  const router = useRouter()
  const { played, startGame, startEndBoss } = useRun()
  return (
    <>
      <MapLayer />
      <StationCard
        onBoss={
          END_OF_LINE.has(id)
            ? () => {
                startEndBoss(false)
                router.push('/final-boss')
              }
            : undefined
        }
        key={id}
        station={stationById(id)}
        played={played.has(id)}
        isCurrent={id === CURRENT_STATION}
        onClose={() => router.push('/')}
        onPlay={() => {
          startGame()
          router.push(`/station/${id}/play`)
        }}
        onViewCollection={() => router.push(TAB_HREF.collection)}
      />
      <HomeIndicator />
    </>
  )
}

export function PlayView({ id }: { id: string }) {
  const router = useRouter()
  const { runId, finishGame } = useRun()
  return (
    <>
      {/* Keyed on runId: Next keeps this route alive between visits, so a new run must remount the game. */}
      <GameFrame
        key={runId}
        onFinish={(r) => {
          finishGame(r)
          router.push(`/station/${id}/results`)
        }}
        onQuit={() => router.push('/')}
      />
      <HomeIndicator tone="light" />
    </>
  )
}

export function ResultsView({ id }: { id: string }) {
  const router = useRouter()
  const { result, streak, gold, played, startGame } = useRun()

  // No result in memory (e.g. a refresh): send them back to the station.
  useEffect(() => {
    if (!result) router.replace(`/station/${id}`)
  }, [result, id, router])

  if (!result) return null
  return (
    <>
      <ResultsScreen
        result={result}
        streak={streak}
        gold={gold}
        cardCount={played.size}
        onPlayAgain={() => {
          startGame()
          router.push(`/station/${id}/play`)
        }}
        onNext={() => router.push(`/station/${NEXT_STATION}`)}
        onMap={() => router.push('/')}
      />
      <HomeIndicator />
    </>
  )
}
