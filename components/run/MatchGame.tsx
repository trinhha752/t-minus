'use client'

// Landmark Match: a quick pixel memory game. Eight cards, four pairs. Each pair is a station's
// pixel landmark (the same sprite as on the map) and that station's name. The cards show for a
// few seconds, flip face down, then you turn two at a time to find the pairs.
//
// The four stations are this one and its three nearest neighbors on the same track, so riders
// learn the landmarks around where they actually are.

import { useEffect, useRef, useState } from 'react'
import { Check, Map as MapIcon, RotateCcw, Timer, X } from 'lucide-react'
import { LINES, STATIONS, TRACKS, type Station } from './stations'
import { BASE_PAL, LANDMARKS, STATION, type Sprite } from './pixelSprites'
import { Coin } from './fantasy'
import { LANDMARK_INFO } from './landmarks'
import type { GameResult } from './GameFrame'
import { StatusBar } from './ui'

export const MATCH_GAME = { title: 'Landmark Match', genre: 'Memory', time: '~45 sec' }

const PAIRS = 4
const PEEK_MS = 5000 // how long every card shows at the start
const MISMATCH_MS = 1000 // how long a wrong pair stays face up

// Pixel HUD look, matching the map: square corners, dark outline, hard drop shadow.
const PANEL = 'border-[3px] border-ink bg-[#FBF3DF] shadow-[4px_4px_0_rgba(27,31,36,0.85)]'

const byId = new Map(STATIONS.map((s) => [s.id, s]))

/** Small seeded random numbers, so a round is the same on the server and in the browser. */
function rng(seed: string) {
  let h = 1779033703
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

function shuffle<T>(list: T[], rand: () => number) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** This station plus its nearest neighbors by stops along the tracks, walking through
 *  junctions (Fenway's short D-branch stub continues on past Kenmore). */
function pickStations(station: Station): Station[] {
  const next = new Map<string, Set<string>>()
  const link = (a: string, b: string) => next.set(a, (next.get(a) ?? new Set()).add(b))
  for (const t of TRACKS)
    t.ids.forEach((id, j) => {
      if (j > 0) {
        link(id, t.ids[j - 1])
        link(t.ids[j - 1], id)
      }
    })
  const picked: string[] = []
  let ring = [station.id]
  const seen = new Set(ring)
  while (picked.length < PAIRS - 1 && ring.length) {
    const out = [...new Set(ring.flatMap((id) => [...(next.get(id) ?? [])]))].filter((id) => !seen.has(id)).sort()
    out.forEach((id) => seen.add(id))
    picked.push(...out.slice(0, PAIRS - 1 - picked.length))
    ring = out
  }
  return [station, ...picked.map((id) => byId.get(id)!)]
}

type Card = { key: string; pair: string; kind: 'pic' | 'name' }

function deal(station: Station, seed: string): Card[] {
  const cards = pickStations(station).flatMap((s): Card[] => [
    { key: `${s.id}-pic`, pair: s.id, kind: 'pic' },
    { key: `${s.id}-name`, pair: s.id, kind: 'name' },
  ])
  return shuffle(cards, rng(seed))
}

/** Gold: 40 per pair, plus a bonus for few misses. */
const goldFor = (misses: number) => PAIRS * 40 + ([80, 50, 25][misses] ?? 0)

// ---------- Pixel art ----------

export function PixelSprite({ sprite, scale, extra }: { sprite: Sprite; scale: number; extra?: Record<string, string> }) {
  const pal = { ...BASE_PAL, ...sprite.pal, ...extra }
  const w = sprite.rows[0].length
  const h = sprite.rows.length
  return (
    <svg width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden>
      {sprite.rows.flatMap((row, y) =>
        [...row].map((c, x) => (pal[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={pal[c]} /> : null)),
      )}
    </svg>
  )
}

/** The card back: line-color checker with a little pixel train. */
function CardBack({ color, dark }: { color: string; dark: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center border-[3px] border-ink"
      style={{
        backgroundColor: color,
        backgroundImage: `linear-gradient(45deg, ${dark} 25%, transparent 25%, transparent 75%, ${dark} 75%), linear-gradient(45deg, ${dark} 25%, transparent 25%, transparent 75%, ${dark} 75%)`,
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 8px 8px',
      }}
    >
      <span className="border-[3px] border-ink bg-[#FBF3DF] p-1.5 shadow-[3px_3px_0_rgba(27,31,36,0.85)]">
        <PixelSprite
          scale={3}
          sprite={{
            rows: ['.kkkkkkk.', 'kwwwwwwwk', 'kwbbwbbwk', 'kwbbwbbwk', 'kwwwwwwwk', 'kRRRRRRRk', '.kkkkkkk.', '..k...k..'],
            pal: { R: color },
          }}
        />
      </span>
    </div>
  )
}

function CardFace({ card, matched }: { card: Card; matched: boolean }) {
  const s = byId.get(card.pair)!
  const line = LINES[s.lines[0]]
  const border = matched ? 'border-[#F2B233]' : 'border-ink'
  if (card.kind === 'pic') {
    const photo = LANDMARK_INFO[s.id]?.photo
    return (
      <div className={`relative h-full w-full overflow-hidden border-[3px] bg-[#CFE7F5] ${border}`}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- small local photos, no optimizer needed
          <img src={photo.src} alt="" draggable={false} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-end justify-center pb-2">
            <PixelSprite sprite={LANDMARKS[s.id] ?? STATION} scale={4} extra={{ R: line.color, r: line.dark }} />
          </div>
        )}
        {matched && <MatchedBadge />}
      </div>
    )
  }
  const name = (s.label.text ?? s.name).replace('\n', ' ')
  return (
    <div className={`relative flex h-full w-full flex-col overflow-hidden border-[3px] bg-[#FBF3DF] ${border}`}>
      <span
        className="flex h-[22px] items-center justify-center border-b-[3px] border-ink font-sans text-[11px] font-extrabold tracking-[0.1em] text-white"
        style={{ backgroundColor: line.color }}
      >
        {s.branch ? `${s.branch} BRANCH` : line.name.toUpperCase()}
      </span>
      <span className="flex flex-1 items-center justify-center px-2 text-center font-pixel text-[19px] font-bold leading-[1.05] text-ink">
        {name}
      </span>
      {matched && <MatchedBadge />}
    </div>
  )
}

function MatchedBadge() {
  return (
    <span className="absolute right-1 top-1 flex h-6 w-6 animate-pop items-center justify-center border-2 border-ink bg-[#F2B233] text-ink">
      <Check size={15} strokeWidth={3.5} />
    </span>
  )
}

// ---------- Game ----------

type Phase = 'peek' | 'play' | 'done'

export function MatchGame({
  station,
  seed,
  onFinish,
  onPlayAgain,
  onMap,
}: {
  station: Station
  /** Changes every play so the cards are dealt in a new order. */
  seed: number
  /** Called once when every pair is found (records the gold and the fact card). */
  onFinish: (r: GameResult) => void
  onPlayAgain: () => void
  onMap: () => void
}) {
  const line = LINES[station.lines[0]]
  const [cards] = useState(() => deal(station, `${station.id}:${seed}`))
  const [phase, setPhase] = useState<Phase>('peek')
  const [open, setOpen] = useState<number[]>([]) // indexes of face-up, unmatched cards
  const [matched, setMatched] = useState<Set<string>>(() => new Set())
  const [wrong, setWrong] = useState<number[]>([])
  const [misses, setMisses] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [peekLeft, setPeekLeft] = useState(PEEK_MS / 1000)
  const [said, setSaid] = useState('Memorize the cards.')
  /** The last matched station: its building's fact shows under the cards. */
  const [learned, setLearned] = useState<string | null>(null)
  const finished = useRef(false)

  // Peek: count down, then turn every card face down
  useEffect(() => {
    if (phase !== 'peek') return
    const t = window.setTimeout(() => {
      if (peekLeft > 1) return setPeekLeft(peekLeft - 1)
      setPhase('play')
      setSaid('Find the four pairs.')
    }, 1000)
    return () => window.clearTimeout(t)
  }, [phase, peekLeft])

  // Clock while playing
  useEffect(() => {
    if (phase !== 'play') return
    const t = window.setInterval(() => setSeconds((n) => n + 1), 1000)
    return () => window.clearInterval(t)
  }, [phase])

  const flip = (i: number) => {
    if (phase !== 'play' || open.includes(i) || matched.has(cards[i].pair) || open.length >= 2) return
    const next = [...open, i]
    setOpen(next)
    if (next.length < 2) return
    const [a, b] = next.map((k) => cards[k])
    if (a.pair === b.pair) {
      const done = new Set(matched).add(a.pair)
      setMatched(done)
      setOpen([])
      setLearned(a.pair)
      const info = LANDMARK_INFO[a.pair]
      setSaid(`Match! ${byId.get(a.pair)!.name}.${info ? ` ${info.name}: ${info.fact}` : ''}`)
      if (done.size === PAIRS && !finished.current) {
        finished.current = true
        const gold = goldFor(misses)
        onFinish({ correctCount: PAIRS, rounds: PAIRS, points: gold, score: gold, secondsUsed: seconds })
        window.setTimeout(() => setPhase('done'), 600)
      }
    } else {
      setMisses((m) => m + 1)
      setWrong(next)
      setSaid('Not a pair.')
      window.setTimeout(() => {
        setOpen([])
        setWrong([])
      }, MISMATCH_MS)
    }
  }

  const describe = (c: Card) => {
    const s = byId.get(c.pair)!
    return c.kind === 'pic' ? `Photo: ${LANDMARK_INFO[s.id]?.name ?? s.name} (${s.name})` : `Name: ${s.name}`
  }

  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#2A3644]"
      style={{
        backgroundImage:
          'linear-gradient(45deg, #26313E 25%, transparent 25%, transparent 75%, #26313E 75%), linear-gradient(45deg, #26313E 25%, transparent 25%, transparent 75%, #26313E 75%)',
        backgroundSize: '24px 24px',
        backgroundPosition: '0 0, 12px 12px',
      }}
    >
      <StatusBar tone="light" />

      {/* Header */}
      <header className={`absolute inset-x-4 top-[56px] z-10 flex h-[56px] items-center gap-2 pl-1.5 pr-3 ${PANEL}`}>
        <button
          type="button"
          onClick={onMap}
          aria-label="Quit to map"
          className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-[#F1E7CF] active:translate-x-[1px] active:translate-y-[1px]"
        >
          <X size={20} strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-pixel text-[12px] leading-none text-muted">{station.name}</p>
          <h1 className="font-pixel text-[21px] font-bold leading-tight">Landmark Match</h1>
        </div>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink text-white"
          style={{ backgroundColor: line.color }}
          aria-hidden
        >
          <PixelSprite scale={2} sprite={{ rows: ['kkkkkkk', 'kwwwwwk', 'kwbwbwk', 'kwwwwwk', 'kkkkkkk'] }} />
        </span>
      </header>

      {/* Stats */}
      <div className="absolute inset-x-4 top-[126px] z-10 flex gap-2 font-pixel text-[15px] font-bold">
        <span className="flex h-9 flex-1 items-center justify-center gap-1.5 border-2 border-ink bg-[#FBF3DF] shadow-[3px_3px_0_rgba(27,31,36,0.85)]">
          Pairs <span className="font-sans font-extrabold tabular-nums">{matched.size}/{PAIRS}</span>
        </span>
        <span className="flex h-9 flex-1 items-center justify-center gap-1.5 border-2 border-ink bg-[#FBF3DF] shadow-[3px_3px_0_rgba(27,31,36,0.85)]">
          Misses <span className="font-sans font-extrabold tabular-nums">{misses}</span>
        </span>
        <span className="flex h-9 flex-1 items-center justify-center gap-1.5 border-2 border-ink bg-[#FBF3DF] shadow-[3px_3px_0_rgba(27,31,36,0.85)]">
          <Timer size={15} strokeWidth={2.8} />
          <span className="font-sans font-extrabold tabular-nums">{time}</span>
        </span>
      </div>

      {/* Banner: memorize countdown, then instructions */}
      <p className="absolute inset-x-4 top-[178px] z-10 text-center font-pixel text-[15px] font-bold text-[#FBF3DF]">
        {phase === 'peek' ? (
          <>
            Memorize! <span className="font-sans font-extrabold tabular-nums text-[#F2B233]">{peekLeft}</span>
          </>
        ) : (
          'Match each landmark to its station'
        )}
      </p>

      {/* Cards */}
      <div className="absolute inset-x-4 top-[210px] grid grid-cols-2 gap-x-3 gap-y-3">
        {cards.map((c, i) => {
          const isMatched = matched.has(c.pair)
          const up = phase !== 'play' || open.includes(i) || isMatched
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => flip(i)}
              disabled={phase !== 'play' || isMatched}
              aria-label={up ? describe(c) : `Card ${i + 1}, face down`}
              className={`relative h-[112px] [perspective:600px] ${wrong.includes(i) ? 'animate-shake' : ''}`}
            >
              <span
                className="absolute inset-0 shadow-[4px_4px_0_rgba(15,19,24,0.7)] transition-transform duration-300 motion-reduce:transition-none"
                style={{ transformStyle: 'preserve-3d', transform: up ? 'rotateY(180deg)' : 'none' }}
              >
                <span className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                  <CardBack color={line.color} dark={line.dark} />
                </span>
                <span className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                  <CardFace card={c} matched={isMatched} />
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Building fact: appears after each match */}
      <BuildingFact id={learned} />

      <p className="sr-only" aria-live="polite">
        {said}
      </p>

      {phase === 'done' && (
        <Results station={station} misses={misses} time={time} onPlayAgain={onPlayAgain} onMap={onMap} />
      )}
    </div>
  )
}

function BuildingFact({ id }: { id: string | null }) {
  const s = id ? byId.get(id) : undefined
  const info = id ? LANDMARK_INFO[id] : undefined
  if (!s || !info) {
    return (
      <p className="absolute inset-x-4 top-[712px] text-center font-pixel text-[13px] text-[#B9C3CE]">
        Match a pair to learn about the building
      </p>
    )
  }
  const line = LINES[s.lines[0]]
  return (
    <div key={id} className={`absolute inset-x-4 top-[706px] flex animate-pop items-start gap-3 p-2.5 ${PANEL}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small local photos, no optimizer needed */}
      <img src={info.photo.src} alt="" className="h-[60px] w-[72px] shrink-0 border-2 border-ink object-cover" />
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-pixel text-[15px] font-bold leading-tight">
          <span className="h-3 w-1.5 shrink-0" style={{ backgroundColor: line.color }} aria-hidden />
          {info.name}
        </p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{info.fact}</p>
        <p className="mt-0.5 truncate text-[9.5px] text-muted">{info.photo.credit}</p>
      </div>
    </div>
  )
}

function Results({
  station,
  misses,
  time,
  onPlayAgain,
  onMap,
}: {
  station: Station
  misses: number
  time: string
  onPlayAgain: () => void
  onMap: () => void
}) {
  const line = LINES[station.lines[0]]
  const gold = goldFor(misses)
  const verdict = misses === 0 ? 'Perfect memory!' : misses <= 2 ? 'Sharp eyes!' : 'All matched!'
  return (
    <div className="absolute inset-0 z-30 flex animate-fade-in items-center justify-center bg-[#0F1318]/70 px-5">
      <div role="dialog" aria-modal="true" aria-labelledby="match-done" className={`w-full animate-pop p-4 ${PANEL}`}>
        {LANDMARK_INFO[station.id] ? (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element -- small local photos, no optimizer needed */}
            <img
              src={LANDMARK_INFO[station.id].photo.src}
              alt={LANDMARK_INFO[station.id].name}
              className="h-[120px] w-full border-[3px] border-ink object-cover"
            />
            <figcaption className="mt-0.5 truncate text-right text-[9.5px] text-muted">
              {LANDMARK_INFO[station.id].photo.credit}
            </figcaption>
          </figure>
        ) : (
          <div className="flex justify-center">
            <PixelSprite sprite={LANDMARKS[station.id] ?? STATION} scale={5} extra={{ R: line.color, r: line.dark }} />
          </div>
        )}
        {LANDMARK_INFO[station.id] && (
          <div className="mt-2 text-center">
            <p className="font-pixel text-[14px] font-bold text-ink">{LANDMARK_INFO[station.id].name}</p>
            <p className="mx-auto mt-0.5 max-w-[290px] text-[12.5px] leading-snug text-ink-soft">
              {LANDMARK_INFO[station.id].fact}
            </p>
          </div>
        )}
        <h2 id="match-done" className="mt-3.5 text-center font-pixel text-[28px] font-bold leading-none">
          {verdict}
        </h2>
        <p className="mt-1.5 text-center font-sans text-[14px] font-semibold text-muted">
          {time} · {misses} {misses === 1 ? 'miss' : 'misses'}
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 border-2 border-ink bg-[#FFE7A3] py-2">
          <Coin size={24} />
          <span className="font-sans text-[24px] font-extrabold tabular-nums text-[#7A4D0E]">+{gold}</span>
          <span className="font-pixel text-[14px] text-[#7A4D0E]">gold</span>
        </div>

        <div className="mt-3 flex items-center gap-3 border-2 border-ink bg-white p-2.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink font-pixel text-[13px] font-bold text-white"
            style={{ backgroundColor: line.color }}
          >
            {String(station.fact.no).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <p className="font-pixel text-[12px] text-muted">Fact card unlocked</p>
            <p className="font-pixel text-[16px] font-bold leading-tight">{station.fact.title}</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 border-[3px] border-ink bg-[#F1E7CF] font-pixel text-[16px] font-bold shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <RotateCcw size={17} strokeWidth={2.8} />
            Play again
          </button>
          <button
            type="button"
            onClick={onMap}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 border-[3px] border-ink font-pixel text-[16px] font-bold text-white shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            style={{ backgroundColor: line.color }}
          >
            <MapIcon size={17} strokeWidth={2.8} />
            Map
          </button>
        </div>
      </div>
    </div>
  )
}
