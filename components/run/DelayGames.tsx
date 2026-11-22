'use client'

// Two more Delay Boss fights, in pixel style, so delays don't all play the same:
//
// - Signal Repair: the boss jams the signals. Watch the lights flash in order, then repeat the
//   pattern. Each fixed sequence hits the boss and the next one is a light longer.
// - Platform Dodge: the boss rains debris down three lanes of the platform. Dodge it (a red "!"
//   warns where it'll fall) and grab the power cells it drops; each one zaps the boss.
//
// Either way you have to beat it before your train arrives. These run on the device: their
// damage doesn't count toward the line's shared, server-side Delay Boss HP (the trivia fight does).

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Heart, Map as MapIcon, Skull, TrainFront, Trophy, X, Zap } from 'lucide-react'
import { LINES, type LineId } from './stations'
import { BOSSES } from './DelayBoss'
import { Coin } from './fantasy'
import { NUM, PANEL, PixelScreen } from './pixel'
import { StatusBar } from './ui'
import { MINI_BOSS } from './stats'
import { DelayChart } from '@/components/game/DelayChart'

const TEAM_NAME: Record<LineId, 'Red' | 'Green' | 'Orange'> = { red: 'Red', green: 'Green', orange: 'Orange' }

export type DelayGameKind = 'signal' | 'dodge'

type Outcome = 'won' | 'escaped' | 'ko'
type Result = { outcome: Outcome; dealt: number; gold: number }

const HP = MINI_BOSS.hp
const HEARTS = 3
const goldFor = (outcome: Outcome, dealt: number) =>
  outcome === 'won' ? MINI_BOSS.winBonus + dealt : Math.round(dealt * MINI_BOSS.partialRate)

export function DelayGame({
  kind,
  bossIndex,
  line,
  onExit,
  persona,
}: {
  kind: DelayGameKind
  bossIndex: number
  line: LineId
  onExit: (gold: number) => void
  /** Name and taunt Gemini wrote for this delay; falls back to BOSSES. */
  persona?: { name: string; taunt: string } | null
}) {
  const boss = persona ?? BOSSES[bossIndex % BOSSES.length]
  const props = { boss, bossIndex, line, onExit }
  return kind === 'signal' ? <SignalRepair {...props} /> : <PlatformDodge {...props} />
}

type GameProps = { boss: { name: string; taunt: string }; bossIndex: number; line: LineId; onExit: (gold: number) => void }

// ---------- Shared HUD ----------

function Hud({
  boss,
  line,
  mode,
  hp,
  hearts,
  train,
  trainMax,
}: {
  boss: { name: string }
  line: LineId
  mode: string
  hp: number
  hearts: number
  train: number
  trainMax: number
}) {
  const info = LINES[line]
  const low = train <= 10
  return (
    <>
      <header className={`absolute inset-x-4 top-[56px] z-10 flex h-[56px] items-center gap-2 pl-3 pr-[54px] ${PANEL}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink text-white" style={{ backgroundColor: info.color }}>
          <Skull size={18} strokeWidth={2.6} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-pixel text-[12px] leading-none text-muted">
            Delay Boss · {info.name} · {mode}
          </p>
          <h1 className="truncate font-pixel text-[18px] font-bold leading-tight">{boss.name}</h1>
        </div>
      </header>
      <div className="absolute inset-x-4 top-[122px] z-10 space-y-1.5">
        <div className="relative h-[16px] border-[3px] border-ink bg-[#3A1414]" role="meter" aria-label="Boss health" aria-valuemin={0} aria-valuemax={HP} aria-valuenow={hp}>
          <div className="h-full transition-[width] duration-300" style={{ width: `${(hp / HP) * 100}%`, backgroundColor: info.color }} />
        </div>
        <div className="flex items-center gap-2 font-pixel text-[13px] font-bold text-[#FBF3DF]">
          <span className="flex items-center gap-0.5" aria-label={`${hearts} hearts`}>
            {Array.from({ length: HEARTS }, (_, i) => (
              <Heart key={i} size={17} strokeWidth={2.6} className={i < hearts ? 'fill-[#E0463B] text-[#1B1F24]' : 'fill-[#3A3F47] text-[#1B1F24]'} />
            ))}
          </span>
          <span className={`${NUM} ml-1 text-[12px] text-[#C9CED6]`}>
            {hp}/{HP}
          </span>
          <span
            className={`ml-auto flex items-center gap-1.5 border-2 border-ink px-2 leading-[22px] text-ink ${low ? 'animate-pulse bg-[#DA291C] text-white' : 'bg-[#FBF3DF]'}`}
            aria-label={`Your train arrives in ${train} seconds`}
          >
            <TrainFront size={14} strokeWidth={2.8} />
            <span className={NUM}>
              {Math.floor(train / 60)}:{String(train % 60).padStart(2, '0')}
            </span>
          </span>
        </div>
        {/* How close your train is: when it arrives, the boss gets away */}
        <div className="h-[6px] border-2 border-ink bg-[#26313E]">
          <div className="h-full bg-[#F2C94C] transition-[width] duration-1000 ease-linear" style={{ width: `${((trainMax - train) / trainMax) * 100}%` }} />
        </div>
      </div>
    </>
  )
}

function Intro({ boss, line, title, rules, onStart }: { boss: { name: string; taunt: string }; line: LineId; title: string; rules: ReactNode; onStart: () => void }) {
  const info = LINES[line]
  return (
    <div className="absolute inset-0 z-20 flex animate-fade-in items-center justify-center bg-[#0F1318]/70 px-6">
      <div className={`w-full animate-pop p-4 text-center ${PANEL}`}>
        <p className="flex items-center justify-center gap-1.5 font-pixel text-[12px] font-bold tracking-[0.1em] text-[#DA291C]">
          <TrainFront size={14} strokeWidth={2.8} /> DELAY ON THE {info.name.toUpperCase()}
        </p>
        <p className="font-pixel text-[23px] font-bold leading-tight">{boss.name}</p>
        <p className="mt-1 text-[13px] italic leading-snug text-ink-soft">{boss.taunt}</p>
        {/* The real delay on this line, from Tiger Data */}
        <div className="mt-2 flex justify-center">
          <DelayChart line={TEAM_NAME[line]} />
        </div>
        <p className="mt-2.5 font-pixel text-[17px] font-bold">{title}</p>
        <div className="mt-1 text-[13px] leading-snug">{rules}</div>
        <button
          type="button"
          onClick={onStart}
          autoFocus
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 border-[3px] border-ink font-pixel text-[18px] font-bold text-white shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          style={{ backgroundColor: info.color }}
        >
          <Zap size={18} strokeWidth={2.8} /> Fight!
        </button>
      </div>
    </div>
  )
}

function Results({ boss, line, result, onExit }: { boss: { name: string }; line: LineId; result: Result; onExit: (gold: number) => void }) {
  const info = LINES[line]
  const won = result.outcome === 'won'
  const title = won ? 'Boss defeated!' : result.outcome === 'escaped' ? 'Your train is here!' : 'Knocked out!'
  const text = won
    ? `${boss.name} is beaten, and the ${info.name} is moving again.`
    : result.outcome === 'escaped'
      ? `You hop on, and ${boss.name} slips away into the tunnel.`
      : `${boss.name} was too much this time.`
  return (
    <div className="absolute inset-0 z-30 flex animate-fade-in items-center justify-center bg-[#0F1318]/75 px-5">
      <div role="dialog" aria-modal="true" aria-labelledby="delay-done" className={`w-full animate-pop p-4 text-center ${PANEL}`}>
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center border-[3px] border-ink text-white"
          style={{ backgroundColor: won ? '#2F7A4A' : '#8C3A30' }}
        >
          {won ? <Trophy size={28} strokeWidth={2.6} /> : result.outcome === 'escaped' ? <TrainFront size={28} strokeWidth={2.6} /> : <Skull size={28} strokeWidth={2.6} />}
        </span>
        <h2 id="delay-done" className="mt-2 font-pixel text-[27px] font-bold leading-none">
          {title}
        </h2>
        <p className="mt-1.5 text-[13.5px] leading-snug text-ink-soft">{text}</p>
        <p className="mt-1 text-[13px] font-semibold text-muted">
          <span className={NUM}>{result.dealt}</span> damage dealt
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 border-2 border-ink bg-[#FFE7A3] py-2">
          <Coin size={24} />
          <span className={`text-[24px] text-[#7A4D0E] ${NUM}`}>+{result.gold}</span>
          <span className="font-pixel text-[14px] text-[#7A4D0E]">gold</span>
        </div>
        <button
          type="button"
          onClick={() => onExit(result.gold)}
          autoFocus
          className="mt-4 flex h-12 w-full items-center justify-center gap-1.5 border-[3px] border-ink font-pixel text-[16px] font-bold text-white shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          style={{ backgroundColor: info.color }}
        >
          <MapIcon size={17} strokeWidth={2.8} />
          Back to map
        </button>
      </div>
    </div>
  )
}

function QuitButton({ onQuit }: { onQuit: () => void }) {
  return (
    <button
      type="button"
      onClick={onQuit}
      aria-label="Sit this one out"
      className="absolute right-[26px] top-[66px] z-20 flex h-9 w-9 items-center justify-center border-2 border-ink bg-[#F1E7CF] active:translate-x-[1px] active:translate-y-[1px]"
    >
      <X size={18} strokeWidth={3} />
    </button>
  )
}

/** Counts the train down once a fight starts; calls onArrive at 0. */
function useTrain(seconds: number, running: boolean, onArrive: () => void) {
  const [train, setTrain] = useState(seconds)
  const arrive = useRef(onArrive)
  useEffect(() => {
    arrive.current = onArrive
  })
  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => {
      setTrain((s) => {
        if (s <= 1) {
          window.setTimeout(() => arrive.current(), 0)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(t)
  }, [running])
  return train
}

// ---------- Boss art ----------

type Ctx = CanvasRenderingContext2D

function sprite(ctx: Ctx, rows: string[], pal: Record<string, string>, x: number, y: number, u: number) {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const col = pal[rows[r][c]]
      if (!col) continue
      ctx.fillStyle = col
      ctx.fillRect(Math.round(x + c * u), Math.round(y + r * u), u, u)
    }
  }
}

/** A delay boss as a living signal post: its lamps are its eyes. Body color differs per boss. */
const SIGNAL_BOT = [
  '.....kkkk.....',
  '....kSSSSk....',
  '...kSkkkkSk...',
  '...kSkEEkSk...',
  '...kSkkkkSk...',
  '...kSkYYkSk...',
  '...kSkkkkSk...',
  '...kSkGGkSk...',
  '...kSkkkkSk...',
  '....kSSSSk....',
  '.kk..kAAk..kk.',
  'kAAkkAAAAkkAAk',
  '.kk.kAAAAk.kk.',
  '....kAAAAk....',
  '...kAAkkAAk...',
  '..kkk....kkk..',
]
const BODIES = ['#3A3F47', '#7A3B1E', '#2F5D8A', '#5A5A2A', '#4B3A6B']
const botPal = (bossIndex: number, flash: boolean, eyes = '#FF3B30') =>
  flash
    ? { k: '#FFFFFF', S: '#FFFFFF', A: '#FFFFFF', E: '#FFFFFF', Y: '#FFFFFF', G: '#FFFFFF' }
    : { k: '#1B1F24', S: BODIES[bossIndex % BODIES.length], A: '#8C939C', E: eyes, Y: '#6B5A1E', G: '#1E4A2C' }

const RIDER = ['...hhhh...', '..hhhhhh..', '..hhhhhh..', '...ssss...', '..cccccc..', '.bccccccb.', '.bccccccb.', '..cccccc..', '..pp..pp..', '..kk..kk..']
const RIDER_PAL = { h: '#1B1F24', s: '#F1C9A5', c: '#F2B233', b: '#C0392B', p: '#2B3A55', k: '#1B1F24' }

function useCanvas(w: number, h: number, draw: (ctx: Ctx, now: number) => void) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  useEffect(() => {
    drawRef.current = draw
  })
  useEffect(() => {
    const canvas = ref.current!
    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr
    canvas.height = h * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.imageSmoothingEnabled = false
    let raf = 0
    const frame = (now: number) => {
      drawRef.current(ctx, now)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [w, h])
  return ref
}

// ---------- Signal Repair ----------

const LAMPS = [
  { name: 'STOP', on: '#FF4A3D', off: '#5A1E1A' },
  { name: 'SLOW', on: '#FFD24A', off: '#5A4A1A' },
  { name: 'GO', on: '#3FE07A', off: '#1A4A2A' },
  { name: 'FAST', on: '#CFE9FF', off: '#33414F' },
]
const SIGNAL_TRAIN = 60
const START_LEN = 3
/** Damage for repeating a sequence: longer ones hit harder. */
const seqDamage = (len: number) => 15 * len

type SigPhase = 'intro' | 'show' | 'input' | 'good' | 'bad' | 'done'

function SignalRepair({ boss, bossIndex, line, onExit }: GameProps) {
  const [phase, setPhase] = useState<SigPhase>('intro')
  const [seq, setSeq] = useState<number[]>([])
  const [step, setStep] = useState(0)
  const [lit, setLit] = useState<number | null>(null)
  const [hp, setHp] = useState(HP)
  const [hearts, setHearts] = useState(HEARTS)
  const [result, setResult] = useState<Result | null>(null)
  const [hitAt, setHitAt] = useState(0)
  const timers = useRef<number[]>([])
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const finish = (outcome: Outcome, hpLeft: number) => {
    timers.current.forEach((t) => window.clearTimeout(t))
    setPhase('done')
    const dealt = HP - hpLeft
    setResult({ outcome, dealt, gold: goldFor(outcome, dealt) })
  }
  const train = useTrain(SIGNAL_TRAIN, phase !== 'intro' && phase !== 'done', () => finish('escaped', hp))

  /** Flash the sequence on the signal, then hand over to the player. Faster as it grows. */
  const show = (s: number[]) => {
    setSeq(s)
    setStep(0)
    setPhase('show')
    const on = Math.max(300, 520 - s.length * 30)
    const gap = 170
    s.forEach((lamp, i) => {
      later(600 + i * (on + gap), () => setLit(lamp))
      later(600 + i * (on + gap) + on, () => setLit(null))
    })
    later(600 + s.length * (on + gap), () => setPhase('input'))
  }

  const rand = () => Math.floor(Math.random() * LAMPS.length)
  const start = () => show(Array.from({ length: START_LEN }, rand))

  const press = (lamp: number) => {
    if (phase !== 'input') return
    setLit(lamp)
    later(170, () => setLit((l) => (l === lamp ? null : l)))
    if (lamp !== seq[step]) {
      // Wrong light: the boss shocks you, then shows the same pattern again
      const h = hearts - 1
      setHearts(h)
      setPhase('bad')
      setHitAt(performance.now())
      if (h <= 0) later(900, () => finish('ko', hp))
      else later(1100, () => show(seq))
      return
    }
    if (step + 1 < seq.length) {
      setStep(step + 1)
      return
    }
    // Whole pattern right: the signal's fixed and it hurts the boss. Next one is a light longer.
    const left = Math.max(0, hp - seqDamage(seq.length))
    setHp(left)
    setStep(seq.length)
    setPhase('good')
    setHitAt(performance.now())
    if (left <= 0) later(900, () => finish('won', 0))
    else later(1000, () => show([...seq, rand()]))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= 4) press(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // The boss, jamming the signal while the pattern plays and flinching when you fix it
  const BW = 361
  const BH = 150
  const canvas = useCanvas(BW, BH, (ctx, now) => {
    const t = now / 1000
    ctx.fillStyle = '#1C2129'
    ctx.fillRect(0, 0, BW, BH)
    // Tunnel arch and tracks
    ctx.fillStyle = '#262C36'
    for (let x = 0; x < BW; x += 24) ctx.fillRect(x, 0, 12, BH - 30)
    ctx.fillStyle = '#3A3F47'
    ctx.fillRect(0, BH - 30, BW, 30)
    ctx.fillStyle = '#6E655A'
    for (let x = 0; x < BW; x += 14) ctx.fillRect(x, BH - 22, 8, 16)
    ctx.fillStyle = '#A8A8A8'
    ctx.fillRect(0, BH - 20, BW, 3)
    ctx.fillRect(0, BH - 10, BW, 3)
    const since = now - hitAt
    const shake = phase === 'show' ? Math.round(Math.sin(t * 50) * 2) : since < 300 ? Math.round(Math.sin(t * 90) * 4) : 0
    const flash = phase === 'good' && since < 160
    const eyes = lit !== null && phase === 'show' ? LAMPS[lit].on : '#FF3B30'
    sprite(ctx, SIGNAL_BOT, botPal(bossIndex, flash, eyes), BW / 2 - 42 + shake, 8 + Math.round(Math.sin(t * 2) * 2), 6)
    // Zap toward you when you get it wrong
    if (phase === 'bad' && since < 500) {
      ctx.fillStyle = Math.floor(now / 60) % 2 ? '#FFE38A' : '#FFFFFF'
      for (let i = 0, y = 90; y < BH; i++, y += 10) ctx.fillRect(BW / 2 + (i % 2 ? 8 : -8), y, 6, 10)
    }
  })

  const message =
    phase === 'show'
      ? 'Watch the signal…'
      : phase === 'input'
        ? `Your turn: ${step} / ${seq.length}`
        : phase === 'good'
          ? `Signal fixed! −${seqDamage(seq.length)}`
          : phase === 'bad'
            ? 'Wrong light! Watch again…'
            : ''

  return (
    <PixelScreen>
      <StatusBar tone="light" />
      <Hud boss={boss} line={line} mode="Signal Repair" hp={hp} hearts={hearts} train={train} trainMax={SIGNAL_TRAIN} />
      <QuitButton onQuit={() => onExit(0)} />

      <div className="absolute left-4 top-[200px] border-[3px] border-ink" style={{ width: BW + 6, height: BH + 6 }}>
        <canvas ref={canvas} style={{ width: BW, height: BH }} className="block [image-rendering:pixelated]" aria-hidden />
      </div>
      <p className="absolute inset-x-4 top-[364px] text-center font-pixel text-[17px] font-bold text-[#FBF3DF]" aria-live="polite">
        {message}
      </p>

      {/* The signal head: four lamps you tap to repeat the pattern */}
      <div className="absolute inset-x-4 top-[398px] grid grid-cols-2 gap-2.5 border-[3px] border-ink bg-[#1B1F24] p-2.5 shadow-[4px_4px_0_rgba(15,19,24,0.7)]">
        {LAMPS.map((l, i) => {
          const on = lit === i
          return (
            <button
              key={l.name}
              type="button"
              aria-label={`${l.name} light`}
              onPointerDown={(e) => {
                e.preventDefault()
                press(i)
              }}
              className="flex h-[150px] touch-none select-none flex-col items-center justify-center gap-2 border-[3px] border-ink bg-[#2A2F37]"
            >
              <span
                className="h-[86px] w-[86px] rounded-full border-[4px] border-[#0F1318] transition-[background-color,box-shadow] duration-75"
                style={{ backgroundColor: on ? l.on : l.off, boxShadow: on ? `0 0 28px 8px ${l.on}` : 'inset 0 -6px 0 rgba(0,0,0,0.35)' }}
              />
              <span className="font-pixel text-[13px] font-bold tracking-[0.08em]" style={{ color: on ? l.on : '#8C939C' }}>
                {l.name}
              </span>
            </button>
          )
        })}
      </div>

      {phase === 'intro' && (
        <Intro
          boss={boss}
          line={line}
          title="Signal Repair"
          rules={<>The boss jammed the signals. Watch the lights flash, then tap them back in the same order. Every fixed pattern hurts it, and the next one gets longer. Wrong light costs a heart. Beat it before your train arrives!</>}
          onStart={start}
        />
      )}
      {result && <Results boss={boss} line={line} result={result} onExit={onExit} />}
    </PixelScreen>
  )
}

// ---------- Platform Dodge ----------

const DODGE_TRAIN = 45
const W = 361
const H = 440
const LANE_X = [W / 6, W / 2, (W * 5) / 6]
const PLAYER_Y = 368
const DROP_Y = 128
const WARN_MS = 520
/** Each power cell you grab zaps the boss for this much. */
const CELL_DAMAGE = 25

type Drop = { lane: number; kind: 'debris' | 'cell'; born: number; y: number; speed: number; done: boolean }
type Zap = { born: number; lane: number }
type Dodge = {
  lane: number
  drawX: number
  drops: Drop[]
  next: number
  lastCell: number
  bossLane: number
  hp: number
  hearts: number
  safeUntil: number
  hurt: number
  zaps: Zap[]
  over: boolean
  started: number
  last: number
}

function PlatformDodge({ boss, bossIndex, line, onExit }: GameProps) {
  const [started, setStarted] = useState(false)
  const [hud, setHud] = useState({ hp: HP, hearts: HEARTS })
  const [result, setResult] = useState<Result | null>(null)
  const g = useRef<Dodge>({
    lane: 1,
    drawX: LANE_X[1],
    drops: [],
    next: 0,
    lastCell: 0,
    bossLane: 1,
    hp: HP,
    hearts: HEARTS,
    safeUntil: 0,
    hurt: 0,
    zaps: [],
    over: false,
    started: 0,
    last: 0,
  })
  const swipe = useRef<number | null>(null)

  const finish = (outcome: Outcome) => {
    const s = g.current
    if (s.over) return
    s.over = true
    const dealt = HP - s.hp
    window.setTimeout(() => setResult({ outcome, dealt, gold: goldFor(outcome, dealt) }), outcome === 'escaped' ? 0 : 800)
  }
  const train = useTrain(DODGE_TRAIN, started && !result, () => finish('escaped'))

  const move = (d: number) => {
    const s = g.current
    if (!started || s.over) return
    s.lane = Math.max(0, Math.min(2, s.lane + d))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') move(-1)
      else if (e.key === 'ArrowRight' || e.key === 'd') move(1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const startFight = () => {
    const now = performance.now()
    Object.assign(g.current, { started: now, next: now + 900, lastCell: now })
    setStarted(true)
  }

  const canvas = useCanvas(W, H, (ctx, now) => {
    const s = g.current
    const t = now / 1000
    const running = started && !s.over
    const dt = Math.min(50, now - (s.last || now))
    s.last = now

    // ---- update
    if (running) {
      const elapsed = (now - s.started) / 1000
      // The boss drops faster as the fight goes on, and below half HP it sometimes drops two at once
      if (now >= s.next) {
        const needCell = now - s.lastCell > 2600
        const kind: Drop['kind'] = needCell || Math.random() < 0.26 ? 'cell' : 'debris'
        const lane = Math.floor(Math.random() * 3)
        const speed = 230 + Math.min(170, elapsed * 5)
        s.drops.push({ lane, kind, born: now, y: DROP_Y, speed, done: false })
        if (kind === 'cell') s.lastCell = now
        if (kind === 'debris' && s.hp <= HP / 2 && Math.random() < 0.45) {
          const other = (lane + 1 + Math.floor(Math.random() * 2)) % 3
          s.drops.push({ lane: other, kind: 'debris', born: now, y: DROP_Y, speed, done: false })
        }
        s.bossLane = lane
        s.next = now + Math.max(520, 1000 - elapsed * 14)
      }
      for (const d of s.drops) {
        if (d.done || now - d.born < (d.kind === 'debris' ? WARN_MS : 0)) continue
        d.y += (d.speed * dt) / 1000
        if (d.lane === s.lane && Math.abs(d.y - PLAYER_Y - 20) < 26) {
          d.done = true
          if (d.kind === 'cell') {
            s.hp = Math.max(0, s.hp - CELL_DAMAGE)
            s.zaps.push({ born: now, lane: d.lane })
            setHud({ hp: s.hp, hearts: s.hearts })
            if (s.hp <= 0) finish('won')
          } else if (now > s.safeUntil) {
            s.hearts -= 1
            s.hurt = now
            s.safeUntil = now + 900
            setHud({ hp: s.hp, hearts: s.hearts })
            if (s.hearts <= 0) finish('ko')
          }
        }
        if (d.y > H + 30) d.done = true
      }
      s.drops = s.drops.filter((d) => !d.done)
      s.zaps = s.zaps.filter((z) => now - z.born < 450)
    }
    s.drawX += (LANE_X[s.lane] - s.drawX) * 0.35

    // ---- draw: the platform, seen from above, three lanes wide
    ctx.fillStyle = '#5E626A'
    ctx.fillRect(0, 0, W, H)
    for (let y = 0; y < H; y += 24) {
      for (let x = 0; x < W; x += 24) {
        ctx.fillStyle = (x / 24 + y / 24) % 2 ? '#686C74' : '#62666E'
        ctx.fillRect(x, y, 24, 24)
      }
    }
    ctx.fillStyle = '#4E5259'
    ctx.fillRect(W / 3 - 2, DROP_Y, 4, H)
    ctx.fillRect((W * 2) / 3 - 2, DROP_Y, 4, H)
    // The track and tunnel at the top, where the boss lurks
    ctx.fillStyle = '#1C2129'
    ctx.fillRect(0, 0, W, DROP_Y - 10)
    ctx.fillStyle = '#6E655A'
    for (let x = 0; x < W; x += 14) ctx.fillRect(x, DROP_Y - 38, 8, 22)
    ctx.fillStyle = '#A8A8A8'
    ctx.fillRect(0, DROP_Y - 34, W, 3)
    ctx.fillRect(0, DROP_Y - 22, W, 3)
    // Yellow tactile edge strip
    ctx.fillStyle = '#F2C94C'
    ctx.fillRect(0, DROP_Y - 10, W, 10)
    ctx.fillStyle = '#C9A23A'
    for (let x = 0; x < W; x += 8) ctx.fillRect(x + 2, DROP_Y - 8, 3, 3)

    const flash = s.zaps.some((z) => now - z.born < 140)
    const bx = LANE_X[s.bossLane] - 42 + Math.round(Math.sin(t * 3) * 3)
    sprite(ctx, SIGNAL_BOT, botPal(bossIndex, flash), bx, 6, 6)

    // Warnings, debris and power cells
    for (const d of s.drops) {
      const x = LANE_X[d.lane]
      if (d.kind === 'debris' && now - d.born < WARN_MS) {
        if (Math.floor(now / 90) % 2) {
          ctx.fillStyle = 'rgba(224, 70, 59, 0.35)'
          ctx.fillRect(x - W / 6 + 4, DROP_Y, W / 3 - 8, H - DROP_Y)
          ctx.fillStyle = '#1B1F24'
          ctx.fillRect(x - 14, DROP_Y + 8, 28, 30)
          ctx.fillStyle = '#E0463B'
          ctx.fillRect(x - 11, DROP_Y + 11, 22, 24)
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(x - 2, DROP_Y + 14, 5, 11)
          ctx.fillRect(x - 2, DROP_Y + 27, 5, 5)
        }
        continue
      }
      if (d.kind === 'debris') {
        // A chunk of rusty rail
        ctx.fillStyle = '#1B1F24'
        ctx.fillRect(x - 22, d.y - 12, 44, 24)
        ctx.fillStyle = '#8C5A3A'
        ctx.fillRect(x - 19, d.y - 9, 38, 18)
        ctx.fillStyle = '#B5754A'
        ctx.fillRect(x - 19, d.y - 9, 38, 5)
        ctx.fillStyle = '#5E3A22'
        ctx.fillRect(x - 6, d.y - 9, 4, 18)
      } else {
        // A glowing power cell
        ctx.fillStyle = `rgba(80, 255, 140, ${0.25 + 0.15 * Math.sin(t * 10)})`
        ctx.fillRect(x - 22, d.y - 22, 44, 44)
        ctx.fillStyle = '#1B1F24'
        ctx.fillRect(x - 13, d.y - 17, 26, 34)
        ctx.fillRect(x - 6, d.y - 21, 12, 5)
        ctx.fillStyle = '#3FE07A'
        ctx.fillRect(x - 10, d.y - 14, 20, 28)
        ctx.fillStyle = '#FFE38A'
        ctx.fillRect(x - 1, d.y - 11, 5, 9)
        ctx.fillRect(x - 4, d.y - 3, 8, 4)
        ctx.fillRect(x - 3, d.y + 1, 4, 9)
      }
    }

    // You
    const blink = now - s.hurt < 900 && Math.floor(now / 80) % 2 === 0
    if (!blink) sprite(ctx, RIDER, RIDER_PAL, s.drawX - 25, PLAYER_Y, 5)

    // Zaps from you to the boss
    for (const z of s.zaps) {
      const x0 = LANE_X[z.lane]
      ctx.fillStyle = Math.floor(now / 50) % 2 ? '#FFE38A' : '#FFFFFF'
      for (let i = 0, y = PLAYER_Y; y > 90; i++, y -= 16) ctx.fillRect(x0 + (bx + 42 - x0) * (1 - (y - 90) / (PLAYER_Y - 90)) + (i % 2 ? 5 : -5), y - 16, 6, 16)
    }
    // Hit flash
    const hk = (now - s.hurt) / 300
    if (hk < 1) {
      ctx.fillStyle = `rgba(220, 30, 30, ${0.3 * (1 - hk)})`
      ctx.fillRect(0, 0, W, H)
    }
  })

  return (
    <PixelScreen>
      <StatusBar tone="light" />
      <Hud boss={boss} line={line} mode="Platform Dodge" hp={hud.hp} hearts={hud.hearts} train={train} trainMax={DODGE_TRAIN} />
      <QuitButton onQuit={() => onExit(0)} />

      <div className="absolute left-4 top-[198px] border-[3px] border-ink shadow-[4px_4px_0_rgba(15,19,24,0.7)]" style={{ width: W + 6, height: H + 6 }}>
        <canvas
          ref={canvas}
          style={{ width: W, height: H, touchAction: 'none' }}
          className="block [image-rendering:pixelated]"
          role="img"
          aria-label="The platform, three lanes wide. Dodge falling debris and catch green power cells."
          onPointerDown={(e) => (swipe.current = e.clientX)}
          onPointerUp={(e) => {
            const x0 = swipe.current
            swipe.current = null
            if (x0 === null) return
            const dx = e.clientX - x0
            if (Math.abs(dx) > 18) move(Math.sign(dx))
            else {
              // A tap moves you toward that side of the platform
              const r = e.currentTarget.getBoundingClientRect()
              const lane = Math.min(2, Math.floor(((e.clientX - r.left) / r.width) * 3))
              move(Math.sign(lane - g.current.lane))
            }
          }}
        />
      </div>

      <div className="absolute inset-x-4 top-[656px] flex gap-2.5">
        {[
          { d: -1, label: 'Left', icon: <ArrowLeft size={28} strokeWidth={3} /> },
          { d: 1, label: 'Right', icon: <ArrowRight size={28} strokeWidth={3} /> },
        ].map((b) => (
          <button
            key={b.label}
            type="button"
            aria-label={`Move ${b.label.toLowerCase()}`}
            onPointerDown={(e) => {
              e.preventDefault()
              move(b.d)
            }}
            className="flex h-[66px] flex-1 touch-none select-none items-center justify-center border-[3px] border-ink bg-[#FBF3DF] shadow-[3px_3px_0_rgba(15,19,24,0.8)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            {b.icon}
          </button>
        ))}
      </div>

      {!started && (
        <Intro
          boss={boss}
          line={line}
          title="Platform Dodge"
          rules={
            <>
              <span className="block">
                Why the batteries? This boss is <b>feeding on the station&apos;s power</b>; that&apos;s what&apos;s stalling your
                train. Every <b className="text-[#2F7A4A]">green power cell</b> you grab sends the power back down the rails
                and <b>shocks the boss</b>.
              </span>
              <span className="mt-1.5 block">
                Move left and right to grab the cells and dodge the falling debris (a red <b>!</b> shows where it&apos;ll land).
                Drain the boss before your train arrives!
              </span>
            </>
          }
          onStart={startFight}
        />
      )}
      {result && <Results boss={boss} line={line} result={result} onExit={onExit} />}
    </PixelScreen>
  )
}
