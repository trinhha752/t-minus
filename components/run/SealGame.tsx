'use client'

// Don't Step on the Seal (BU Central): a floor-is-lava crossing of Marsh Plaza at rush hour.
//
// Cross the plaza from the School of Theology side (left) to the CAS side (right), one tile at
// a time, before the clock runs out. Comm Ave runs along the bottom. Students and scooters
// stream up and down the plaza across your path; one that hits you stuns you for a moment and
// shoves you a tile. The BU seal sits right in your way, and it's lava: BU legend says if you
// step on it you won't graduate in four years, so touching it (or getting shoved onto it) loses.

import { useEffect, useRef, useState } from 'react'
import { AlarmClock, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Map as MapIcon, RotateCcw, Skull, Timer, X, Zap } from 'lucide-react'
import { LINES, type Station } from './stations'
import { Coin } from './fantasy'
import { LANDMARK_INFO } from './landmarks'
import type { GameResult } from './GameFrame'
import { NUM, PANEL, PixelScreen } from './pixel'
import { StatusBar } from './ui'

export const SEAL_GAME = { title: "Don't Step on the Seal", genre: 'Floor is lava', time: '~15 sec' }

// ---------- Board ----------

const COLS = 9
const ROWS = 12
const T = 40 // tile size in CSS pixels
const U = 4 // one art pixel
const BW = COLS * T
const BH = ROWS * T

/** Seconds to get across. */
const TIME = 9
/** How long a hit stops you, and how long after that before you can be hit again. */
const STUN_MS = 700
const SAFE_MS = 600

/** Comm Ave takes the bottom two rows: you can't walk on the road. */
const ROAD = 10
/** You start on the Theology side (column 0) level with the seal, which sits right in your way. */
const START = { x: 0, y: 4 }
const isSeal = (x: number, y: number) => x >= 3 && x <= 5 && y >= 3 && y <= 5
const walkable = (x: number, y: number) => x >= 0 && x < COLS && y >= 0 && y < ROAD

/** Who walks the plaza: [column, direction (1 = down), speed in tiles/sec, how many, scooters?] */
const LANES: [number, 1 | -1, number, number, boolean?][] = [
  [1, 1, 1.3, 2],
  [2, -1, 2.8, 1, true],
  [3, 1, 1.4, 2],
  [4, -1, 1.6, 1],
  [5, 1, 1.5, 2],
  [6, -1, 3, 1, true],
  [7, 1, 1.4, 2],
]

/** Gold: 100 for making it plus 15 per second left on the clock, up to 240. Losing pays nothing. */
const goldFor = (outcome: Outcome, secondsLeft: number) => (outcome === 'clean' ? Math.min(240, 100 + Math.floor(secondsLeft) * 15) : 0)

/** clean: made it across. seal: touched the seal. late: the clock ran out. */
type Outcome = 'clean' | 'seal' | 'late'
type Result = { outcome: Outcome; gold: number; secs: number; hits: number }
type Phase = 'intro' | 'play' | 'done'

type Walker = { col: number; y: number; dir: 1 | -1; speed: number; scooter: boolean; shirt: string; hair: string; skin: string }
type Game = {
  px: number
  py: number
  /** Drawn position, eased toward px/py so hops look smooth. */
  dx: number
  dy: number
  walkers: Walker[]
  start: number
  shownLeft: number | null
  stunUntil: number
  safeUntil: number
  hits: number
  over: boolean
}

const SHIRTS = ['#CC0000', '#F6EEDC', '#2F6FD1', '#2F8A4A', '#7B3FC4', '#1B1F24', '#CC0000']
const HAIRS = ['#2B1D14', '#6B4423', '#E3C16F', '#1B1F24', '#A0522D']
const SKINS = ['#F1C9A5', '#C68E62', '#8D5A3B', '#F6D7B8']
const pick = <V,>(list: V[]) => list[Math.floor(Math.random() * list.length)]

function newGame(): Game {
  const walkers: Walker[] = []
  for (const [col, dir, speed, count, scooter = false] of LANES) {
    const gap = (ROAD + 1) / count
    const offset = Math.random() * gap
    for (let i = 0; i < count; i++) {
      walkers.push({
        col,
        y: -1 + offset + i * gap + (Math.random() - 0.5) * gap * 0.4,
        dir,
        speed: speed * (0.9 + Math.random() * 0.2),
        scooter,
        shirt: pick(SHIRTS),
        hair: pick(HAIRS),
        skin: pick(SKINS),
      })
    }
  }
  return { px: START.x, py: START.y, dx: START.x, dy: START.y, walkers, start: 0, shownLeft: null, stunUntil: 0, safeUntil: 0, hits: 0, over: false }
}

// ---------- Game ----------

export function SealGame({
  station,
  onFinish,
  onPlayAgain,
  onMap,
}: {
  station: Station
  seed: number
  onFinish: (r: GameResult) => void
  onPlayAgain: () => void
  onMap: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<Phase>('intro')
  const [result, setResult] = useState<Result | null>(null)
  const [timeLeft, setTimeLeft] = useState(TIME)
  const [hits, setHits] = useState(0)
  const [status, setStatus] = useState("Get to class in CAS. Don't step on the seal!")
  const game = useRef<Game | null>(null)
  const phaseRef = useRef<Phase>('intro')
  const swipe = useRef<{ x: number; y: number } | null>(null)

  const go = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  useEffect(() => {
    game.current = newGame()
  }, [])

  const end = (outcome: Outcome) => {
    const g = game.current
    if (!g || g.over) return
    g.over = true
    const secs = (performance.now() - g.start) / 1000
    const r = { outcome, gold: goldFor(outcome, TIME - secs), secs, hits: g.hits }
    setResult(r)
    setStatus(outcome === 'clean' ? 'Made it to class on time!' : outcome === 'seal' ? 'You stepped on the seal!' : 'Too slow. Late for class!')
    onFinish({ correctCount: outcome === 'clean' ? 1 : 0, rounds: 1, points: r.gold, score: r.gold, secondsUsed: Math.round(secs) })
    // A short beat so you see where you ended up before the results card
    window.setTimeout(() => go('done'), 700)
  }

  /** After landing on a tile: the seal loses the game; the far door wins it. */
  const landed = () => {
    const g = game.current!
    if (isSeal(g.px, g.py)) end('seal')
    else if (g.px === COLS - 1) end('clean')
  }

  const move = (mx: number, my: number) => {
    const g = game.current
    if (phaseRef.current !== 'play' || !g || g.over || performance.now() < g.stunUntil) return
    const nx = g.px + mx
    const ny = g.py + my
    if (!walkable(nx, ny)) return
    g.px = nx
    g.py = ny
    landed()
  }
  // Read through refs so the key and animation listeners never go stale
  const moveRef = useRef(move)
  const landedRef = useRef(landed)
  const endRef = useRef(end)
  useEffect(() => {
    moveRef.current = move
    landedRef.current = landed
    endRef.current = end
  })

  // Keyboard: arrows or WASD
  useEffect(() => {
    const keys: Record<string, [number, number]> = {
      ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0],
    }
    const onKey = (e: KeyboardEvent) => {
      const k = keys[e.key]
      if (!k) return
      e.preventDefault()
      moveRef.current(k[0], k[1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Animation loop: walkers, hits, the clock, and drawing
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = BW * dpr
    canvas.height = BH * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.imageSmoothingEnabled = false
    const font = getComputedStyle(canvas).getPropertyValue('--font-pixelify').trim() || 'monospace'
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const g = game.current
      const p = phaseRef.current
      if (g) {
        if (!g.over) {
          for (const w of g.walkers) {
            w.y += w.dir * w.speed * dt
            // Students stay on the plaza: they walk off at the curb and come back from the top
            if (w.y > ROAD) w.y -= ROAD + 1
            if (w.y < -1) w.y += ROAD + 1
          }
        }
        if (p === 'play' && !g.over) {
          // Hit by a student: stunned for a moment and shoved one tile their way (or back a column)
          if (now > g.safeUntil) {
            const hit = g.walkers.find((w) => w.col === g.px && Math.abs(w.y - g.py) < 0.7)
            if (hit) {
              g.stunUntil = now + STUN_MS
              g.safeUntil = now + STUN_MS + SAFE_MS
              g.hits += 1
              setHits(g.hits)
              if (walkable(g.px, g.py + hit.dir)) g.py += hit.dir
              else if (walkable(g.px - 1, g.py)) g.px -= 1
              landedRef.current()
            }
          }
          if (!g.over) {
            const left = Math.ceil(TIME - (now - g.start) / 1000)
            if (left <= 0) {
              setTimeLeft(0)
              endRef.current('late')
            } else if (left !== g.shownLeft) {
              g.shownLeft = left
              setTimeLeft(left)
            }
          }
        }
        const ease = Math.min(1, dt * 18)
        g.dx += (g.px - g.dx) * ease
        g.dy += (g.py - g.dy) * ease
        draw(ctx, now / 1000, g, p, font)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const start = () => {
    const g = game.current
    if (!g) return
    g.start = performance.now()
    g.safeUntil = g.start + 400
    g.shownLeft = TIME
    setTimeLeft(TIME)
    setStatus("Get to class in CAS. Don't step on the seal!")
    go('play')
  }

  const hurry = phase === 'play' && timeLeft <= 3

  return (
    <PixelScreen>
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
          <h1 className="truncate font-pixel text-[19px] font-bold leading-tight">Don&apos;t Step on the Seal</h1>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink bg-[#E0461B] text-white" aria-hidden>
          <Skull size={16} strokeWidth={2.6} />
        </span>
      </header>

      {/* Stats */}
      <div className="absolute inset-x-4 top-[124px] z-10 flex gap-2 font-pixel text-[14px] font-bold">
        <span
          className={`flex h-9 flex-1 items-center justify-center gap-1.5 border-2 border-ink shadow-[3px_3px_0_rgba(27,31,36,0.85)] ${hurry ? 'animate-pulse text-white' : ''}`}
          style={{ backgroundColor: hurry ? '#DA291C' : '#FBF3DF' }}
          aria-label={`${timeLeft} seconds until class`}
        >
          <Timer size={15} strokeWidth={2.8} />
          <span className={NUM}>{timeLeft}s</span>
        </span>
        <span
          className="flex h-9 flex-1 items-center justify-center gap-1.5 border-2 border-ink bg-[#FBF3DF] shadow-[3px_3px_0_rgba(27,31,36,0.85)]"
          aria-label={`Hit ${hits} times`}
        >
          <Zap size={15} strokeWidth={2.8} />
          Hits <span className={NUM}>{hits}</span>
        </span>
        <span className="flex h-9 flex-1 items-center justify-center gap-1.5 border-2 border-ink bg-[#FBF3DF] shadow-[3px_3px_0_rgba(27,31,36,0.85)]">
          <Coin size={17} />
          <span className={NUM}>{result?.gold ?? 0}</span>
        </span>
      </div>

      {/* Where you're headed */}
      <p
        className="absolute inset-x-4 top-[166px] flex items-center justify-center gap-1.5 font-pixel text-[16px] font-bold leading-none"
        style={{ color: hurry ? '#FF8A7A' : '#FBF3DF' }}
      >
        Get to class on time! <ArrowRight size={16} strokeWidth={3.2} />
      </p>
      <p className="sr-only" aria-live="polite">
        {status}
      </p>

      {/* The plaza */}
      <div
        className="absolute left-4 top-[192px] border-[3px] border-ink shadow-[4px_4px_0_rgba(15,19,24,0.7)]"
        style={{ width: BW + 6, height: BH + 6 }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: BW, height: BH, touchAction: 'none' }}
          className="block [image-rendering:pixelated]"
          role="img"
          aria-label="Marsh Plaza, with Comm Ave along the bottom. Swipe or use the arrows to move. Cross from the Theology side on the left to the CAS side on the right; the seal is in the middle."
          onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
          onPointerUp={(e) => {
            const s = swipe.current
            swipe.current = null
            if (!s) return
            const ddx = e.clientX - s.x
            const ddy = e.clientY - s.y
            if (Math.max(Math.abs(ddx), Math.abs(ddy)) < 18) return
            if (Math.abs(ddx) > Math.abs(ddy)) move(Math.sign(ddx), 0)
            else move(0, Math.sign(ddy))
          }}
        />

        {phase === 'intro' && (
          <div className="absolute inset-0 flex animate-fade-in items-center justify-center bg-[#0F1318]/45 px-6">
            <div className={`w-full animate-pop p-4 text-center ${PANEL}`}>
              <p className="font-pixel text-[12px] font-bold tracking-[0.1em] text-muted">CLASS STARTS IN {TIME} SECONDS</p>
              <p className="font-pixel text-[25px] font-bold leading-tight">Don&apos;t be late!</p>
              <p className="mt-1.5 text-[13px] leading-snug text-ink-soft">
                Your class is in CAS and you&apos;re coming from Theology. Cut across Marsh Plaza before the bell, but never step on the
                seal. Bump into anyone and you lose precious seconds.
              </p>
              <button
                type="button"
                onClick={start}
                autoFocus
                className="mt-3 flex h-12 w-full items-center justify-center border-[3px] border-ink font-pixel text-[17px] font-bold text-white shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                style={{ backgroundColor: '#CC0000' }}
              >
                Go!
              </button>
            </div>
          </div>
        )}
      </div>

      {/* D-pad */}
      <div className="absolute left-1/2 top-[686px] grid -translate-x-1/2 grid-cols-3 gap-1.5" aria-label="Move">
        <span />
        <Pad label="Up" onPress={() => move(0, -1)}>
          <ArrowUp size={24} strokeWidth={3} />
        </Pad>
        <span />
        <Pad label="Left" onPress={() => move(-1, 0)}>
          <ArrowLeft size={24} strokeWidth={3} />
        </Pad>
        <Pad label="Down" onPress={() => move(0, 1)}>
          <ArrowDown size={24} strokeWidth={3} />
        </Pad>
        <Pad label="Right" onPress={() => move(1, 0)}>
          <ArrowRight size={24} strokeWidth={3} />
        </Pad>
      </div>

      {phase === 'done' && result && <Results station={station} result={result} onPlayAgain={onPlayAgain} onMap={onMap} />}
    </PixelScreen>
  )
}

function Pad({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      // pointerdown so quick taps register without waiting for click
      onPointerDown={(e) => {
        e.preventDefault()
        onPress()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onPress()
        }
      }}
      className="flex h-[50px] w-[70px] touch-none select-none items-center justify-center border-[3px] border-ink bg-[#FBF3DF] shadow-[3px_3px_0_rgba(15,19,24,0.7)] active:translate-x-[2px] active:translate-y-[2px] active:bg-[#F1E7CF] active:shadow-none"
    >
      {children}
    </button>
  )
}

function Results({ station, result, onPlayAgain, onMap }: { station: Station; result: Result; onPlayAgain: () => void; onMap: () => void }) {
  const line = LINES[station.lines[0]]
  const info = LANDMARK_INFO[station.id]
  const won = result.outcome === 'clean'
  return (
    <div className="absolute inset-0 z-30 flex animate-fade-in items-center justify-center bg-[#0F1318]/70 px-5">
      <div role="dialog" aria-modal="true" aria-labelledby="seal-done" className={`w-full animate-pop p-4 ${PANEL}`}>
        {info && (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element -- small local photos, no optimizer needed */}
            <img src={info.photo.src} alt={info.name} className="h-[110px] w-full border-[3px] border-ink object-cover" />
            <figcaption className="mt-0.5 truncate text-right text-[9.5px] text-muted">{info.photo.credit}</figcaption>
          </figure>
        )}
        <div className="mt-2 flex items-center justify-center gap-2.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center border-[3px] border-ink text-white"
            style={{ backgroundColor: won ? '#2F7A4A' : '#8C3A30' }}
          >
            {won ? <Check size={22} strokeWidth={3.5} /> : result.outcome === 'seal' ? <Skull size={20} strokeWidth={2.8} /> : <AlarmClock size={20} strokeWidth={2.8} />}
          </span>
          <h2 id="seal-done" className="font-pixel text-[26px] font-bold leading-none">
            {won ? 'On time for class!' : result.outcome === 'seal' ? 'Stepped on the seal!' : 'Late for class!'}
          </h2>
        </div>
        <p className="mt-1.5 text-center text-[13px] leading-snug text-ink-soft">
          {won
            ? 'You slid into your seat in CAS just in time, and never touched the seal.'
            : result.outcome === 'seal'
              ? 'Legend says you won’t graduate in four years now.'
              : 'Class started without you. The professor noticed.'}
        </p>
        <p className="mt-1 text-center text-[13px] font-semibold text-muted">
          <span className={NUM}>{result.secs.toFixed(1)}s</span> · <span className={NUM}>{result.hits}</span> {result.hits === 1 ? 'hit' : 'hits'}
        </p>

        <div className="mt-3 flex items-center justify-center gap-2 border-2 border-ink bg-[#FFE7A3] py-2">
          <Coin size={24} />
          <span className={`text-[24px] text-[#7A4D0E] ${NUM}`}>+{result.gold}</span>
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
            autoFocus
            className="flex h-12 flex-1 items-center justify-center gap-1.5 border-[3px] border-ink bg-[#F1E7CF] font-pixel text-[16px] font-bold shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <RotateCcw size={17} strokeWidth={2.8} />
            {won ? 'Play again' : 'Try again'}
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

// ---------- Drawing ----------

type Ctx = CanvasRenderingContext2D

/** Draw a sprite given as rows of palette letters ('.' is see-through), one letter per art pixel. */
function sprite(ctx: Ctx, rows: string[], pal: Record<string, string>, x: number, y: number) {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const col = pal[rows[r][c]]
      if (!col) continue
      ctx.fillStyle = col
      ctx.fillRect(x + c * U, y + r * U, U, U)
    }
  }
}

const PERSON = ['...hhhh...', '..hhhhhh..', '..hesseh..', '...ssss...', '..cccccc..', '.bcccccc..', '.bcccccc..', '..cccccc..']
const LEGS_A = ['..pp..pp..', '..kk..kk..']
const LEGS_B = ['...pppp...', '...kkkk...']
const SCOOTER = ['....pp....', '.kggggggk.']

const hash = (a: number, b: number) => {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function drawBricks(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = '#B5573F'
  ctx.fillRect(x, y, T, T)
  ctx.fillStyle = '#9A4632'
  ctx.fillRect(x, y, T, 2)
  ctx.fillRect(x, y + T / 2, T, 2)
  const off = (y / T) % 2 ? 0 : T / 2
  ctx.fillRect(x + off, y, 2, T / 2)
  ctx.fillRect(x + ((off + T / 2) % T), y + T / 2, 2, T / 2)
  if (hash(x, y) > 0.7) {
    ctx.fillStyle = '#C26650'
    ctx.fillRect(x + 4, y + 4, 14, 12)
  }
}

/** Comm Ave along the bottom: a sidewalk curb, a car lane, and the Green Line B tracks. */
function drawRoad(ctx: Ctx, t: number) {
  const y0 = ROAD * T
  ctx.fillStyle = '#CFC9BD'
  ctx.fillRect(0, y0, BW, 6)
  ctx.fillStyle = '#9C968A'
  ctx.fillRect(0, y0 + 6, BW, 2)
  ctx.fillStyle = '#3B3F45'
  ctx.fillRect(0, y0 + 8, BW, 2 * T - 8)
  // Dashed lane line
  ctx.fillStyle = '#F2D16B'
  for (let x = ((t * 30) % 24) - 24; x < BW; x += 24) ctx.fillRect(x, y0 + T + 2, 12, 2)
  // B line tracks
  ctx.fillStyle = '#6E655A'
  for (let x = 0; x < BW; x += 8) ctx.fillRect(x, y0 + T + 10, 4, 24)
  ctx.fillStyle = '#A8A8A8'
  ctx.fillRect(0, y0 + T + 14, BW, 2)
  ctx.fillRect(0, y0 + T + 28, BW, 2)
  // Cars heading east
  const CARS = ['#CC0000', '#2F6FD1', '#F6EEDC', '#2F8A4A']
  for (let i = 0; i < 3; i++) {
    const cx = ((t * 55 + i * 150) % (BW + 120)) - 60
    const cy = y0 + 12
    ctx.fillStyle = '#1B1F24'
    ctx.fillRect(cx - 1, cy - 1, 46, 22)
    ctx.fillStyle = CARS[i % CARS.length]
    ctx.fillRect(cx, cy, 44, 20)
    ctx.fillStyle = '#9FD3F5'
    ctx.fillRect(cx + 26, cy + 3, 10, 14)
    ctx.fillStyle = '#FFE38A'
    ctx.fillRect(cx + 41, cy + 2, 3, 4)
    ctx.fillRect(cx + 41, cy + 14, 3, 4)
  }
  // A Green Line B trolley rolling west now and then
  const tx = BW + 40 - ((t * 70) % (BW * 3))
  if (tx > -160 && tx < BW) {
    const ty = y0 + T + 6
    ctx.fillStyle = '#1B1F24'
    ctx.fillRect(tx - 1, ty - 1, 142, 30)
    ctx.fillStyle = '#00843D'
    ctx.fillRect(tx, ty, 140, 28)
    ctx.fillStyle = '#F6EEDC'
    ctx.fillRect(tx, ty + 18, 140, 3)
    ctx.fillStyle = '#9FD3F5'
    for (let wx = tx + 8; wx < tx + 132; wx += 16) ctx.fillRect(wx, ty + 5, 10, 10)
  }
}

/** BU's arms as set into Marsh Plaza: a white shield with a red cross and three gold crowns. */
const SHIELD = [
  'kkkkkkkkkkkkkk',
  'kwwwwwrrwwwwwk',
  'kwwwywyywywwwk',
  'kwwwyyyyyywwwk',
  'kwwwwwrrwwwwwk',
  'kwwwwwrrwwwwwk',
  'krrryryyryrrrk',
  'krrryyyyyyrrrk',
  'kwwwwwrrwwwwwk',
  'kwwwwwrrwwwwwk',
  'kwwwywyywywwwk',
  'kwwwyyyyyywwwk',
  '.kwwwwrrwwwwk.',
  '..kwwwrrwwwk..',
  '...kkwrrwkk...',
  '.....kkkk.....',
]

/** The seal: a bronze disc in a granite ring with lettering around the edge and the shield in
 *  the middle. It's lava in this game, so its rim glows molten. Covers tiles x 3-5, y 3-5. */
function drawSeal(ctx: Ctx, t: number) {
  const x0 = 3 * T
  const y0 = 3 * T
  const n = (3 * T) / U // 30 art pixels across
  const LAVA = ['#C8341A', '#E0461B', '#F26B1D', '#FF9A2E']
  const pulse = 0.5 + 0.5 * Math.sin(t * 3)
  ctx.fillStyle = `rgba(255, 90, 20, ${0.12 + 0.18 * pulse})`
  ctx.fillRect(x0 - 6, y0 - 6, 3 * T + 12, 3 * T + 12)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const ox = i + 0.5 - n / 2
      const oy = j + 0.5 - n / 2
      const d = Math.hypot(ox, oy)
      if (d > n / 2) continue
      const a = Math.atan2(oy, ox)
      let c: string
      if (d > 14) c = LAVA[Math.floor((Math.sin(a * 5 + t * 4) + 1) * 1.99)]
      else if (d > 12.5) c = '#B3ADA1'
      else if (d > 10.5) {
        // Lettering around the ring: BOSTON UNIVERSITY / 1839
        const bucket = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 44)
        c = d > 11 && d < 12.2 && bucket % 4 !== 3 ? '#D9B566' : '#6B4A1E'
      } else c = (i + j) % 7 === 0 ? '#BE9145' : '#A8782E'
      ctx.fillStyle = c
      ctx.fillRect(x0 + i * U, y0 + j * U, U, U)
    }
  }
  sprite(ctx, SHIELD, { k: '#3A2A12', w: '#F6EEDC', r: '#CC0000', y: '#F2C94C' }, x0 + 8 * U, y0 + 7 * U)
}

/** A sign on the ground along one edge, just below where you start: THEOLOGY behind you, CAS ahead. */
function drawSign(ctx: Ctx, col: number, text: string, goal: boolean, t: number, font: string) {
  const cx = col * T + T / 2
  const cy = 6.5 * T
  ctx.save()
  ctx.font = `bold 17px ${font}`
  const w = ctx.measureText(text).width + 20
  ctx.translate(cx, cy)
  ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(-w / 2 - 3, -16, w + 6, 32)
  ctx.fillStyle = goal ? `rgb(245, ${190 + Math.round(25 * Math.sin(t * 5))}, 66)` : '#FBF3DF'
  ctx.fillRect(-w / 2, -13, w, 26)
  ctx.fillStyle = '#1B1F24'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 0, 1)
  ctx.restore()
}

function draw(ctx: Ctx, t: number, g: Game, phase: Phase, font: string) {
  for (let y = 0; y < ROAD; y++) for (let x = 0; x < COLS; x++) drawBricks(ctx, x * T, y * T)
  drawRoad(ctx, t)
  drawSeal(ctx, t)
  drawSign(ctx, 0, 'THEOLOGY', false, t, font)
  drawSign(ctx, COLS - 1, 'CAS', true, t, font)

  // Students, sorted so those lower on the screen draw on top, kept off the road
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, BW, ROAD * T)
  ctx.clip()
  for (const w of [...g.walkers].sort((a, b) => a.y - b.y)) {
    const legs = w.scooter ? SCOOTER : Math.floor(t * 6 + w.y * 3) % 2 ? LEGS_A : LEGS_B
    const pal = { h: w.hair, s: w.skin, e: '#1B1F24', c: w.shirt, b: '#3A3A3A', p: '#2B3A55', k: '#1B1F24', g: '#8C99A8' }
    sprite(ctx, [...PERSON, ...legs], pal, w.col * T, w.y * T)
  }
  ctx.restore()


  // You: gold hoodie
  const px = g.dx * T
  const py = g.dy * T
  const stunned = performance.now() < g.stunUntil
  const bob = phase === 'play' && !stunned ? Math.round(Math.sin(t * 8)) : 0
  sprite(ctx, [...PERSON, ...LEGS_B], { h: '#1B1F24', s: '#F1C9A5', e: '#1B1F24', c: '#F2B233', b: '#C0392B', p: '#2B3A55', k: '#1B1F24' }, px, py + bob)
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(px + 14, py + 18 + bob, 12, 2) // hoodie pocket
  // Stunned: dizzy stars circling your head
  if (stunned) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.fillRect(px - 2, py - 2, T + 4, T + 4)
    for (let i = 0; i < 3; i++) {
      const a = t * 9 + (i * Math.PI * 2) / 3
      const sx = Math.round(px + T / 2 - 4 + Math.cos(a) * 14)
      const sy = Math.round(py - 2 + Math.sin(a) * 5)
      ctx.fillStyle = '#1B1F24'
      ctx.fillRect(sx - 1, sy - 1, 10, 10)
      ctx.fillStyle = '#FFD24A'
      ctx.fillRect(sx + 3, sy, 2, 8)
      ctx.fillRect(sx, sy + 3, 8, 2)
      ctx.fillRect(sx + 2, sy + 2, 4, 4)
    }
  }
}
