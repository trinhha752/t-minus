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
import { StationCard } from '@/components/cards/StationCard'
import { DelayBoss, type LiveDelayBoss } from './DelayBoss'
import { DelayChart } from '@/components/game/DelayChart'
import { ConductorChat } from '@/components/game/ConductorChat'
import { DelayGame, type DelayGameKind } from './DelayGames'
import { LineBoss } from './LineBoss'
import { loadoutStats } from './items'
import { LINES } from './stations'
import { END_BOSS } from './stats'
import { MapScreen } from './MapScreen'
import { ResultsScreen } from './ResultsScreen'
import { useRun } from './RunProvider'
import { CURRENT_STATION, STATIONS, stationById, type Station } from './stations'
import { MATCH_GAME, MatchGame } from './MatchGame'
import { TRUTH_GAME, TruthGame } from './TruthGame'
import { TRUTH_ROUNDS } from './truths'
import { SEAL_GAME, SealGame } from './SealGame'
import { SLIDE_GAME, SlideGame } from './SlideGame'
import { LION_GAME, LionGame } from './LionGame'
import type { GameResult } from './GameFrame'
import { Inventory } from './Inventory'
import { Collection } from './Collection'
import { ProfileScreen } from './Profile'

/** BU Central and Government Center have their own games; stations with Two Lies and a Truth questions play that; the rest play Landmark Match. */
const isSealGame = (id: string) => id === 'bucentral'
const isSlideGame = (id: string) => id === 'gov'
const isLionGame = (id: string) => id === 'chinatown'
const isTruthGame = (id: string) => id in TRUTH_ROUNDS
const withGame = (s: Station): Station => ({
  ...s,
  game: isSealGame(s.id) ? SEAL_GAME : isSlideGame(s.id) ? SLIDE_GAME : isLionGame(s.id) ? LION_GAME : isTruthGame(s.id) ? TRUTH_GAME : MATCH_GAME,
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

/**
 * Stage-demo controls, folded into one small "Demo" button so the map stays clear:
 * stand at one station per line, simulate a delay, open the End Boss, start over.
 */
function DemoMenu({
  onNewRider,
  onSimulateDelay,
  onFinalBoss,
}: {
  onNewRider: () => void
  onSimulateDelay: () => void
  onFinalBoss: () => void
}) {
  const demo = useDemoStation()
  const [open, setOpen] = useState(false)
  const here = DEMO_STATIONS.find((d) => d.slug === demo)
  const row = 'flex w-full items-center gap-2 px-2.5 py-1.5 text-left font-pixel text-[13px] hover:bg-[#F1E7CF] active:bg-[#E9DCC0]'
  const pick = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-8 items-center gap-1 border-2 border-ink bg-[#FBF3DF] px-2 font-pixel text-[12px] font-bold shadow-[2px_2px_0_#1B1F24] active:translate-x-px active:translate-y-px active:shadow-none"
      >
        🛠 Demo{here ? ` · ${here.label}` : ''} {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="absolute left-0 top-10 z-30 w-[220px] border-2 border-ink bg-[#FBF3DF] py-1 shadow-[3px_3px_0_rgba(27,31,36,0.85)]">
          <p className="px-2.5 pb-0.5 pt-1 font-pixel text-[10px] font-bold uppercase tracking-wide text-muted">Stand at</p>
          {DEMO_STATIONS.map((d) => (
            <button key={d.slug} type="button" onClick={pick(() => setDemoStation(demo === d.slug ? null : d.slug))} className={row}>
              <span className="h-3 w-3 border-2 border-ink" style={{ backgroundColor: LINES[d.line].color }} />
              {d.label}
              {demo === d.slug && <span className="ml-auto">✓</span>}
            </button>
          ))}
          <button type="button" onClick={pick(() => setDemoStation(null))} className={row}>
            📍 My real location{!demo && <span className="ml-auto">✓</span>}
          </button>
          <div className="my-1 border-t-2 border-ink/15" />
          <button type="button" onClick={pick(onSimulateDelay)} className={row}>
            ⚠️ Simulate delay
          </button>
          <button type="button" onClick={pick(onFinalBoss)} className={row}>
            ⚔️ Final boss
          </button>
          <button type="button" onClick={pick(onNewRider)} className={row}>
            ↺ New rider
          </button>
        </div>
      )}
    </div>
  )
}

/** The station the player is really at (phone location), or the demo station until located. */
function useHere() {
  const here = useMyStation()
  const saved = useDemoStation()
  // Ignore a demo station that no longer exists (an old saved id would crash every screen)
  const demo = saved && STATIONS.some((s) => s.id === saved) ? saved : null
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
  const { played, streak, gold, startEndBoss, startBoss, newRider } = useRun()
  const here = useHere()
  const [conductorOpen, setConductorOpen] = useState(false)
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
      {/* One compact row under the line chips: demo tools (dev / demo mode) and the Conductor */}
      <div className="absolute inset-x-4 top-[170px] z-20 flex items-start justify-between gap-2">
        {DEMO_MODE ? (
          <DemoMenu
            onNewRider={() => void newRider()}
            onSimulateDelay={() => {
              startBoss()
              router.push('/boss')
            }}
            onFinalBoss={() => {
              startEndBoss(true)
              router.push('/final-boss')
            }}
          />
        ) : (
          <span />
        )}
        {/* The Conductor: a Mastra agent on Gemini that checks live trains and Tiger Data for you */}
        <button
          type="button"
          onClick={() => setConductorOpen(true)}
          className="flex h-8 items-center gap-1 border-2 border-ink bg-[#1B1F24] px-2 font-pixel text-[12px] font-bold text-[#FFD23F] shadow-[2px_2px_0_rgba(27,31,36,0.85)] active:translate-x-px active:translate-y-px active:shadow-none"
        >
          💬 Conductor
        </button>
      </div>
      {conductorOpen && <ConductorChat stationId={here.id} onClose={() => setConductorOpen(false)} />}
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
  return (
    <>
      {/* Demo triggers (Simulate delay, Final boss) live in the "Demo" menu in MapLayer. */}
      <MapLayer />
      <HomeIndicator />
    </>
  )
}

export function EndBossView() {
  const router = useRouter()
  const { runId, endBossHp, equipped, owned, refresh } = useRun()
  const here = useHere()
  // Your line's End Boss (chapter ids are the line ids: red, green, orange).
  const line = stationById(here.id).lines[0]
  const demo = endBossHp < END_BOSS.hp
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
        line={line}
        maxHp={endBossHp}
        stats={stats}
        onResult={(r) => {
          // Saved on the server: a first win marks the line's boss defeated (+2500, badge).
          void fetch('/api/final-boss/result', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ chapterId: line, won: r.won, demo }),
          })
            .catch(() => null)
            .then(refresh)
        }}
        onExit={() => {
          void refresh()
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

// The trivia fight (DelayBoss, the shared server boss) is out of the rotation for now: a delay is
// Signal Repair or Platform Dodge, 50/50. Put 'trivia' back in this list to bring it back.
const DELAY_FIGHTS: ('trivia' | DelayGameKind)[] = ['signal', 'dodge']

/**
 * Gemini's name and taunt for the live Delay Boss on this line (GET /api/boss/persona).
 * In demo mode, "Simulate delay" makes sure a server boss exists first, as the quiz fight does.
 */
function useBossPersona(line: 'Red' | 'Green' | 'Orange', ready: boolean) {
  const [persona, setPersona] = useState<{ name: string; taunt: string } | null>(null)
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!ready) return
    let alive = true
    void (async () => {
      if (DEMO_MODE) {
        await fetch('/api/boss/simulate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ line }),
        }).catch(() => null)
      }
      const r = await fetch(`/api/boss/persona?line=${line}`).then((x) => x.json()).catch(() => null)
      if (!alive) return
      if (r?.ok) setPersona({ name: r.data.name, taunt: r.data.taunt })
      setDone(true)
    })()
    return () => {
      alive = false
    }
  }, [line, ready])
  return { persona, done }
}

export function BossView() {
  const router = useRouter()
  const { runId, bossIndex, gold, played, streak, refresh, addGold } = useRun()
  const here = useHere()
  // Each delay is a coin flip between the fights (picked once per run, so it doesn't change mid-fight)
  const kind = DELAY_FIGHTS[(runId * 7 + bossIndex * 3 + 1) % DELAY_FIGHTS.length]
  // Only the trivia fight uses the shared server boss (and starts a simulated one in demo mode)
  const { live, status } = useLiveDelayBoss(here.id, here.settled && kind === 'trivia')
  const { persona, done: personaDone } = useBossPersona(TEAM_OF[stationById(here.id).lines[0]], here.settled)
  if (!personaDone) return <div className="absolute inset-0 tex-leather" />
  if (kind !== 'trivia') {
    return (
      <>
        <DelayGame
          key={runId}
          persona={persona}
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
        live={live ? { ...live, name: persona?.name, taunt: persona?.taunt } : undefined}
        insight={<DelayChart line={TEAM_OF[stationById(here.id).lines[0]]} />}
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
      ) : isSlideGame(id) ? (
        <SlideGame key={runId} {...props} />
      ) : isLionGame(id) ? (
        <LionGame key={runId} {...props} />
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
