'use client'

// Lion Dance (Chinatown): a Lunar New Year rhythm game on Beach Street.
//
// You're the lion. Arrows scroll along the drum track toward the drum; press the matching arrow
// (buttons, arrow keys/WASD, or swipe) as each one hits it, in time with the beat. The lion
// shakes its head, rears up and crouches with your moves, and firecrackers go off when your
// combo builds. The dance gets busier as you go down the street toward the Chinatown Gate, and
// at the end you rear up to grab the lettuce (the red envelope) hanging over the street: tap
// fast to reach it.

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Flame, Map as MapIcon, Music, RotateCcw, Sparkles, X } from 'lucide-react'
import { LINES, type Station } from './stations'
import { Coin } from './fantasy'
import { LANDMARK_INFO } from './landmarks'
import type { GameResult } from './GameFrame'
import { NUM, PANEL, PixelScreen } from './pixel'
import { StatusBar } from './ui'

export const LION_GAME = { title: 'Lion Dance', genre: 'Rhythm', time: '~40 sec' }

// ---------- Song ----------

const W = 361
const H = 480
const BPM = 104
const BEAT = 60000 / BPM
/** Four beats of count-in before the first arrow. */
const COUNT_IN = 4 * BEAT
const BARS = 12
const SONG_END = COUNT_IN + BARS * 4 * BEAT
/** How long you get to grab the lettuce, and how many taps it takes. */
const LETTUCE_MS = 3200
const LETTUCE_TAPS = 10

const TRACK_Y = 372
const HIT_X = 56
const TRAVEL = 1500
const PERFECT_MS = 60
const GOOD_MS = 115
const WINDOW_MS = 160
/** Where Perfect/Good/Miss pop up: the open street to the lion's right. */
const JUDGE_X = 285
const JUDGE_Y = 318
/** The lettuce hangs right over the lion's head. */
const LETTUCE_X = 178
const LETTUCE_Y = 176

type Dir = 0 | 1 | 2 | 3 // left, up, right, down
const DIRS: { key: string[]; color: string; label: string }[] = [
  { key: ['ArrowLeft', 'a'], color: '#E0463B', label: 'Left' },
  { key: ['ArrowUp', 'w'], color: '#F2C94C', label: 'Up' },
  { key: ['ArrowRight', 'd'], color: '#3FBF6A', label: 'Right' },
  { key: ['ArrowDown', 's'], color: '#5BB4F5', label: 'Down' },
]

type Note = { at: number; dir: Dir; state: 'live' | 'hit' | 'miss'; doneAt: number }

/** The dance: easy steps on the beat at first, then eighth notes, doubles and runs. */
function chart(): Note[] {
  const notes: Note[] = []
  const add = (beat: number, dir: Dir) => notes.push({ at: COUNT_IN + beat * BEAT, dir, state: 'live', doneAt: 0 })
  const rnd = (dirs: Dir[]) => dirs[Math.floor(Math.random() * dirs.length)]
  const LR: Dir[] = [0, 2]
  const ALL: Dir[] = [0, 1, 2, 3]
  for (let bar = 0; bar < BARS; bar++) {
    const b = bar * 4
    if (bar < 2) {
      add(b, rnd(LR))
      add(b + 2, rnd(LR))
    } else if (bar < 5) {
      for (let k = 0; k < 4; k++) add(b + k, rnd(k === 3 ? ALL : LR))
    } else if (bar < 8) {
      for (let k = 0; k < 4; k++) {
        const d = rnd(ALL)
        add(b + k, d)
        if (k === 1 || (k === 3 && Math.random() < 0.5)) add(b + k + 0.5, d)
      }
    } else {
      // Runs around the arrows and quick doubles
      const run = Math.random() < 0.5 ? ([0, 1, 2, 3] as Dir[]) : ([3, 2, 1, 0] as Dir[])
      if (bar % 2 === 0) for (let k = 0; k < 8; k++) add(b + k / 2, run[k % 4])
      else
        for (let k = 0; k < 4; k++) {
          const d = rnd(ALL)
          add(b + k, d)
          if (k % 2 === 0) add(b + k + 0.5, rnd(ALL))
        }
    }
  }
  return notes
}

// ---------- Game state ----------

type Phase = 'intro' | 'play' | 'lettuce' | 'done'
type Pose = { dir: Dir | null; at: number; miss: number }
type Floater = { text: string; color: string; x: number; y: number; born: number; big?: boolean }
type Spark = { x: number; y: number; vx: number; vy: number; born: number; color: string }
type Game = {
  start: number
  notes: Note[]
  perfect: number
  good: number
  ok: number
  missed: number
  combo: number
  best: number
  pose: Pose
  beatsPlayed: number
  floaters: Floater[]
  sparks: Spark[]
  lettuceStart: number
  taps: number
  grabbed: boolean
  over: boolean
}
type Result = { score: number; accuracy: number; best: number; grabbed: boolean; gold: number; secs: number; perfect: number; missed: number }

const newGame = (): Game => ({
  start: 0,
  notes: chart(),
  perfect: 0,
  good: 0,
  ok: 0,
  missed: 0,
  combo: 0,
  best: 0,
  pose: { dir: null, at: 0, miss: 0 },
  beatsPlayed: 0,
  floaters: [],
  sparks: [],
  lettuceStart: 0,
  taps: 0,
  grabbed: false,
  over: false,
})

/** Judge an arrow press against the nearest live arrow on the track (mutates the game). */
function judge(g: Game, dir: Dir, now: number): 'Perfect!' | 'Good' | 'OK' | 'wrong' | null {
  const t = now - g.start
  g.pose = { dir, at: now, miss: g.pose.miss }
  let best: Note | null = null
  for (const n of g.notes) {
    if (n.state !== 'live' || Math.abs(n.at - t) > WINDOW_MS) continue
    if (!best || Math.abs(n.at - t) < Math.abs(best.at - t)) best = n
  }
  if (!best) return null
  best.doneAt = now
  if (best.dir !== dir) {
    best.state = 'miss'
    g.missed += 1
    g.combo = 0
    g.pose.miss = now
    return 'wrong'
  }
  best.state = 'hit'
  const off = Math.abs(best.at - t)
  if (off <= PERFECT_MS) g.perfect += 1
  else if (off <= GOOD_MS) g.good += 1
  else g.ok += 1
  g.combo += 1
  g.best = Math.max(g.best, g.combo)
  return off <= PERFECT_MS ? 'Perfect!' : off <= GOOD_MS ? 'Good' : 'OK'
}

/** One tap toward the lettuce; grabs it on the last one. Returns the tap count. */
function tapLettuce(g: Game, now: number) {
  g.taps += 1
  g.pose = { dir: 1, at: now, miss: g.pose.miss }
  if (g.taps >= LETTUCE_TAPS) g.grabbed = true
  return g.taps
}

/** Mark the game over; returns false if it already was. */
function endGame(g: Game) {
  if (g.over) return false
  g.over = true
  return true
}

const accuracyOf = (g: Game) => (g.perfect + g.good * 0.7 + g.ok * 0.4) / Math.max(1, g.notes.length)
/** Gold: up to 150 for accuracy, 60 for the lettuce, plus your best combo (up to 30). Max 240. */
const goldFor = (acc: number, grabbed: boolean, best: number) => Math.min(240, Math.round(150 * acc) + (grabbed ? 60 : 0) + Math.min(30, best))

// ---------- Component ----------

export function LionGame({
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
  const [hud, setHud] = useState({ combo: 0, acc: 100 })
  const [result, setResult] = useState<Result | null>(null)
  const [status, setStatus] = useState('Press the arrows on the beat!')
  const game = useRef<Game | null>(null)
  const phaseRef = useRef<Phase>('intro')
  const audio = useRef<AudioContext | null>(null)
  const noise = useRef<AudioBuffer | null>(null)
  const swipe = useRef<{ x: number; y: number } | null>(null)

  const go = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  useEffect(() => {
    game.current = newGame()
    // A test hook in development only, so scripted playtests can follow the notes
    if (process.env.NODE_ENV !== 'production') (window as unknown as { __lion?: Game }).__lion = game.current
    return () => void audio.current?.close().catch(() => {})
  }, [])

  // ---- Sound: a drum on every beat, a gong each bar, a cymbal crash on hits, firecracker pops
  const tone = (freq: number, dur: number, type: OscillatorType, vol: number, slide = 1) => {
    const ac = audio.current
    if (!ac) return
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, ac.currentTime)
    o.frequency.exponentialRampToValueAtTime(freq * slide, ac.currentTime + dur)
    g.gain.setValueAtTime(vol, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur)
    o.connect(g).connect(ac.destination)
    o.start()
    o.stop(ac.currentTime + dur)
  }
  const hiss = (dur: number, vol: number, hp = 3000) => {
    const ac = audio.current
    if (!ac || !noise.current) return
    const src = ac.createBufferSource()
    src.buffer = noise.current
    const f = ac.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = hp
    const g = ac.createGain()
    g.gain.setValueAtTime(vol, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur)
    src.connect(f).connect(g).connect(ac.destination)
    src.start()
    src.stop(ac.currentTime + dur)
  }

  const float = (text: string, color: string, x: number, y: number, big = false) => {
    const fl = game.current?.floaters
    if (!fl) return
    // A new grade replaces the last one instead of stacking on it
    if (x === JUDGE_X) for (let i = fl.length - 1; i >= 0; i--) if (fl[i].x === JUDGE_X) fl.splice(i, 1)
    fl.push({ text, color, x, y, born: performance.now(), big })
  }

  const firecrackers = (now: number) => {
    const g = game.current
    if (!g) return
    for (const side of [24, W - 24]) {
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2
        const v = 60 + Math.random() * 120
        g.sparks.push({ x: side, y: 120 + Math.random() * 60, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, born: now + i * 25, color: i % 3 ? '#FFD24A' : '#E0463B' })
      }
    }
    for (let i = 0; i < 6; i++) window.setTimeout(() => hiss(0.06, 0.12, 1500), i * 55)
  }

  const sync = () => {
    const g = game.current
    if (g) setHud({ combo: g.combo, acc: Math.round(accuracyOf({ ...g, notes: g.notes.filter((n) => n.state !== 'live') }) * 100) || 0 })
  }

  const finish = () => {
    const g = game.current
    if (!g || !endGame(g)) return
    const acc = accuracyOf(g)
    const gold = goldFor(acc, g.grabbed, g.best)
    const secs = (performance.now() - g.start) / 1000
    const score = Math.round(acc * 1000) + (g.grabbed ? 200 : 0) + g.best * 5
    const r = { score, accuracy: acc, best: g.best, grabbed: g.grabbed, gold, secs, perfect: g.perfect, missed: g.missed }
    setResult(r)
    setStatus(`Dance over: ${Math.round(acc * 100)}% on the beat.`)
    onFinish({ correctCount: g.perfect + g.good + g.ok, rounds: g.notes.length, points: gold, score, secondsUsed: Math.round(secs) })
    window.setTimeout(() => go('done'), 1300)
  }

  /** You pressed an arrow: judge it against the nearest arrow on the track. */
  const press = (dir: Dir) => {
    const g = game.current
    const p = phaseRef.current
    if (!g || g.over) return
    const now = performance.now()
    if (p === 'lettuce') {
      // Any arrow (or tap) rears the lion up toward the lettuce
      const taps = tapLettuce(g, now)
      tone(160 + taps * 30, 0.12, 'triangle', 0.08)
      if (g.grabbed && !g.over) {
        float('Got the lettuce!', '#7CF29A', W / 2, 110, true)
        firecrackers(now)
        tone(196, 1.4, 'sine', 0.12)
        tone(294, 1.4, 'triangle', 0.06)
        finish()
      }
      return
    }
    if (p !== 'play') return
    const judged = judge(g, dir, now)
    if (!judged) return
    if (judged === 'wrong') {
      float('Wrong way!', '#FF8A7A', JUDGE_X, JUDGE_Y)
      tone(110, 0.25, 'sawtooth', 0.05)
      sync()
      return
    }
    const grade = judged
    float(grade, DIRS[dir].color, JUDGE_X, JUDGE_Y)
    hiss(0.18, grade === 'Perfect!' ? 0.14 : 0.08, 5000)
    if (g.combo > 0 && g.combo % 10 === 0) {
      float(`${g.combo} combo!`, '#FFD24A', W / 2, 70, true)
      firecrackers(now)
    }
    sync()
  }

  const pressRef = useRef(press)
  const finishRef = useRef(finish)
  useEffect(() => {
    pressRef.current = press
    finishRef.current = finish
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const d = DIRS.findIndex((x) => x.key.includes(e.key))
      if (d < 0) return
      e.preventDefault()
      pressRef.current(d as Dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ---- Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr
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
        const t = p === 'intro' ? 0 : now - g.start
        if (p === 'play' && !g.over) {
          // Drum on every beat, gong on each bar
          const beat = Math.floor(t / BEAT)
          if (beat >= g.beatsPlayed && t < SONG_END + BEAT) {
            g.beatsPlayed = beat + 1
            tone(80, 0.22, 'sine', 0.22, 0.6)
            if (beat % 4 === 0) tone(220, 0.9, 'triangle', 0.04, 0.95)
            if (t < COUNT_IN) float(String(4 - beat), '#FBF3DF', W / 2, TRACK_Y - 90, true)
          }
          let changed = false
          for (const n of g.notes) {
            if (n.state === 'live' && t - n.at > WINDOW_MS) {
              n.state = 'miss'
              n.doneAt = now
              g.missed += 1
              g.combo = 0
              g.pose.miss = now
              float('Miss', '#C9CED6', JUDGE_X, JUDGE_Y)
              changed = true
            }
          }
          if (changed) sync()
          // After the last arrow: grab the lettuce!
          if (t > SONG_END + BEAT) {
            g.lettuceStart = now
            float('Grab the lettuce!', '#FFD24A', W / 2, 150, true)
            setStatus('Grab the lettuce! Tap any arrow fast!')
            phaseRef.current = 'lettuce'
            setPhase('lettuce')
          }
        } else if (p === 'lettuce' && !g.over && now - g.lettuceStart > LETTUCE_MS) {
          float('Missed the lettuce…', '#C9CED6', W / 2, 150, true)
          finishRef.current()
        }
        for (const s of g.sparks) {
          if (now < s.born) continue
          s.vy += 220 * dt
          s.x += s.vx * dt
          s.y += s.vy * dt
        }
        g.sparks = g.sparks.filter((s) => now - s.born < 900)
        g.floaters = g.floaters.filter((f) => now - f.born < 1000)
        draw(ctx, now, t, g, p, font)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const start = () => {
    const g = game.current
    if (!g) return
    try {
      audio.current = new AudioContext()
      const ac = audio.current
      const buf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      noise.current = buf
    } catch {
      audio.current = null
    }
    g.start = performance.now()
    setStatus('Press the arrows on the beat!')
    go('play')
  }

  const line = LINES[station.lines[0]]

  return (
    <PixelScreen>
      <StatusBar tone="light" />

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
          <p className="truncate font-pixel text-[12px] leading-none text-muted">{station.name} · Beach Street</p>
          <h1 className="truncate font-pixel text-[19px] font-bold leading-tight">Lion Dance</h1>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink bg-[#D33A2C] text-white" aria-hidden>
          <Music size={16} strokeWidth={2.6} />
        </span>
      </header>

      <div className="absolute inset-x-4 top-[124px] z-10 flex gap-2 font-pixel text-[14px] font-bold">
        <span className="flex h-9 flex-1 items-center justify-center gap-1.5 border-2 border-ink bg-[#FBF3DF] shadow-[3px_3px_0_rgba(27,31,36,0.85)]" aria-label={`Combo ${hud.combo}`}>
          <Flame size={15} strokeWidth={2.8} />
          ×<span className={NUM}>{hud.combo}</span>
        </span>
        <span className="flex h-9 flex-1 items-center justify-center gap-1.5 border-2 border-ink bg-[#FBF3DF] shadow-[3px_3px_0_rgba(27,31,36,0.85)]" aria-label={`${hud.acc}% on the beat`}>
          <Sparkles size={15} strokeWidth={2.8} />
          <span className={NUM}>{hud.acc}%</span>
        </span>
        <span className="flex h-9 flex-1 items-center justify-center gap-1.5 border-2 border-ink bg-[#FBF3DF] shadow-[3px_3px_0_rgba(27,31,36,0.85)]">
          <Coin size={17} />
          <span className={NUM}>{result?.gold ?? 0}</span>
        </span>
      </div>

      <p className="absolute inset-x-4 top-[166px] text-center font-pixel text-[16px] font-bold leading-none text-[#FBF3DF]">
        {phase === 'lettuce' ? 'Grab the lettuce! Tap fast!' : 'Hit the arrows on the drum beat!'}
      </p>
      <p className="sr-only" aria-live="polite">
        {status}
      </p>

      <div className="absolute left-4 top-[192px] border-[3px] border-ink shadow-[4px_4px_0_rgba(15,19,24,0.7)]" style={{ width: W + 6, height: H + 6 }}>
        <canvas
          ref={canvasRef}
          style={{ width: W, height: H, touchAction: 'none' }}
          className="block [image-rendering:pixelated]"
          role="img"
          aria-label="Beach Street in Chinatown at Lunar New Year, with the lion dancing. Arrows scroll along the drum track at the bottom; press each one as it reaches the drum."
          onPointerDown={(e) => {
            swipe.current = { x: e.clientX, y: e.clientY }
            if (phaseRef.current === 'lettuce') press(1)
          }}
          onPointerUp={(e) => {
            const s = swipe.current
            swipe.current = null
            if (!s || phaseRef.current !== 'play') return
            const dx = e.clientX - s.x
            const dy = e.clientY - s.y
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return
            press(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 0 : 2) : dy < 0 ? 1 : 3)
          }}
        />

        {phase === 'intro' && (
          <div className="absolute inset-0 flex animate-fade-in items-center justify-center bg-[#0F1318]/45 px-6">
            <div className={`w-full animate-pop p-4 text-center ${PANEL}`}>
              <p className="font-pixel text-[12px] font-bold tracking-[0.1em] text-muted">LUNAR NEW YEAR ON BEACH STREET</p>
              <p className="font-pixel text-[25px] font-bold leading-tight">Lead the lion dance!</p>
              <p className="mt-1.5 text-[13px] leading-snug text-ink-soft">
                Arrows slide along the drum track. Press the matching arrow as each one reaches the drum, right on the beat. Build a
                combo for firecrackers, and at the end, tap fast to rear up and grab the lettuce!
              </p>
              <button
                type="button"
                onClick={start}
                autoFocus
                className="mt-3 flex h-12 w-full items-center justify-center border-[3px] border-ink font-pixel text-[17px] font-bold text-white shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                style={{ backgroundColor: '#D33A2C' }}
              >
                Dance!
              </button>
            </div>
          </div>
        )}
      </div>

      {/* The four arrows, in a row */}
      <div className="absolute inset-x-4 top-[690px] grid grid-cols-4 gap-2">
        {([0, 3, 1, 2] as Dir[]).map((d) => (
          <button
            key={d}
            type="button"
            aria-label={DIRS[d].label}
            onPointerDown={(e) => {
              e.preventDefault()
              press(d)
            }}
            className="flex h-[64px] touch-none select-none items-center justify-center border-[3px] border-ink text-ink shadow-[3px_3px_0_rgba(15,19,24,0.8)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            style={{ backgroundColor: DIRS[d].color }}
          >
            {d === 0 ? <ArrowLeft size={28} strokeWidth={3.2} /> : d === 1 ? <ArrowUp size={28} strokeWidth={3.2} /> : d === 2 ? <ArrowRight size={28} strokeWidth={3.2} /> : <ArrowDown size={28} strokeWidth={3.2} />}
          </button>
        ))}
      </div>

      {phase === 'done' && result && <Results station={station} result={result} lineColor={line.color} onPlayAgain={onPlayAgain} onMap={onMap} />}
    </PixelScreen>
  )
}

function Results({ station, result, lineColor, onPlayAgain, onMap }: { station: Station; result: Result; lineColor: string; onPlayAgain: () => void; onMap: () => void }) {
  const info = LANDMARK_INFO[station.id]
  const pct = Math.round(result.accuracy * 100)
  const title = pct >= 85 ? 'Spectacular!' : pct >= 60 ? 'Great dance!' : 'Keep practicing!'
  return (
    <div className="absolute inset-0 z-30 flex animate-fade-in items-center justify-center bg-[#0F1318]/70 px-5">
      <div role="dialog" aria-modal="true" aria-labelledby="lion-done" className={`w-full animate-pop p-4 ${PANEL}`}>
        {info && (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element -- small local photos, no optimizer needed */}
            <img src={info.photo.src} alt={info.name} className="h-[110px] w-full border-[3px] border-ink object-cover" />
            <figcaption className="mt-0.5 truncate text-right text-[9.5px] text-muted">{info.photo.credit}</figcaption>
          </figure>
        )}
        <div className="mt-2 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border-[3px] border-ink text-white" style={{ backgroundColor: pct >= 60 ? '#2F7A4A' : '#8C3A30' }}>
            {pct >= 60 ? <Check size={22} strokeWidth={3.5} /> : <Music size={20} strokeWidth={2.8} />}
          </span>
          <h2 id="lion-done" className="font-pixel text-[26px] font-bold leading-none">
            {title}
          </h2>
        </div>
        <p className="mt-1.5 text-center text-[13px] leading-snug text-ink-soft">
          {result.grabbed
            ? 'The lion grabbed the lettuce and the crowd cheered. Good luck for the new year!'
            : pct >= 60
              ? 'The crowd loved it, but the lettuce got away this time.'
              : 'The lion kept tripping over the beat. The crowd wandered off to get dumplings.'}
        </p>
        <p className="mt-1 text-center text-[13px] font-semibold text-muted">
          <span className={NUM}>{pct}%</span> on the beat · best combo <span className={NUM}>{result.best}</span>
        </p>

        <div className="mt-3 flex items-center justify-center gap-2 border-2 border-ink bg-[#FFE7A3] py-2">
          <Coin size={24} />
          <span className={`text-[24px] text-[#7A4D0E] ${NUM}`}>+{result.gold}</span>
          <span className="font-pixel text-[14px] text-[#7A4D0E]">gold</span>
        </div>

        <div className="mt-3 flex items-center gap-3 border-2 border-ink bg-white p-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink font-pixel text-[13px] font-bold text-white" style={{ backgroundColor: lineColor }}>
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
            Dance again
          </button>
          <button
            type="button"
            onClick={onMap}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 border-[3px] border-ink font-pixel text-[16px] font-bold text-white shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            style={{ backgroundColor: lineColor }}
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
const GROUND = 300

/** A pixel arrow pointing in a direction, centered on (x, y). */
function arrow(ctx: Ctx, x: number, y: number, dir: Dir, color: string, s = 1) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate([Math.PI, -Math.PI / 2, 0, Math.PI / 2][dir])
  ctx.scale(s, s)
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(-20, -20, 40, 40)
  ctx.fillStyle = color
  ctx.fillRect(-17, -17, 34, 34)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillRect(-17, -17, 34, 5)
  // The arrow glyph, pointing right before rotation
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(-11, -4, 14, 8)
  ctx.beginPath()
  ctx.moveTo(2, -11)
  ctx.lineTo(13, 0)
  ctx.lineTo(2, 11)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

const SHOPS = [
  { w: 92, h: 150, wall: '#7A3B2E', sign: '#D33A2C', text: 'DIM SUM' },
  { w: 76, h: 180, wall: '#4E5A3A', sign: '#2F7A4A', text: 'TEA' },
  { w: 100, h: 140, wall: '#6B4A6E', sign: '#E8B43A', text: 'BAKERY' },
  { w: 84, h: 170, wall: '#3F5468', sign: '#D33A2C', text: 'NOODLES' },
  { w: 96, h: 156, wall: '#80542E', sign: '#2F6FD1', text: 'BOBA' },
]
const SHOP_ROW = SHOPS.reduce((n, s) => n + s.w, 0)

function draw(ctx: Ctx, now: number, t: number, g: Game, phase: Phase, font: string) {
  const progress = Math.max(0, Math.min(1, (t - COUNT_IN) / (SONG_END - COUNT_IN)))
  const scroll = progress * 420
  const beatK = t > 0 ? ((t % BEAT) + BEAT) % BEAT / BEAT : 0
  const pulse = phase === 'play' ? Math.max(0, 1 - beatK * 3) : 0

  // Night sky
  ctx.fillStyle = '#1A1730'
  ctx.fillRect(0, 0, W, GROUND)
  ctx.fillStyle = '#231F3D'
  ctx.fillRect(0, 60, W, GROUND - 60)
  ctx.fillStyle = '#F4F1EA'
  for (let i = 0; i < 14; i++) ctx.fillRect((i * 67 + 13) % W, (i * 23) % 50 + 4, 2, 2)

  // Shophouses down Beach Street, scrolling past
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let rep = -1; rep < 3; rep++) {
    let x = rep * SHOP_ROW - (scroll % SHOP_ROW)
    for (const s of SHOPS) {
      if (x + s.w > -10 && x < W + 10) {
        const top = GROUND - s.h
        ctx.fillStyle = '#1B1F24'
        ctx.fillRect(x, top, s.w, s.h)
        ctx.fillStyle = s.wall
        ctx.fillRect(x + 2, top + 2, s.w - 4, s.h - 2)
        // Windows, lit warm
        for (let wy = top + 12; wy < GROUND - 60; wy += 26) {
          for (let wx = x + 10; wx < x + s.w - 18; wx += 22) {
            ctx.fillStyle = (wx + wy) % 3 ? '#F2C94C' : '#8C6A2A'
            ctx.fillRect(wx, wy, 12, 14)
          }
        }
        // Shop sign and awning
        ctx.fillStyle = '#1B1F24'
        ctx.fillRect(x + 6, GROUND - 56, s.w - 12, 18)
        ctx.fillStyle = s.sign
        ctx.fillRect(x + 8, GROUND - 54, s.w - 16, 14)
        ctx.fillStyle = '#FBF3DF'
        ctx.font = `bold 11px ${font}`
        ctx.fillText(s.text, x + s.w / 2, GROUND - 46)
        ctx.fillStyle = '#E0463B'
        for (let ax = x + 4; ax < x + s.w - 4; ax += 12) {
          ctx.fillRect(ax, GROUND - 36, 6, 8)
        }
        ctx.fillStyle = '#F4F1EA'
        for (let ax = x + 10; ax < x + s.w - 4; ax += 12) ctx.fillRect(ax, GROUND - 36, 6, 8)
        ctx.fillStyle = '#2A1F1A'
        ctx.fillRect(x + s.w / 2 - 10, GROUND - 26, 20, 26)
      }
      x += s.w
    }
  }

  // The Chinatown Gate comes into view at the end of the street
  const gateX = W + 40 - progress * 220 + (phase === 'lettuce' || phase === 'done' ? 0 : 0)
  if (gateX < W + 60) drawGate(ctx, gateX, font)

  // Strings of red lanterns overhead, swaying
  for (let row = 0; row < 2; row++) {
    const y0 = 26 + row * 34
    ctx.strokeStyle = '#1B1F24'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let x = -10; x <= W + 10; x += 10) {
      const y = y0 + Math.sin((x + scroll * (1 + row * 0.3)) / 60) * 6
      if (x === -10) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    for (let i = 0; i < 8; i++) {
      const x = ((i * 52 + row * 26 - scroll * (1 + row * 0.3)) % (W + 52) + W + 52) % (W + 52) - 26
      const sway = Math.sin(now / 500 + i) * 2
      const y = y0 + Math.sin((x + scroll * (1 + row * 0.3)) / 60) * 6 + 4
      ctx.fillStyle = '#1B1F24'
      ctx.fillRect(x - 8 + sway, y, 16, 16)
      ctx.fillStyle = '#E0463B'
      ctx.fillRect(x - 6 + sway, y + 2, 12, 12)
      ctx.fillStyle = '#FFB84A'
      ctx.fillRect(x - 6 + sway, y + 6, 12, 2)
      ctx.fillRect(x - 1 + sway, y + 14, 2, 5)
    }
  }

  // The lettuce (a red envelope with lettuce leaves) hanging over the street at the end
  const lettuceIn = phase === 'lettuce' || phase === 'done' || progress > 0.92
  const grabbedAt = g.grabbed ? 1 : 0
  if (lettuceIn && !grabbedAt) {
    const lx = LETTUCE_X
    const ly = LETTUCE_Y + Math.sin(now / 300) * 3
    ctx.strokeStyle = '#1B1F24'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(lx, 0)
    ctx.lineTo(lx, ly)
    ctx.stroke()
    ctx.fillStyle = '#1B1F24'
    ctx.fillRect(lx - 14, ly, 28, 26)
    ctx.fillStyle = '#3FBF6A'
    ctx.fillRect(lx - 12, ly + 2, 24, 12)
    ctx.fillStyle = '#7CE08F'
    ctx.fillRect(lx - 8, ly + 2, 6, 6)
    ctx.fillStyle = '#D33A2C'
    ctx.fillRect(lx - 9, ly + 12, 18, 12)
    ctx.fillStyle = '#F2C94C'
    ctx.fillRect(lx - 3, ly + 15, 6, 6)
  }

  // Street
  ctx.fillStyle = '#4A4E57'
  ctx.fillRect(0, GROUND, W, TRACK_Y - 30 - GROUND)
  ctx.fillStyle = '#5A5F69'
  for (let x = -(scroll % 40); x < W; x += 40) ctx.fillRect(x, GROUND + 18, 20, 3)

  // The lion
  drawLion(ctx, now, g, phase, pulse)

  // Firecracker sparks
  for (const s of g.sparks) {
    if (now < s.born) continue
    ctx.globalAlpha = Math.max(0, 1 - (now - s.born) / 900)
    ctx.fillStyle = s.color
    ctx.fillRect(s.x - 2, s.y - 2, 4, 4)
    ctx.globalAlpha = 1
  }

  // ---- The drum track
  const ty = TRACK_Y
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(0, ty - 34, W, H - ty + 34)
  ctx.fillStyle = '#3A1818'
  ctx.fillRect(0, ty - 30, W, 60)
  ctx.fillStyle = '#E8B43A'
  ctx.fillRect(0, ty - 32, W, 2)
  ctx.fillRect(0, ty + 30, W, 2)
  // Beat lines
  if (phase === 'play') {
    const first = Math.ceil((t - 200) / BEAT) * BEAT
    ctx.fillStyle = 'rgba(232, 180, 58, 0.25)'
    for (let at = first; at < t + TRAVEL; at += BEAT) {
      const x = HIT_X + ((at - t) / TRAVEL) * (W + 20 - HIT_X)
      ctx.fillRect(Math.round(x), ty - 30, 2, 60)
    }
  }
  // The drum you hit on
  const r = 25 + pulse * 3
  ctx.fillStyle = '#1B1F24'
  ctx.beginPath()
  ctx.arc(HIT_X, ty, r + 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#D33A2C'
  ctx.beginPath()
  ctx.arc(HIT_X, ty, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#F4E3C1'
  ctx.beginPath()
  ctx.arc(HIT_X, ty, r - 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#E8B43A'
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    ctx.fillRect(HIT_X + Math.cos(a) * (r - 2) - 1, ty + Math.sin(a) * (r - 2) - 1, 3, 3)
  }
  // Arrows
  for (const n of g.notes) {
    if (n.state === 'hit') {
      const k = (now - n.doneAt) / 260
      if (k < 1) {
        ctx.globalAlpha = 1 - k
        arrow(ctx, HIT_X, ty, n.dir, DIRS[n.dir].color, 1 + k * 0.6)
        ctx.globalAlpha = 1
      }
      continue
    }
    const x = HIT_X + ((n.at - t) / TRAVEL) * (W + 20 - HIT_X)
    if (x > W + 30 || x < -30) continue
    ctx.globalAlpha = n.state === 'miss' ? 0.3 : 1
    arrow(ctx, x, ty, n.dir, DIRS[n.dir].color, 0.9)
    ctx.globalAlpha = 1
  }
  // Lettuce meter
  if (phase === 'lettuce') {
    const k = Math.min(1, g.taps / LETTUCE_TAPS)
    const left = Math.max(0, 1 - (now - g.lettuceStart) / LETTUCE_MS)
    ctx.fillStyle = 'rgba(15,19,24,0.75)'
    ctx.fillRect(0, ty - 30, W, 60)
    ctx.fillStyle = '#FBF3DF'
    ctx.font = `bold 15px ${font}`
    ctx.textAlign = 'center'
    ctx.fillText('TAP FAST! Rear up for the lettuce!', W / 2, ty - 12)
    ctx.fillStyle = '#1B1F24'
    ctx.fillRect(30, ty + 2, W - 60, 16)
    ctx.fillStyle = '#3FBF6A'
    ctx.fillRect(32, ty + 4, (W - 64) * k, 12)
    ctx.fillStyle = '#E8B43A'
    ctx.fillRect(32, ty + 20, (W - 64) * left, 3)
  }
  // The crowd along the curb, bouncing on the beat and cheering harder as your combo grows
  ctx.fillStyle = '#2A1F1A'
  ctx.fillRect(0, ty + 34, W, H - ty - 34)
  const cheer = Math.min(1, g.combo / 10) + (g.grabbed ? 1 : 0)
  const CROWD = ['#E0463B', '#5BB4F5', '#F2C94C', '#3FBF6A', '#B57BE0', '#F28A3A', '#E8E2D6']
  const SKIN = ['#F1C9A5', '#D9A57B', '#A8724C', '#7A4E31']
  for (let i = 0; i < 13; i++) {
    const cx = 6 + i * 28 + (i % 2) * 6
    const jump = Math.round((i % 3 === Math.floor(now / BEAT) % 3 ? 1 : 0) * (2 + cheer * 6) * pulse + Math.sin(now / 200 + i) * cheer * 2)
    const cy = H - 8 - (i % 2) * 10 - jump
    ctx.fillStyle = '#1B1F24'
    ctx.fillRect(cx - 2, cy - 32, 24, 42)
    ctx.fillStyle = CROWD[i % CROWD.length]
    ctx.fillRect(cx, cy - 12, 20, 22)
    ctx.fillStyle = SKIN[i % SKIN.length]
    ctx.fillRect(cx + 2, cy - 30, 16, 16)
    ctx.fillStyle = '#1B1F24'
    ctx.fillRect(cx + 2, cy - 30, 16, 5)
    // Arms up when they cheer
    if (cheer > 0.5 && (i + Math.floor(now / BEAT)) % 2 === 0) {
      ctx.fillStyle = '#1B1F24'
      ctx.fillRect(cx - 4, cy - 40, 5, 16)
      ctx.fillRect(cx + 19, cy - 40, 5, 16)
    }
  }

  // Floating text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const f of g.floaters) {
    const k = (now - f.born) / 1000
    ctx.globalAlpha = Math.max(0, 1 - k * k)
    ctx.font = `bold ${f.big ? 24 : 16}px ${font}`
    ctx.lineWidth = 4
    ctx.strokeStyle = '#1B1F24'
    ctx.strokeText(f.text, f.x, f.y - k * 30)
    ctx.fillStyle = f.color
    ctx.fillText(f.text, f.x, f.y - k * 30)
    ctx.globalAlpha = 1
  }
}

function drawGate(ctx: Ctx, x: number, font: string) {
  // Paifang: red pillars, a green tiled roof with gold trim, and the sign over the middle
  const top = 92
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(x - 6, top + 34, 18, GROUND - top - 34)
  ctx.fillRect(x + 110, top + 34, 18, GROUND - top - 34)
  ctx.fillStyle = '#C0392B'
  ctx.fillRect(x - 4, top + 36, 14, GROUND - top - 36)
  ctx.fillRect(x + 112, top + 36, 14, GROUND - top - 36)
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(x - 26, top, 174, 16)
  ctx.fillRect(x - 14, top + 14, 150, 24)
  ctx.fillStyle = '#2F8A5A'
  ctx.fillRect(x - 24, top + 2, 170, 12)
  ctx.fillStyle = '#3FA56C'
  for (let i = x - 22; i < x + 144; i += 8) ctx.fillRect(i, top + 2, 4, 12)
  ctx.fillStyle = '#E8B43A'
  ctx.fillRect(x - 30, top - 4, 10, 8)
  ctx.fillRect(x + 142, top - 4, 10, 8)
  ctx.fillRect(x - 12, top + 16, 146, 20)
  ctx.fillStyle = '#2F5E9E'
  ctx.fillRect(x + 30, top + 18, 62, 16)
  ctx.fillStyle = '#F2C94C'
  ctx.font = `bold 10px ${font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('天下為公', x + 61, top + 26)
}

function drawLion(ctx: Ctx, now: number, g: Game, phase: Phase, pulse: number) {
  const x0 = 150
  const k = Math.max(0, 1 - (now - g.pose.at) / 260)
  const pose = k > 0 ? g.pose.dir : null
  const stumble = now - g.pose.miss < 300 ? Math.round(Math.sin(now / 20) * 3) : 0
  const lettuce = phase === 'lettuce' || (phase === 'done' && g.grabbed)
  const rear = lettuce ? Math.min(52, 8 + g.taps * 4.4) : pose === 1 ? 24 * k : 0
  const crouch = pose === 3 ? 8 * k : 0
  const headDX = pose === 0 ? -12 * k : pose === 2 ? 12 * k : 0
  const bob = Math.round(pulse * 3)
  const ground = GROUND + 34
  const bodyY = ground - 50 + crouch + bob

  // Legs: two dancers in yellow pants, stepping on the beat
  const step = Math.floor(now / (BEAT / 2)) % 2
  const legs = [x0 - 56, x0 - 44, x0 - 14, x0 - 2]
  legs.forEach((lx, i) => {
    const lift = (i % 2 === step ? 3 : 0) + (i >= 2 ? rear * 0.35 : 0)
    ctx.fillStyle = '#1B1F24'
    ctx.fillRect(lx - 1, bodyY + 22 - lift, 10, ground - bodyY - 22)
    ctx.fillStyle = '#F2C94C'
    ctx.fillRect(lx + 1, bodyY + 22 - lift, 6, ground - bodyY - 28)
    ctx.fillStyle = '#D33A2C'
    ctx.fillRect(lx + 1, bodyY + 30 - lift, 6, 3)
    ctx.fillStyle = '#1B1F24'
    ctx.fillRect(lx - 1, ground - 6 - lift, 12, 6)
  })

  // Body: red cloth with gold scales and a white fur fringe, tail tuft at the back
  const sx = stumble
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(x0 - 66 + sx, bodyY - 2, 76, 30)
  ctx.fillStyle = '#D33A2C'
  ctx.fillRect(x0 - 64 + sx, bodyY, 72, 26)
  ctx.fillStyle = '#E8B43A'
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) ctx.fillRect(x0 - 60 + sx + i * 12 + j * 6, bodyY + 4 + j * 8, 5, 4)
  ctx.fillStyle = '#F4F1EA'
  for (let i = 0; i < 12; i++) ctx.fillRect(x0 - 64 + sx + i * 6, bodyY + 22 + (i % 2) * 3, 5, 5)
  ctx.fillStyle = '#F4F1EA'
  ctx.fillRect(x0 - 74 + sx, bodyY - 6 + Math.round(Math.sin(now / 120) * 2), 12, 14)
  ctx.fillStyle = '#E8B43A'
  ctx.fillRect(x0 - 72 + sx, bodyY - 2 + Math.round(Math.sin(now / 120) * 2), 8, 6)

  // Head: red and gold with a horn, a mirror on the brow, big eyes and a white beard
  const hx = x0 + 6 + headDX + sx
  const hy = bodyY - 26 - rear
  const mouth = pose !== null && k > 0.4
  // Neck: the cloth stretches up from the body when the lion rears
  if (rear > 2) {
    ctx.fillStyle = '#1B1F24'
    ctx.fillRect(hx + 2, hy + 36, 40, bodyY - hy - 34)
    ctx.fillStyle = '#D33A2C'
    ctx.fillRect(hx + 4, hy + 36, 36, bodyY - hy - 34)
    ctx.fillStyle = '#E8B43A'
    for (let y = hy + 42; y < bodyY; y += 8) ctx.fillRect(hx + 10 + ((y / 8) % 2) * 12, y, 5, 4)
  }
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(hx - 2, hy - 2, 48, 44)
  ctx.fillStyle = '#D33A2C'
  ctx.fillRect(hx, hy, 44, 40)
  ctx.fillStyle = '#E8B43A'
  ctx.fillRect(hx, hy, 44, 7)
  ctx.fillRect(hx + 18, hy - 8, 8, 8)
  ctx.fillStyle = '#9FD3F5'
  ctx.fillRect(hx + 19, hy + 1, 6, 5)
  // Eyes (blinking now and then)
  const blink = Math.floor(now / 2400) % 5 === 0 && now % 2400 < 140
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(hx + 8, hy + 10, 11, blink ? 2 : 9)
  ctx.fillRect(hx + 26, hy + 10, 11, blink ? 2 : 9)
  if (!blink) {
    ctx.fillStyle = '#1B1F24'
    ctx.fillRect(hx + 13 + (pose === 2 ? 2 : pose === 0 ? -2 : 0), hy + 13, 4, 5)
    ctx.fillRect(hx + 31 + (pose === 2 ? 2 : pose === 0 ? -2 : 0), hy + 13, 4, 5)
  }
  ctx.fillStyle = '#E8B43A'
  ctx.fillRect(hx + 6, hy + 8, 15, 2)
  ctx.fillRect(hx + 24, hy + 8, 15, 2)
  // Mouth, open when it moves
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(hx + 8, hy + 24, 28, mouth ? 10 : 4)
  ctx.fillStyle = '#F4F1EA'
  for (let i = 0; i < 5; i++) ctx.fillRect(hx + 10 + i * 5, hy + 24, 3, 3)
  // Beard
  ctx.fillStyle = '#F4F1EA'
  for (let i = 0; i < 8; i++) ctx.fillRect(hx + 2 + i * 5, hy + 36 + (mouth ? 6 : 0) + (i % 2) * 3, 5, 6)
  // Lettuce in its mouth once grabbed
  if (g.grabbed) {
    ctx.fillStyle = '#3FBF6A'
    ctx.fillRect(hx + 12, hy + 22, 20, 10)
    ctx.fillStyle = '#D33A2C'
    ctx.fillRect(hx + 16, hy + 30, 12, 8)
  }
}
