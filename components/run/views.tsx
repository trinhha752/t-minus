'use client'

// One client view per route in the run flow:
//   /                         MapView
//   /inventory                InventoryView (the Bag tab: items, loadout and the Station Shop)
//   /station/[id]             StationView  (map with the station card open)
//   /station/[id]/play        PlayView     (Two Lies and a Truth or Landmark Match)
//   /station/[id]/results     ResultsView
//   /boss                     BossView     (Delay Boss mini-boss fight)
//   /final-boss               EndBossView  (End-of-Line Boss: The Iron Archivist)

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Swords, TriangleAlert } from 'lucide-react'
import { StationCard } from '@/components/cards/StationCard'
import { DelayBoss, type LiveDelayBoss } from './DelayBoss'
import { DelayGame, type DelayGameKind } from './DelayGames'
import { LineBoss } from './LineBoss'
import { loadoutStats } from './items'
import { LINES } from './stations'
import { MapScreen } from './MapScreen'
import { ResultsScreen } from './ResultsScreen'
import { useRun } from './RunProvider'
import { CURRENT_STATION, stationById, type Station } from './stations'
import { MATCH_GAME, MatchGame } from './MatchGame'
import { TRUTH_GAME, TruthGame } from './TruthGame'
import { TRUTH_ROUNDS } from './truths'
import { SEAL_GAME, SealGame } from './SealGame'
import type { GameResult } from './GameFrame'
import { Inventory } from './Inventory'
import { Collection } from './Collection'
import { ProfileScreen } from './Profile'

/** BU Central has its own game; stations with Two Lies and a Truth questions play that; the rest play Landmark Match. */
const isSealGame = (id: string) => id === 'bucentral'
const isTruthGame = (id: string) => id in TRUTH_ROUNDS
const withGame = (s: Station): Station => ({
  ...s,
  game: isSealGame(s.id) ? SEAL_GAME : isTruthGame(s.id) ? TRUTH_GAME : MATCH_GAME,
})
import { BottomNav, HomeIndicator, StatusBar, type Tab } from './ui'
import { DEMO_MODE, DEMO_STATIONS, setDemoStation, useDemoStation, useMyStation } from '@/components/game/useMyStation'
import { lineComplete, nextStation, nextStops, suggestTransfer } from '@/components/game/loop'
import type { WhereNext } from './MapScreen'
import type { Arrival } from '@/types'

// Collection and Profile screens aren't ported yet; both go to the /profile stub.
const TAB_HREF: Record<Tab, string> = { map: '/', bag: '/inventory', collection: '/collection', profile: '/profile' }

// Stations where the End-of-Line Boss can be challenged. Only the Red Line boss exists so far.
const END_OF_LINE = new Set(['alewife'])

/** Stage-demo controls on the map: stand at one station per line, or start over. */
function DemoControls({ here, onNewRider }: { here: string; onNewRider: () => void }) {
  const demo = useDemoStation()
  const chip =
    'border-2 border-ink px-1.5 py-1 font-pixel text-[11px] font-bold leading-none shadow-[2px_2px_0_#1B1F24] active:translate-x-px active:translate-y-px active:shadow-none'
  return (
    <div className="absolute left-4 right-4 top-[236px] z-20 flex flex-wrap items-center gap-1.5 border-2 border-ink bg-[#F1E7CF] px-2 py-1.5 shadow-[3px_3px_0_rgba(27,31,36,0.85)]">
      <span className="font-pixel text-[11px] font-bold text-muted">DEMO · stand at</span>
      {DEMO_STATIONS.map((d) => {
        const on = demo === d.slug
        return (
          <button
            key={d.slug}
            type="button"
            onClick={() => setDemoStation(on ? null : d.slug)}
            className={`${chip} ${on ? 'text-white' : 'bg-[#FBF3DF] text-ink'}`}
            style={on ? { backgroundColor: LINES[d.line].color } : { borderLeft: `6px solid ${LINES[d.line].color}` }}
            aria-pressed={on}
            title={on ? 'Back to my real location' : `Pretend you're at ${d.label}`}
          >
            {d.label}
          </button>
        )
      })}
      {demo && here === demo && (
        <button type="button" onClick={() => setDemoStation(null)} className={`${chip} bg-[#FBF3DF] text-ink`}>
          📍 Real
        </button>
      )}
      <button type="button" onClick={onNewRider} className={`${chip} bg-[#FBF3DF] text-ink`}>
        ↺ New rider
      </button>
    </div>
  )
}

/** The station the player is really at (phone location), or the demo station until located. */
function useHere() {
  const here = useMyStation()
  const demo = useDemoStation()
  if (demo) return { id: demo, note: undefined, located: true, settled: true }
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
      {DEMO_MODE && <DemoControls here={here.id} onNewRider={() => void newRider()} />}
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

export function EndBossView() {
  const router = useRouter()
  const { runId, endBossHp, addGold, equipped, owned } = useRun()
  const loadout = loadoutStats(equipped, owned)
  const stats = {
    hearts: loadout.hearts,
    damage: loadout.damage,
    combo: loadout.combo,
    // Two potions to start, plus one per Healing Tonic in your loadout
    potions: 2 + equipped.filter((id) => id === 'tonic').length,
    shield: equipped.includes('shield'),
  }
  return (
    <>
      {/* Keyed on runId: each challenge is a fresh fight even though Next keeps this route alive. */}
      <LineBoss
        key={runId}
        line="red"
        maxHp={endBossHp}
        stats={stats}
        onExit={(earned) => {
          addGold(earned)
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

const DELAY_FIGHTS: ('trivia' | DelayGameKind)[] = ['trivia', 'signal', 'dodge']

export function BossView() {
  const router = useRouter()
  const { runId, bossIndex, gold, played, streak, refresh, addGold } = useRun()
  const here = useHere()
  // Each delay is one of three fights, so they don't all play the same
  const kind = DELAY_FIGHTS[(runId + bossIndex) % DELAY_FIGHTS.length]
  // Only the trivia fight uses the shared server boss (and starts a simulated one in demo mode)
  const { live, status } = useLiveDelayBoss(here.id, here.settled && kind === 'trivia')
  if (kind !== 'trivia') {
    return (
      <>
        <DelayGame
          key={runId}
          kind={kind}
          bossIndex={bossIndex}
          line={stationById(here.id).lines[0]}
          onExit={(earned) => {
            addGold(earned)
            router.push('/')
          }}
        />
        <HomeIndicator tone="light" />
      </>
    )
  }
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
  // Both games show their own results. Keyed on runId: Next keeps this route alive between
  // visits, so a new run must remount the game.
  const props = {
    seed: runId,
    station: stationById(id),
    onFinish: (r: GameResult) => finishGame(r, id),
    onPlayAgain: startGame,
    onMap: () => router.push('/'),
  }
  return (
    <>
      {isSealGame(id) ? (
        <SealGame key={runId} {...props} />
      ) : isTruthGame(id) ? (
        <TruthGame key={runId} {...props} />
      ) : (
        <MatchGame key={runId} {...props} />
      )}
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
