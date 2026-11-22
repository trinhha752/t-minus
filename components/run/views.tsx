'use client'

// One client view per route in the run flow:
//   /                         MapView
//   /inventory                InventoryView (the Bag tab: items, loadout and the Station Shop)
//   /station/[id]             StationView  (map with the station card open)
//   /station/[id]/play        PlayView     (Harvard: Two Truths and a Lie)
//   /station/[id]/results     ResultsView
//   /boss                     BossView     (Delay Boss mini-boss fight)
//   /final-boss               EndBossView  (End-of-Line Boss: The Iron Archivist)

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Swords, TriangleAlert } from 'lucide-react'
import { StationCard } from '@/components/cards/StationCard'
import { DelayBoss, type LiveDelayBoss } from './DelayBoss'
import { EndBoss, type LiveEndBoss } from './EndBoss'
import { END_BOSS } from './stats'
import { LINES } from './stations'
import { GameFrame } from './GameFrame'
import { MapScreen } from './MapScreen'
import { ResultsScreen } from './ResultsScreen'
import { useRun } from './RunProvider'
import { CURRENT_STATION, stationById, type Station } from './stations'
import { MATCH_GAME, MatchGame } from './MatchGame'
import { Inventory } from './Inventory'
import { Collection } from './Collection'
import { ProfileScreen } from './Profile'

/** Stations with their own hand-made game; every other station plays Landmark Match for now. */
const HAS_OWN_GAME = new Set(['harvard'])
const withGame = (s: Station): Station => (HAS_OWN_GAME.has(s.id) ? s : { ...s, game: MATCH_GAME })
import { BottomNav, HomeIndicator, StatusBar, type Tab } from './ui'
import { DEMO_MODE, useMyStation } from '@/components/game/useMyStation'
import { lineComplete, nextStation, nextStops, suggestTransfer } from '@/components/game/loop'
import type { WhereNext } from './MapScreen'
import type { Arrival } from '@/types'

// Collection and Profile screens aren't ported yet; both go to the /profile stub.
const TAB_HREF: Record<Tab, string> = { map: '/', bag: '/inventory', collection: '/collection', profile: '/profile' }

// Stations where the End-of-Line Boss can be challenged. Only the Red Line boss exists so far.
const END_OF_LINE = new Set(['alewife'])

/** The station the player is really at (phone location), or the demo station until located. */
function useHere() {
  const here = useMyStation()
  const id = here.slug ?? CURRENT_STATION
  const note =
    here.slug && !here.inRange && here.metres != null
      ? `Nearest station · ${(here.metres / 1000).toFixed(1)} km`
      : undefined
  return { id, note, located: here.status === 'ready', settled: here.status !== 'locating' }
}

/** Live next train each way at a station: MBTA direction 0 is our +1 along the line, 1 is -1. */
function useTrainsByDirection(slug: string) {
  const [trains, setTrains] = useState<Record<1 | -1, Arrival | undefined>>({ 1: undefined, [-1]: undefined })
  useEffect(() => {
    let live = true
    const load = () =>
      fetch(`/api/predictions?stop=${slug}&limit=8`)
        .then((r) => r.json())
        .then((r) => {
          if (!live || !r?.ok) return
          const list = r.data as Arrival[]
          setTrains({ 1: list.find((a) => a.directionId === 0), [-1]: list.find((a) => a.directionId === 1) })
        })
        .catch(() => {})
    const first = setTimeout(load, 0)
    const t = setInterval(load, 30_000)
    return () => {
      live = false
      clearTimeout(first)
      clearInterval(t)
    }
  }, [slug])
  return trains
}

const signText = (secs: number) => (secs <= 0 ? 'boarding' : secs <= 60 ? 'arriving' : `train in ${Math.round(secs / 60)} min`)

/** Where to go once the station you're at is stamped. */
function useWhereNext(here: string, played: Set<string>): WhereNext {
  const trains = useTrainsByDirection(here)
  const t = suggestTransfer(here, played)
  return {
    stops: nextStops(here, played).map((st) => {
      const train = trains[st.dir]
      return {
        id: st.id,
        name: stationById(st.id).name,
        dir: st.dir,
        stops: st.stops,
        toward: train?.headsign ?? st.towardEnd,
        train: train ? signText(train.secondsAway) : undefined,
      }
    }),
    transfer: t ? { at: t.at, atName: stationById(t.at).name, line: t.line, left: t.left } : null,
    lineDone: lineComplete(here, played),
  }
}

function MapLayer() {
  const router = useRouter()
  const { played, streak, gold, startEndBoss, newRider } = useRun()
  const here = useHere()
  const whereNext = useWhereNext(here.id, played)
  return (
    <>
      <MapScreen
        played={played}
        streak={streak}
        gold={gold}
        currentId={here.id}
        hereNote={here.note}
        nextId={nextStation(here.id, played)}
        whereNext={whereNext}
        onBoss={() => {
          startEndBoss(false)
          router.push('/final-boss')
        }}
        onSelect={(id) => router.push(`/station/${id}`)}
      />
      {DEMO_MODE && (
        <button
          type="button"
          onClick={() => void newRider()}
          className="absolute left-4 top-[238px] z-20 border-2 border-ink bg-[#FBF3DF] px-2 py-1 font-pixel text-[12px] font-bold shadow-[2px_2px_0_#1B1F24] active:translate-x-px active:translate-y-px active:shadow-none"
        >
          ↺ New rider (demo)
        </button>
      )}
      <StatusBar />
      <BottomNav tab="map" onChange={(t) => router.push(TAB_HREF[t])} />
    </>
  )
}

export function InventoryView() {
  const router = useRouter()
  const { gold, owned, equipped, equip, unequip, buy } = useRun()
  return (
    <>
      <Inventory gold={gold} owned={owned} equipped={equipped} onEquip={equip} onUnequip={unequip} onBuy={buy} />
      <BottomNav tab="bag" onChange={(t) => router.push(TAB_HREF[t])} />
    </>
  )
}

export function CollectionView() {
  const router = useRouter()
  const { played } = useRun()
  return (
    <>
      <Collection played={played} />
      <BottomNav tab="collection" onChange={(t) => router.push(TAB_HREF[t])} />
    </>
  )
}

export function ProfileView() {
  const router = useRouter()
  const { gold, streak, played } = useRun()
  return (
    <>
      <ProfileScreen gold={gold} streak={streak} played={played} />
      <BottomNav tab="profile" onChange={(t) => router.push(TAB_HREF[t])} />
    </>
  )
}

export function MapView() {
  const router = useRouter()
  const { startBoss, startEndBoss } = useRun()
  return (
    <>
      <MapLayer />
      {/* Demo triggers. Later the delay boss opens when /api/boss reports an active delay,
          and the real End-of-Line Boss starts from Alewife's card. */}
      <div className="absolute inset-x-4 top-[170px] z-10 flex justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            startBoss()
            router.push('/boss')
          }}
          className="flex h-8 items-center gap-1.5 rounded-full border-2 border-[#F6D47E] bg-[#DA291C] px-2.5 font-fantasy text-[11px] font-black tracking-[0.04em] text-white shadow-[0_3px_0_#6E120B] active:translate-y-[2px]"
        >
          <TriangleAlert size={13} strokeWidth={2.8} />
          Simulate delay
        </button>
        <button
          type="button"
          onClick={() => {
            startEndBoss(true)
            router.push('/final-boss')
          }}
          className="flex h-8 items-center gap-1.5 rounded-full border-2 border-[#F6D47E] bg-[#1B1F24] px-2.5 font-fantasy text-[11px] font-black tracking-[0.04em] text-[#F6D47E] shadow-[0_3px_0_#000] active:translate-y-[2px]"
        >
          <Swords size={13} strokeWidth={2.8} />
          Final boss (demo)
        </button>
      </div>
      <HomeIndicator />
    </>
  )
}

/** This rider's real End Boss fight for their line's chapter (/api/final-boss/*). */
function useLiveEndBoss(stationId: string, ready: boolean, demo: boolean, unlocked: boolean, runId: number) {
  const [live, setLive] = useState<LiveEndBoss | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'none'>('loading')
  const chapterId = stationById(stationId).lines[0]
  useEffect(() => {
    if (!ready) return
    let alive = true
    // The server only starts a real fight once the line is complete (or in a demo fight).
    if (!demo && !unlocked) {
      const t = setTimeout(() => alive && setStatus('none'), 0)
      return () => {
        alive = false
        clearTimeout(t)
      }
    }
    const post = (url: string, body: unknown) =>
      fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        .then((r) => r.json())
        .catch(() => null)
    void (async () => {
      const r = await post('/api/final-boss/start', { chapterId, demo })
      if (!alive) return
      if (!r?.ok || !r.data.questions?.length) return setStatus('none')
      const fight = r.data
      setLive({
        bossName: fight.bossName,
        title: `Legendary · ${LINES[chapterId].realm}`,
        hpTotal: fight.hpTotal,
        hpStart: fight.hpRemaining,
        questions: (fight.questions as { id: string; question: string; options: string[] }[]).map((q) => ({
          id: q.id,
          q: q.question,
          answers: q.options,
        })),
        answer: async (questionId, choiceIndex) => {
          const a = await post('/api/final-boss/answer', { fightId: fight.id, questionId, choiceIndex })
          if (!a?.ok) return null
          return {
            correct: a.data.correct,
            correctIndex: a.data.correctIndex,
            damage: a.data.damage,
            hpRemaining: a.data.hpRemaining,
            combo: a.data.combo,
          }
        },
        forfeit: () => void post('/api/final-boss/forfeit', { fightId: fight.id }),
      })
      setStatus('ready')
    })()
    return () => {
      alive = false
    }
  }, [chapterId, ready, demo, unlocked, runId])
  return { live, status }
}

export function EndBossView() {
  const router = useRouter()
  const { runId, endBossHp, gold, played, refresh } = useRun()
  const here = useHere()
  const { live, status } = useLiveEndBoss(here.id, here.settled, endBossHp < END_BOSS.hp, lineComplete(here.id, played), runId)
  if (status === 'loading') return <div className="absolute inset-0 tex-leather" />
  return (
    <>
      {/* Keyed on runId: each challenge is a fresh fight even though Next keeps this route alive. */}
      <EndBoss
        key={`${runId}-${live ? 'live' : 'local'}`}
        live={live ?? undefined}
        maxHp={endBossHp}
        gold={gold}
        onExit={() => {
          void refresh() // the win bonus and badge are awarded on the server
          router.push('/')
        }}
      />
      <HomeIndicator tone="light" />
    </>
  )
}

const TEAM_OF: Record<string, 'Red' | 'Green' | 'Orange'> = { red: 'Red', green: 'Green', orange: 'Orange' }

/**
 * The real Delay Boss on the rider's line: its shared HP from /api/boss, questions from
 * /api/trivia?line=, answers checked by /api/trivia/answer. In demo mode, "Simulate delay"
 * starts one when the line isn't really late (/api/boss/simulate).
 */
function useLiveDelayBoss(stationId: string, ready: boolean) {
  const [live, setLive] = useState<LiveDelayBoss | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'none'>('loading')
  const line = TEAM_OF[stationById(stationId).lines[0]]
  useEffect(() => {
    if (!ready) return
    let alive = true
    const getBoss = async () =>
      ((await fetch('/api/boss').then((r) => r.json()).catch(() => null))?.data ?? []).find(
        (b: { line: string; active: boolean }) => b.line === line && b.active,
      )
    void (async () => {
      let boss = await getBoss()
      if (!boss && DEMO_MODE) {
        await fetch('/api/boss/simulate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ line }),
        }).catch(() => null)
        boss = await getBoss()
      }
      const round = await fetch(`/api/trivia?line=${line}`).then((r) => r.json()).catch(() => null)
      if (!alive) return
      if (!boss || !round?.ok || !round.data.questions.length) return setStatus('none')
      const roundId = round.data.roundId as string
      setLive({
        lineName: `${line} Line`,
        delayLabel:
          boss.avgDelaySeconds >= 60
            ? `+${Math.round(boss.avgDelaySeconds / 60)} min`
            : boss.lateTrains > 0
              ? `${boss.lateTrains} trains late`
              : 'Delayed',
        hpTotal: boss.hpTotal,
        hpStart: boss.hpRemaining,
        questions: (round.data.questions as { id: string; question: string; options: string[] }[]).map((q) => ({
          id: q.id,
          q: q.question,
          answers: q.options,
        })),
        answer: async (questionId, choiceIndex) => {
          const r = await fetch('/api/trivia/answer', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ roundId, questionId, choiceIndex, line }),
          })
            .then((x) => x.json())
            .catch(() => null)
          if (!r?.ok) return null
          return {
            correct: r.data.correct,
            correctIndex: r.data.correctIndex,
            damage: r.data.bossDamage,
            hpRemaining: r.data.bossHpRemaining,
            combo: r.data.combo,
          }
        },
      })
      setStatus('ready')
    })()
    return () => {
      alive = false
    }
  }, [line, ready])
  return { live, status }
}

export function BossView() {
  const router = useRouter()
  const { runId, bossIndex, gold, played, streak, refresh } = useRun()
  const here = useHere()
  const { live, status } = useLiveDelayBoss(here.id, here.settled)
  if (status === 'loading') return <div className="absolute inset-0 tex-leather" />
  return (
    <>
      {/* Keyed on runId: each delay is a fresh fight even though Next keeps this route alive. */}
      <DelayBoss
        key={`${runId}-${live ? 'live' : 'local'}`}
        live={live ?? undefined}
        bossIndex={bossIndex}
        gold={gold}
        played={played}
        streak={streak}
        onExit={() => {
          void refresh() // points for a defeated boss are awarded on the server
          router.push('/')
        }}
      />
      <HomeIndicator tone="light" />
    </>
  )
}

export function StationView({ id }: { id: string }) {
  const router = useRouter()
  const { played, startEndBoss } = useRun()
  const here = useHere()
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
        station={withGame(stationById(id))}
        played={played.has(id)}
        isCurrent={id === here.id}
        onDemoPlay={id === here.id ? undefined : () => router.push(`/station/${id}/arrive`)}
        onClose={() => router.push('/')}
        onPlay={() => router.push(`/station/${id}/arrive`)}
        onViewCollection={() => router.push(TAB_HREF.collection)}
      />
      <HomeIndicator />
    </>
  )
}

export function PlayView({ id }: { id: string }) {
  const router = useRouter()
  const { runId, finishGame, startGame } = useRun()
  if (!HAS_OWN_GAME.has(id)) {
    // Every other station plays Landmark Match (it shows its own results).
    return (
      <>
        <MatchGame
          key={runId}
          seed={runId}
          station={stationById(id)}
          onFinish={(r) => finishGame(r, id)}
          onPlayAgain={startGame}
          onMap={() => router.push('/')}
        />
        <HomeIndicator tone="light" />
      </>
    )
  }
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
  const next = nextStation(id, played)

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
        nextId={next}
        onNext={() => router.push(next ? `/station/${next}` : '/')}
        onMap={() => router.push('/')}
      />
      <HomeIndicator />
    </>
  )
}
