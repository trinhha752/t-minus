'use client'

// Slide Sneak (Government Center): sneak across City Hall Plaza to ride the slide.
//
// You come up out of the T at the bottom of the plaza. The slide is up by City Hall, and the
// plaza's security guards say you're way too old for it. Move one tile at a time to reach the
// slide before the plaza closes. Each guard sees a cone of tiles ahead of it (shown in yellow);
// planters and benches block both their view and your path. Stand in a cone too long and the
// guard catches you; walk into a guard and you're caught on the spot.

import { useEffect, useRef, useState } from 'react'
import { AlarmClock, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Eye, Map as MapIcon, RotateCcw, Siren, Timer, X } from 'lucide-react'
import { LINES, type Station } from './stations'
import { Coin } from './fantasy'
import { LANDMARK_INFO } from './landmarks'
import type { GameResult } from './GameFrame'
import { NUM, PANEL, PixelScreen } from './pixel'
import { StatusBar } from './ui'

export const SLIDE_GAME = { title: 'Slide Sneak', genre: 'Stealth', time: '~45 sec' }

// ---------- Board ----------

const COLS = 9
const ROWS = 12
const T = 40 // tile size in CSS pixels
const BW = COLS * T
const BH = ROWS * T

/** Seconds before the plaza closes. */
const TIME = 45
/** How fast a guard's suspicion fills while you're in view (per second); 1 = caught. */
const SPOT_RATE = 1
const CALM_RATE = 1.6
/** Sneaking pace: at most one step this often. */
const STEP_MS = 130
/** How many tiles ahead a guard can see. */
const SIGHT = 3

/**
 * The plaza. # City Hall, H the grassy mound the slide sits on, G the slide's ladder (the goal),
 * P a planter, B a bench, S where you come up from the T. Everything else is brick.
 */
const MAP = [
  '######HHH',
  '######HHH',
  '......GHH',
  '.........',
  '.PP....P.',
  '.........',
  '...PP....',
  '.........',
  '.P....PP.',
  '.........',
  '..B...B..',
  '....S....',
]
const at = (x: number, y: number) => (x < 0 || y < 0 || x >= COLS || y >= ROWS ? '#' : MAP[y][x])
const blocked = (x: number, y: number) => '#HPB'.includes(at(x, y))
const START = { x: 4, y: 11 }
const GOAL = { x: 6, y: 2 }
/**
 * The slide seen from the side (canvas px): off the top of the tower, an enclosed tube up to
 * TUBE_END, then an open chute that drops, rolls over a hump and runs out onto the ground.
 */
const SLIDE_PATH: [number, number][] = [
  [282, 20],
  [298, 24],
  [314, 38],
  [326, 60],
  [336, 78],
  [344, 82],
  [350, 94],
  [358, 108],
]
const TUBE_END = 2

type Dir = [number, number]
/**
 * Patrollers walk back and forth along a row (axis x) or a column (axis y) and look where they're
 * going. Sentries stand still and turn through a list of directions.
 */
type GuardDef =
  | { kind: 'patrol'; axis: 'x' | 'y'; line: number; from: number; to: number; speed: number; start: number; dir: 1 | -1 }
  | { kind: 'sentry'; x: number; y: number; looks: Dir[]; every: number }
const GUARDS: GuardDef[] = [
  { kind: 'patrol', axis: 'x', line: 9, from: 0, to: 8, speed: 1.05, start: 1, dir: 1 },
  { kind: 'patrol', axis: 'x', line: 5, from: 0, to: 8, speed: 1.3, start: 7, dir: -1 },
  { kind: 'patrol', axis: 'y', line: 5, from: 3, to: 10, speed: 0.9, start: 7, dir: -1 },
  { kind: 'sentry', x: 3, y: 3, looks: [[1, 0], [0, 1], [-1, 0], [0, 1]], every: 2.4 },
]
/** Pause at the end of a patrol before turning around. */
const TURN_PAUSE = 0.5

type Guard = { def: GuardDef; x: number; y: number; face: Dir; pauseUntil: number; look: number; nextLook: number; sus: number }

/** clean: rode the slide. caught: security got you. late: the plaza closed. */
type Outcome = 'clean' | 'caught' | 'late'
type Result = { outcome: Outcome; gold: number; secs: number; spotted: number }
type Phase = 'intro' | 'play' | 'done'
type Game = {
  px: number
  py: number
  dx: number
  dy: number
  guards: Guard[]
  start: number
  nextStep: number
  shownLeft: number | null
  spotted: number
  wasSeen: boolean
  over: boolean
  outcome: Outcome | null
  endAt: number
  catcher: Guard | null
}

/** Gold: 100 for riding the slide plus 5 per second left, up to 240. Getting caught pays nothing. */
const goldFor = (outcome: Outcome, secondsLeft: number) => (outcome === 'clean' ? Math.min(240, 100 + Math.floor(secondsLeft) * 5) : 0)

function newGame(): Game {
  // Guards start near their usual spots, a little different each try
  const guards: Guard[] = GUARDS.map((def) => {
    if (def.kind === 'sentry') {
      const look = Math.floor(Math.random() * def.looks.length)
      return { def, x: def.x, y: def.y, face: def.looks[look], pauseUntil: 0, look, nextLook: 0, sus: 0 }
    }
    const pos = Math.max(def.from, Math.min(def.to, def.start + (Math.random() - 0.5) * 3))
    const dir = Math.random() < 0.25 ? -def.dir : def.dir
    return def.axis === 'x'
      ? { def, x: pos, y: def.line, face: [dir, 0], pauseUntil: 0, look: 0, nextLook: 0, sus: 0 }
      : { def, x: def.line, y: pos, face: [0, dir], pauseUntil: 0, look: 0, nextLook: 0, sus: 0 }
  })
  return { px: START.x, py: START.y, dx: START.x, dy: START.y, guards, start: 0, nextStep: 0, shownLeft: null, spotted: 0, wasSeen: false, over: false, outcome: null, endAt: 0, catcher: null }
}

/** The tiles a guard can see (never the safe T entrance): a cone three tiles deep that planters, benches and City Hall block. */
/** The T entrance you start on is always safe: guards can't see or catch you there. */
const isSafe = (x: number, y: number) => x === START.x && y === START.y

function sightOf(g: Guard): [number, number][] {
  const gx = Math.round(g.x)
  const gy = Math.round(g.y)
  const [fx, fy] = g.face
  const out: [number, number][] = []
  for (let d = 1; d <= SIGHT; d++) {
    const w = d === 1 ? 0 : 1
    for (let l = -w; l <= w; l++) {
      const tx = gx + fx * d - fy * l
      const ty = gy + fy * d + fx * l
      if (blocked(tx, ty) || isSafe(tx, ty)) continue
      // Line of sight: nothing solid between the guard and this tile
      let clear = true
      for (let k = 1; k < 8; k++) {
        const sx = Math.round(gx + ((tx - gx) * k) / 8)
        const sy = Math.round(gy + ((ty - gy) * k) / 8)
        if ((sx !== tx || sy !== ty) && (sx !== gx || sy !== gy) && blocked(sx, sy)) {
          clear = false
          break
        }
      }
      if (clear) out.push([tx, ty])
    }
  }
  return out
}

// ---------- Game ----------

export function SlideGame({
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
  const [spotted, setSpotted] = useState(0)
  const [status, setStatus] = useState('Sneak to the slide. Stay out of the guards’ sight!')
  const game = useRef<Game | null>(null)
  const phaseRef = useRef<Phase>('intro')
  const swipe = useRef<{ x: number; y: number } | null>(null)

  const go = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  useEffect(() => {
    game.current = newGame()
    // A test hook in development only, so scripted playtests can see the guards
    if (process.env.NODE_ENV !== 'production') (window as unknown as { __slide?: Game }).__slide = game.current
  }, [])

  const end = (outcome: Outcome, catcher: Guard | null = null) => {
    const g = game.current
    if (!g || g.over) return
    g.over = true
    g.outcome = outcome
    g.catcher = catcher
    g.endAt = performance.now()
    const secs = (g.endAt - g.start) / 1000
    const r = { outcome, gold: goldFor(outcome, TIME - secs), secs, spotted: g.spotted }
    setResult(r)
    setStatus(outcome === 'clean' ? 'Wheee! You rode the slide!' : outcome === 'caught' ? 'Busted by security!' : 'The plaza closed.')
    onFinish({ correctCount: outcome === 'clean' ? 1 : 0, rounds: 1, points: r.gold, score: r.gold, secondsUsed: Math.round(secs) })
    // Let the slide ride (or the bust) play out before the results card
    window.setTimeout(() => go('done'), outcome === 'clean' ? 1500 : 1100)
  }

  const move = (mx: number, my: number) => {
    const g = game.current
    const now = performance.now()
    if (phaseRef.current !== 'play' || !g || g.over || now < g.nextStep) return
    const nx = g.px + mx
    const ny = g.py + my
    if (nx === GOAL.x && ny === GOAL.y) {
      g.px = nx
      g.py = ny
      end('clean')
      return
    }
    if (blocked(nx, ny)) return
    g.px = nx
    g.py = ny
    g.nextStep = now + STEP_MS
  }
  // Read through refs so the key and animation listeners never go stale
  const moveRef = useRef(move)
  const endRef = useRef(end)
  useEffect(() => {
    moveRef.current = move
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

  // Animation loop: guards, sight, the clock, and drawing
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
          // Guards keep patrolling (even before you start, so you can watch their routes)
          for (const gd of g.guards) {
            const def = gd.def
            if (def.kind === 'patrol') {
              if (now < gd.pauseUntil) continue
              const along = def.axis === 'x' ? 'x' : 'y'
              const step = (def.axis === 'x' ? gd.face[0] : gd.face[1]) * def.speed * dt
              gd[along] += step
              if (gd[along] >= def.to || gd[along] <= def.from) {
                gd[along] = Math.max(def.from, Math.min(def.to, gd[along]))
                gd.face = [-gd.face[0], -gd.face[1]]
                gd.pauseUntil = now + TURN_PAUSE * 1000
              }
            } else if (now >= gd.nextLook) {
              gd.look = (gd.look + 1) % def.looks.length
              gd.face = def.looks[gd.look]
              gd.nextLook = now + def.every * 1000
            }
          }
        }
        if (p === 'play' && !g.over) {
          let seenNow = false
          for (const gd of g.guards) {
            // Bumping into a guard is an instant bust
            if (!isSafe(g.px, g.py) && Math.abs(gd.x - g.px) < 0.35 && Math.abs(gd.y - g.py) < 0.35) {
              endRef.current('caught', gd)
              break
            }
            const sees = sightOf(gd).some(([x, y]) => x === g.px && y === g.py)
            gd.sus = sees ? gd.sus + SPOT_RATE * dt : Math.max(0, gd.sus - CALM_RATE * dt)
            if (sees) seenNow = true
            if (gd.sus >= 1) {
              endRef.current('caught', gd)
              break
            }
          }
          if (seenNow && !g.wasSeen) {
            g.spotted += 1
            setSpotted(g.spotted)
          }
          g.wasSeen = seenNow
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
        draw(ctx, now, g, p, font)
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
    g.shownLeft = TIME
    setTimeLeft(TIME)
    setStatus('Sneak to the slide. Stay out of the guards’ sight!')
    go('play')
  }

  const hurry = phase === 'play' && timeLeft <= 5

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
          <p className="truncate font-pixel text-[12px] leading-none text-muted">{station.name} · City Hall Plaza</p>
          <h1 className="truncate font-pixel text-[19px] font-bold leading-tight">Slide Sneak</h1>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink bg-[#2B3A55] text-white" aria-hidden>
          <Siren size={16} strokeWidth={2.6} />
        </span>
      </header>

      {/* Stats */}
      <div className="absolute inset-x-4 top-[124px] z-10 flex gap-2 font-pixel text-[14px] font-bold">
        <span
          className={`flex h-9 flex-1 items-center justify-center gap-1.5 border-2 border-ink shadow-[3px_3px_0_rgba(27,31,36,0.85)] ${hurry ? 'animate-pulse text-white' : ''}`}
          style={{ backgroundColor: hurry ? '#DA291C' : '#FBF3DF' }}
          aria-label={`${timeLeft} seconds until the plaza closes`}
        >
          <Timer size={15} strokeWidth={2.8} />
          <span className={NUM}>{timeLeft}s</span>
        </span>
        <span
          className="flex h-9 flex-1 items-center justify-center gap-1.5 border-2 border-ink bg-[#FBF3DF] shadow-[3px_3px_0_rgba(27,31,36,0.85)]"
          aria-label={`Spotted ${spotted} times`}
        >
          <Eye size={15} strokeWidth={2.8} />
          Seen <span className={NUM}>{spotted}</span>
        </span>
        <span className="flex h-9 flex-1 items-center justify-center gap-1.5 border-2 border-ink bg-[#FBF3DF] shadow-[3px_3px_0_rgba(27,31,36,0.85)]">
          <Coin size={17} />
          <span className={NUM}>{result?.gold ?? 0}</span>
        </span>
      </div>

      <p
        className="absolute inset-x-4 top-[166px] flex items-center justify-center gap-1.5 font-pixel text-[16px] font-bold leading-none"
        style={{ color: hurry ? '#FF8A7A' : '#FBF3DF' }}
      >
        Sneak to the slide! <ArrowUp size={16} strokeWidth={3.2} />
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
          aria-label="City Hall Plaza from above. You start at the T entrance at the bottom; the slide is at the top right by City Hall. Security guards patrol, and the yellow tiles are what they can see. Swipe or use the arrows to move."
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
              <p className="font-pixel text-[12px] font-bold tracking-[0.1em] text-muted">THE PLAZA CLOSES IN {TIME} SECONDS</p>
              <p className="font-pixel text-[25px] font-bold leading-tight">Ride the slide!</p>
              <p className="mt-1.5 text-[13px] leading-snug text-ink-soft">
                The City Hall Plaza slide is right there, but security says you&apos;re way too old for it. Sneak up to it without getting
                caught. Yellow tiles are what the guards can see: hide behind planters and benches, and move when they look away. The T entrance is safe.
              </p>
              <button
                type="button"
                onClick={start}
                autoFocus
                className="mt-3 flex h-12 w-full items-center justify-center border-[3px] border-ink font-pixel text-[17px] font-bold text-white shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                style={{ backgroundColor: LINES[station.lines[0]].color }}
              >
                Sneak!
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
      <div role="dialog" aria-modal="true" aria-labelledby="slide-done" className={`w-full animate-pop p-4 ${PANEL}`}>
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
            {won ? <Check size={22} strokeWidth={3.5} /> : result.outcome === 'caught' ? <Siren size={20} strokeWidth={2.8} /> : <AlarmClock size={20} strokeWidth={2.8} />}
          </span>
          <h2 id="slide-done" className="font-pixel text-[26px] font-bold leading-none">
            {won ? 'Wheee!' : result.outcome === 'caught' ? 'Busted!' : 'Plaza closed!'}
          </h2>
        </div>
        <p className="mt-1.5 text-center text-[13px] leading-snug text-ink-soft">
          {won
            ? 'You made it up the slide and zoomed down before security could stop you.'
            : result.outcome === 'caught'
              ? '“Hey! That slide is for kids!” Security walked you back to the T.'
              : 'The guards locked up the plaza for the night. The slide will have to wait.'}
        </p>
        <p className="mt-1 text-center text-[13px] font-semibold text-muted">
          <span className={NUM}>{result.secs.toFixed(1)}s</span> · seen <span className={NUM}>{result.spotted}</span>{' '}
          {result.spotted === 1 ? 'time' : 'times'}
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

function sprite(ctx: Ctx, rows: string[], pal: Record<string, string>, x: number, y: number, u = 4) {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const col = pal[rows[r][c]]
      if (!col) continue
      ctx.fillStyle = col
      ctx.fillRect(Math.round(x + c * u), Math.round(y + r * u), u, u)
    }
  }
}

/** You, in the gold hoodie, from above. */
const RIDER = ['..hhhhhh..', '.hhhhhhhh.', '.hhhhhhhh.', '..ssssss..', '.bccccccb.', 'bccccccccb', 'bccccccccb', '.cccccccc.', '..pp..pp..', '..kk..kk..']
const RIDER_PAL = { h: '#2B1D14', s: '#F1C9A5', c: '#F2B233', b: '#C0392B', p: '#2B3A55', k: '#1B1F24' }
/** A plaza security guard: navy cap, hi-vis vest. */
const GUARD = ['..nnnnnn..', '.nnnnnnnn.', '..yyyyyy..', '..ssssss..', '.vvvvvvvv.', 'nvvnnnnvvn', 'nvvnnnnvvn', '.vvvvvvvv.', '..nn..nn..', '..kk..kk..']
const GUARD_PAL = { n: '#1F2C4A', y: '#E8C04A', s: '#C68E62', v: '#C7F23A', k: '#1B1F24' }

function draw(ctx: Ctx, now: number, g: Game, phase: Phase, font: string) {
  // Brick plaza (City Hall Plaza's red brick, laid in long courses)
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * T
      const py = y * T
      ctx.fillStyle = (x + y) % 2 ? '#A65A43' : '#AD6048'
      ctx.fillRect(px, py, T, T)
      ctx.fillStyle = '#8E4A36'
      for (let r = 0; r < 4; r++) {
        ctx.fillRect(px, py + r * 10, T, 2)
        ctx.fillRect(px + ((r % 2) * 20 + 8) % T, py + r * 10, 2, 10)
        ctx.fillRect(px + ((r % 2) * 20 + 28) % T, py + r * 10, 2, 10)
      }
    }
  }
  // The T entrance at the bottom: where you come up, and a safe zone the guards ignore
  ctx.fillStyle = 'rgba(63, 191, 106, 0.35)'
  ctx.fillRect(START.x * T, START.y * T, T, T)
  ctx.strokeStyle = '#3FBF6A'
  ctx.lineWidth = 2
  ctx.strokeRect(START.x * T + 1, START.y * T + 1, T - 2, T - 2)
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(START.x * T + 4, START.y * T + 6, T - 8, T - 10)
  ctx.fillStyle = '#5C6670'
  ctx.fillRect(START.x * T + 7, START.y * T + 9, T - 14, T - 16)
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(START.x * T + T / 2, START.y * T + T / 2 + 1, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1B1F24'
  ctx.font = `bold 13px ${font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('T', START.x * T + T / 2, START.y * T + T / 2 + 2)
  ctx.font = `bold 9px ${font}`
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(START.x * T + T / 2 - 15, START.y * T - 13, 30, 12)
  ctx.fillStyle = '#7CF29A'
  ctx.fillText('SAFE', START.x * T + T / 2, START.y * T - 7)

  // City Hall: Brutalist concrete with its rows of deep window fins
  const hw = 6 * T
  const hh = 2 * T
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(0, 0, hw, hh + 3)
  ctx.fillStyle = '#B9B2A6'
  ctx.fillRect(0, 0, hw - 3, hh)
  ctx.fillStyle = '#A39C90'
  ctx.fillRect(0, 0, hw - 3, 14)
  for (let x = 4; x < hw - 6; x += 10) {
    ctx.fillStyle = '#5E5A54'
    ctx.fillRect(x, 20, 6, 16)
    ctx.fillRect(x, 46, 6, 14)
    ctx.fillStyle = '#8A847A'
    ctx.fillRect(x + 6, 20, 2, 16)
  }
  ctx.fillStyle = '#8A847A'
  ctx.fillRect(0, 64, hw - 3, 4)
  ctx.fillStyle = '#FBF3DF'
  ctx.font = `bold 11px ${font}`
  ctx.textAlign = 'left'
  ctx.fillText('BOSTON CITY HALL', 8, 8)

  // The playground, drawn from the side like City Hall: a tall tower of concrete "falling cubes"
  // with a ladder up its front, and the long stainless steel slide swooping down from the top
  const mx = 6 * T
  const gx = GOAL.x * T
  const gy = GOAL.y * T
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(mx - 3, 0, 3 * T + 3, 3 * T + 3)
  ctx.fillStyle = '#9FC7DE'
  ctx.fillRect(mx, 0, 3 * T, 3 * T)
  ctx.fillStyle = '#B8D7E8'
  ctx.fillRect(mx, 0, 3 * T, 30)
  // Rubber ground along the bottom
  ctx.fillStyle = '#C46A3C'
  ctx.fillRect(mx, 3 * T - 10, 3 * T, 10)
  ctx.fillStyle = '#A95A31'
  ctx.fillRect(mx, 3 * T - 10, 3 * T, 2)

  // Tower: three stacked cubes, a little askew
  const cube = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = '#1B1F24'
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4)
    ctx.fillStyle = '#CFC9BE'
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = '#E2DDD4'
    ctx.fillRect(x, y, w, 4)
    ctx.fillStyle = '#ABA498'
    ctx.fillRect(x + w - 5, y + 4, 5, h - 4)
  }
  cube(mx + 4, 3 * T - 46, 36, 36)
  cube(mx + 7, 3 * T - 82, 34, 34)
  cube(mx + 2, 16, 38, 22)
  // Railing on top
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(mx + 2, 6, 3, 10)
  ctx.fillRect(mx + 37, 6, 3, 10)
  ctx.fillRect(mx + 2, 6, 38, 3)
  // Ladder up the tower's front, down to the plaza (the goal)
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(gx + 11, 12, 18, gy + T - 12)
  ctx.fillStyle = '#E8C04A'
  ctx.fillRect(gx + 13, 12, 3, gy + T - 14)
  ctx.fillRect(gx + 24, 12, 3, gy + T - 14)
  ctx.fillStyle = '#C79A2E'
  for (let y = 18; y < gy + T - 4; y += 8) ctx.fillRect(gx + 16, y, 8, 3)

  // The slide: support legs, then the tube and the open chute on top
  ctx.fillStyle = '#5E6670'
  for (const [x, y] of [SLIDE_PATH[2], SLIDE_PATH[4], SLIDE_PATH[6]]) ctx.fillRect(x - 2, y + 8, 4, 3 * T - 10 - y - 8)
  const path = SLIDE_PATH
  const curve = (from: number, to: number) => {
    ctx.beginPath()
    ctx.moveTo(path[from][0], path[from][1])
    for (let i = from + 1; i < to; i++) {
      const [x, y] = path[i]
      const [nx, ny] = path[i + 1]
      ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2)
    }
    ctx.lineTo(path[to][0], path[to][1])
  }
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // Open chute: a steel trough with a raised side and a shiny bed
  for (const [w, c, dy] of [
    [14, '#1B1F24', 0],
    [10, '#8E98A4', 0],
    [4, '#EEF3F7', -2],
  ] as const) {
    ctx.save()
    ctx.translate(0, dy)
    curve(TUBE_END, path.length - 1)
    ctx.lineWidth = w
    ctx.strokeStyle = c
    ctx.stroke()
    ctx.restore()
  }
  // Enclosed tube off the top of the tower
  for (const [w, c] of [
    [22, '#1B1F24'],
    [18, '#A3ADB8'],
    [6, '#E2E8EE'],
  ] as const) {
    curve(0, TUBE_END)
    ctx.lineWidth = w
    ctx.strokeStyle = c
    ctx.stroke()
  }
  ctx.lineCap = 'butt'
  // A glowing marker on the goal while you play
  if (phase === 'play' && !g.over) {
    ctx.strokeStyle = `rgba(255, 227, 138, ${0.5 + 0.5 * Math.sin(now / 160)})`
    ctx.lineWidth = 3
    ctx.strokeRect(gx + 3, gy + 3, T - 6, T - 6)
  }

  // Planters and benches
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = at(x, y)
      const px = x * T
      const py = y * T
      if (c === 'P') {
        ctx.fillStyle = '#1B1F24'
        ctx.fillRect(px + 2, py + 2, T - 4, T - 4)
        ctx.fillStyle = '#B9B2A6'
        ctx.fillRect(px + 4, py + 4, T - 8, T - 8)
        ctx.fillStyle = '#3E7A34'
        ctx.fillRect(px + 8, py + 8, T - 16, T - 16)
        ctx.fillStyle = '#5DA34A'
        ctx.fillRect(px + 10, py + 9, 8, 6)
        ctx.fillRect(px + 20, py + 18, 9, 7)
        ctx.fillRect(px + 12, py + 22, 6, 6)
      } else if (c === 'B') {
        ctx.fillStyle = '#1B1F24'
        ctx.fillRect(px + 2, py + 10, T - 4, 20)
        ctx.fillStyle = '#8C5A3A'
        ctx.fillRect(px + 4, py + 12, T - 8, 16)
        ctx.fillStyle = '#6E4429'
        ctx.fillRect(px + 4, py + 17, T - 8, 2)
        ctx.fillRect(px + 4, py + 23, T - 8, 2)
      }
    }
  }

  // What the guards can see
  const seen = new Set<string>()
  for (const gd of g.guards) for (const [x, y] of sightOf(gd)) seen.add(`${x},${y}`)
  for (const key of seen) {
    const [x, y] = key.split(',').map(Number)
    const onYou = x === g.px && y === g.py && phase === 'play'
    ctx.fillStyle = onYou ? 'rgba(255, 70, 50, 0.5)' : 'rgba(255, 227, 110, 0.38)'
    ctx.fillRect(x * T, y * T, T, T)
  }

  // Guards, facing the way they look
  for (const gd of g.guards) {
    const x = gd.x * T
    const y = gd.y * T
    const walking = gd.def.kind === 'patrol' && now >= gd.pauseUntil
    const bob = walking ? Math.round(Math.sin(now / 90) * 1.5) : 0
    sprite(ctx, GUARD, GUARD_PAL, x, y + bob)
    // Eyes/flashlight dot on the side they face
    ctx.fillStyle = '#FFF6B0'
    ctx.fillRect(x + T / 2 - 3 + gd.face[0] * 16, y + T / 2 - 3 + gd.face[1] * 16, 6, 6)
    // Suspicion: a "?" while they're unsure, "!" once they've got you
    const caughtYou = g.catcher === gd
    if (gd.sus > 0.05 || caughtYou) {
      const k = caughtYou ? 1 : Math.min(1, gd.sus)
      ctx.fillStyle = '#1B1F24'
      ctx.fillRect(x + T / 2 - 9, y - 22, 18, 20)
      ctx.fillStyle = caughtYou || k > 0.6 ? '#E0463B' : '#F2C94C'
      ctx.fillRect(x + T / 2 - 7, y - 20, 14, 16)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = `bold 14px ${font}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(caughtYou || k > 0.6 ? '!' : '?', x + T / 2, y - 11)
    }
  }

  // You, or you riding the slide down
  if (g.outcome === 'clean') {
    const k = Math.min(1, (now - g.endAt) / 1300)
    // Up the stairs into the tower, hidden inside the tube, then out the open chute
    const bottom = GOAL.y * T + T / 2
    const lx = GOAL.x * T + T / 2
    let cx = lx
    let cy = bottom
    let hidden = false
    if (k < 0.3) cy = bottom - (bottom - 14) * (k / 0.3)
    else {
      const t = Math.min(1, ((k - 0.3) / 0.7) ** 1.4)
      const f = t * (SLIDE_PATH.length - 1)
      const i = Math.min(SLIDE_PATH.length - 2, Math.floor(f))
      const u = f - i
      cx = SLIDE_PATH[i][0] + (SLIDE_PATH[i + 1][0] - SLIDE_PATH[i][0]) * u
      cy = SLIDE_PATH[i][1] + (SLIDE_PATH[i + 1][1] - SLIDE_PATH[i][1]) * u
      hidden = f < TUBE_END
    }
    const ride = k > 0.3 ? 1 : 0
    if (!hidden) sprite(ctx, RIDER, RIDER_PAL, cx - T / 2, cy - T / 2)
    if (ride > 0.2) {
      ctx.font = `bold 22px ${font}`
      ctx.textAlign = 'center'
      ctx.lineWidth = 4
      ctx.strokeStyle = '#1B1F24'
      ctx.strokeText('WHEEE!', 5 * T, 3.6 * T)
      ctx.fillStyle = '#FFE38A'
      ctx.fillText('WHEEE!', 5 * T, 3.6 * T)
    }
  } else {
    sprite(ctx, RIDER, RIDER_PAL, g.dx * T, g.dy * T)
  }

  // Busted: a flash of red and blue
  if (g.outcome === 'caught') {
    const k = (now - g.endAt) / 1000
    if (k < 1.2) {
      ctx.fillStyle = Math.floor(now / 120) % 2 ? 'rgba(224, 70, 59, 0.25)' : 'rgba(47, 111, 209, 0.25)'
      ctx.fillRect(0, 0, BW, BH)
      ctx.font = `bold 24px ${font}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 5
      ctx.strokeStyle = '#1B1F24'
      ctx.strokeText('HEY! NO SLIDING!', BW / 2, BH / 2)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillText('HEY! NO SLIDING!', BW / 2, BH / 2)
    }
  }
}
