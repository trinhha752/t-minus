'use client'

// Green Line End Boss: The Phantom Conductor, a rhythm battle in the 1897 Tremont Street tunnel.
// Notes fall down four lanes in time with the beat; tap each one as it reaches the line. Every
// note you land hurts him and builds your combo. Miss three and his sour chord costs a heart.
// Each phase speeds up the tempo and brings new patterns; in the last one he slips in purple
// ghost notes that you must NOT tap.

import { useEffect, useRef, useState } from 'react'
import {
  BossHeader,
  BossHp,
  BossIntro,
  BossResults,
  PhaseBanner,
  PlayerRow,
  RIDER,
  RIDER_PAL,
  drawFloaters,
  phaseOf,
  resultFor,
  sprite,
  useCanvasLoop,
  useReportResult,
  type BossResult,
  type Ctx,
  type EndFightProps,
  type Floater,
  type Phase,
} from './bossKit'
import { LINES } from './stations'
import { PixelScreen } from './pixel'
import { StatusBar } from './ui'

const NAME = 'The Phantom Conductor'
const TAUNT = '"Tickets, please. And keep the tempo, or the tunnel keeps you."'

const W = 361
const H = 404
const LANES = 4
const LANE_W = 80
const LX0 = (W - LANES * LANE_W) / 2
const laneX = (l: number) => LX0 + LANE_W * l + LANE_W / 2
const TOP = 120
const HIT_Y = 344
const COLORS = ['#3FE07A', '#FFD24A', '#5BC8F5', '#FF7AB6']
const KEYS = ['d', 'f', 'j', 'k']
const GHOST = '#8A5BD6'

type Pattern = 'quarters' | 'stairs' | 'run' | 'chords' | 'gallop' | 'ghosts'
const PHASES: Record<Phase, { name: string; bpm: number; travel: number; bars: Pattern[] }> = {
  1: { name: 'Overture', bpm: 100, travel: 1500, bars: ['quarters', 'quarters', 'stairs', 'gallop'] },
  2: { name: 'Allegro', bpm: 116, travel: 1300, bars: ['quarters', 'run', 'chords', 'gallop', 'stairs'] },
  3: { name: 'Crescendo', bpm: 132, travel: 1100, bars: ['run', 'chords', 'ghosts', 'ghosts', 'gallop'] },
}
const PERFECT_MS = 55
const GOOD_MS = 110
const WINDOW_MS = 150
const MISS_LIMIT = 3
const BANNER_MS = 1800

type Note = { lane: number; at: number; ghost: boolean; state: 'live' | 'hit' | 'miss' | 'gone'; doneAt: number }
type Fight = {
  started: number
  phase: Phase
  nextBar: number
  notes: Note[]
  beats: number[]
  beatAt: number
  hp: number
  hearts: number
  shield: boolean
  potions: number
  streak: number
  misses: number
  floaters: Floater[]
  pressed: number[]
  bossHurt: number
  youHurt: number
  sour: number
  banner: number
  over: boolean
}
type Hud = { hp: number; hearts: number; shield: boolean; potions: number; mult: number; misses: number; phase: Phase }

const SOUND_BELLS = [523.25, 587.33, 659.25, 783.99]

function newFight(maxHp: number, stats: EndFightProps['stats']): Fight {
  return {
  started: 0,
  phase: 1,
  nextBar: 0,
  notes: [],
  beats: [],
  beatAt: 0,
  hp: maxHp,
  hearts: stats.hearts,
  shield: stats.shield,
  potions: stats.potions,
  streak: 0,
  misses: 0,
  floaters: [],
  pressed: [0, 0, 0, 0],
  bossHurt: 0,
  youHurt: 0,
  sour: 0,
  banner: 0,
  over: false,
}
}

export function ConductorFight({ line, maxHp, stats, onExit, onRetry, onResult }: EndFightProps) {
  const info = LINES[line]
  // Created on first use (outside render), like the Red Line fight
  const fightRef = useRef<Fight | null>(null)
  const fight = () => (fightRef.current ??= newFight(maxHp, stats))
  const multOf = (streak: number) => Math.min(1 + Math.floor(streak / 8), stats.combo)
  const hudOf = (s: Fight): Hud => ({
    hp: s.hp,
    hearts: s.hearts,
    shield: s.shield,
    potions: s.potions,
    mult: multOf(s.streak),
    misses: s.misses,
    phase: s.phase,
  })
  const [hud, setHud] = useState<Hud>(() => hudOf(newFight(maxHp, stats)))
  const [started, setStarted] = useState(false)
  const [banner, setBanner] = useState<Phase | null>(null)
  const [result, setResult] = useState<BossResult | null>(null)
  useReportResult(result, onResult)
  const sync = () => setHud(hudOf(fight()))

  // A tiny synth: a click on every beat and a bell for each note you hit
  const audio = useRef<AudioContext | null>(null)
  useEffect(() => () => void audio.current?.close().catch(() => {}), [])
  const tone = (freq: number, dur: number, type: OscillatorType, vol: number) => {
    const ac = audio.current
    if (!ac) return
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.type = type
    o.frequency.value = freq
    g.gain.setValueAtTime(vol, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur)
    o.connect(g).connect(ac.destination)
    o.start()
    o.stop(ac.currentTime + dur)
  }

  const songTime = (now: number) => now - fight().started
  const float = (text: string, color: string, x: number, y: number, big = false) =>
    fight().floaters.push({ text, color, x, y, born: performance.now(), big })

  const finish = (won: boolean) => {
    const s = fight()
    if (s.over) return
    s.over = true
    window.setTimeout(() => setResult(resultFor(won, maxHp - s.hp)), 900)
  }

  /** The boss's sour chord (or a ghost note you touched): costs a heart unless the shield takes it. */
  const hurt = (why: string) => {
    const s = fight()
    const now = performance.now()
    s.sour = now
    s.misses = 0
    if (s.shield) {
      s.shield = false
      float('Blocked!', '#9FD3F5', W / 2, HIT_Y - 60, true)
    } else {
      s.hearts -= 1
      s.youHurt = now
      float(why, '#FF6A5E', W / 2, HIT_Y - 60, true)
      tone(110, 0.5, 'sawtooth', 0.06)
      if (s.hearts <= 0) finish(false)
    }
    sync()
  }

  /** Lays out one bar of notes starting at song time t0. */
  const makeBar = (t0: number) => {
    const s = fight()
    const def = PHASES[s.phase]
    const b = 60000 / def.bpm
    const pattern = def.bars[Math.floor(Math.random() * def.bars.length)]
    const add = (lane: number, at: number, ghost = false) => s.notes.push({ lane, at, ghost, state: 'live', doneAt: 0 })
    const rand = (not = -1) => {
      let l = Math.floor(Math.random() * LANES)
      if (l === not) l = (l + 1 + Math.floor(Math.random() * (LANES - 1))) % LANES
      return l
    }
    const up = Math.random() < 0.5
    let last = -1
    for (let k = 0; k < 4; k++) {
      const at = t0 + k * b
      s.beats.push(at)
      if (pattern === 'quarters') add((last = rand(last)), at)
      else if (pattern === 'stairs') add(up ? k : 3 - k, at)
      else if (pattern === 'run') {
        add(up ? k : 3 - k, at)
        add(up ? 3 - k : k, at + b / 2)
      } else if (pattern === 'chords') {
        const a = rand()
        add(a, at)
        if (k % 2 === 0) add(rand(a), at)
      } else if (pattern === 'gallop') {
        const a = rand(last)
        add(a, at)
        if (k !== 3) add(a, at + b / 2)
        last = a
      } else {
        // ghosts: a real note, and a purple fake in another lane at the same time
        const a = rand(last)
        add(a, at)
        if (k % 2 === 0 || Math.random() < 0.5) add(rand(a), at, true)
        last = a
      }
    }
    s.nextBar = t0 + 4 * b
  }

  const tap = (lane: number) => {
    const s = fight()
    const now = performance.now()
    s.pressed[lane] = now
    if (!started || s.over || now < s.banner) return
    const t = songTime(now)
    let best: Note | null = null
    for (const n of s.notes) {
      if (n.lane !== lane || n.state !== 'live' || Math.abs(n.at - t) > WINDOW_MS) continue
      if (!best || Math.abs(n.at - t) < Math.abs(best.at - t)) best = n
    }
    if (!best) return
    best.state = 'hit'
    best.doneAt = now
    if (best.ghost) {
      hurt('Ghost note!')
      return
    }
    const off = Math.abs(best.at - t)
    const grade = off <= PERFECT_MS ? 'Perfect!' : off <= GOOD_MS ? 'Good' : 'OK'
    s.streak += 1
    const mult = multOf(s.streak)
    const dmg = Math.round(stats.damage * 0.2 * mult * (grade === 'Perfect!' ? 1.5 : grade === 'Good' ? 1 : 0.6))
    s.hp = Math.max(0, s.hp - dmg)
    s.bossHurt = now
    tone(SOUND_BELLS[lane] * (s.phase === 3 ? 1.5 : 1), 0.35, 'triangle', 0.09)
    float(grade, COLORS[lane], laneX(lane), HIT_Y - 26)
    float(`−${dmg}`, '#FFE38A', W / 2 + 54, 70)
    if (s.hp <= 0) {
      float('Bravo!', '#FFE38A', W / 2, 160, true)
      finish(true)
    } else {
      const next = phaseOf(s.hp, maxHp)
      if (next !== s.phase) {
        // New movement: clear the board, change tempo, and show the banner
        s.phase = next
        s.notes = s.notes.filter((n) => n.at < t + 100)
        s.beats = []
        s.banner = now + BANNER_MS
        s.nextBar = t + BANNER_MS + 600
        setBanner(next)
        window.setTimeout(() => setBanner(null), BANNER_MS)
      }
    }
    sync()
  }

  const drink = () => {
    const s = fight()
    if (!started || s.over || s.potions <= 0 || s.hearts >= stats.hearts) return
    s.potions -= 1
    s.hearts += 1
    float('+1 heart', '#7CF29A', W / 2, HIT_Y - 60, true)
    sync()
  }

  const live = useRef({ tap, drink })
  useEffect(() => {
    live.current = { tap, drink }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const lane = KEYS.indexOf(e.key.toLowerCase())
      if (lane >= 0) live.current.tap(lane)
      else if (e.key === 'h' || e.key === 'p') live.current.drink()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const start = () => {
    try {
      audio.current = new AudioContext()
    } catch {
      audio.current = null
    }
    const s = fight()
    s.started = performance.now()
    s.nextBar = 2200
    setStarted(true)
  }

  const frame = (ctx: Ctx, now: number, font: string) => {
    const s = fight()
    const def = PHASES[s.phase]
    const t = started ? songTime(now) : 0
    const running = started && !s.over

    // ---- update
    if (running) {
      while (s.nextBar < t + def.travel + 400) makeBar(s.nextBar)
      while (s.beats.length && s.beats[0] <= t) {
        s.beats.shift()
        s.beatAt = now
        tone(s.beats.length % 4 === 3 ? 1320 : 880, 0.05, 'square', 0.025)
      }
      for (const n of s.notes) {
        if (n.state !== 'live' || t - n.at <= WINDOW_MS) continue
        n.doneAt = now
        if (n.ghost) {
          n.state = 'gone'
          continue
        }
        n.state = 'miss'
        s.streak = 0
        s.misses += 1
        float('Miss', '#C9CED6', laneX(n.lane), HIT_Y - 26)
        if (s.misses >= MISS_LIMIT) hurt('Sour chord!')
        else sync()
      }
      s.notes = s.notes.filter((n) => n.state === 'live' || now - n.doneAt < 400)
    }

    // ---- draw: the tunnel, the Conductor, and the note highway
    ctx.fillStyle = '#121A16'
    ctx.fillRect(0, 0, W, H)
    for (let y = 0; y < TOP; y += 12) {
      for (let x = (y / 12) % 2 ? -12 : 0; x < W; x += 24) {
        ctx.fillStyle = (x + y) % 48 ? '#1C2A22' : '#20302A'
        ctx.fillRect(x + 1, y + 1, 22, 10)
      }
    }
    drawConductor(ctx, now, s, t, def.bpm)

    // Highway
    for (let l = 0; l < LANES; l++) {
      ctx.fillStyle = l % 2 ? '#18241E' : '#1C2A23'
      ctx.fillRect(LX0 + l * LANE_W, TOP, LANE_W, H - TOP)
      ctx.fillStyle = '#0C120F'
      ctx.fillRect(LX0 + l * LANE_W, TOP, 2, H - TOP)
    }
    ctx.fillRect(LX0 + LANES * LANE_W - 2, TOP, 2, H - TOP)
    ctx.fillStyle = info.dark
    ctx.fillRect(0, TOP - 4, W, 4)
    // Beat lines scroll down with the notes
    if (running) {
      const b = 60000 / def.bpm
      const first = Math.ceil((t - 200) / b) * b
      ctx.fillStyle = 'rgba(255,255,255,0.07)'
      for (let at = first; at < t + def.travel; at += b) {
        const y = HIT_Y - ((at - t) / def.travel) * (HIT_Y - TOP)
        if (y > TOP && y < H) ctx.fillRect(LX0, Math.round(y), LANES * LANE_W, 2)
      }
    }
    // Receptors on the hit line
    for (let l = 0; l < LANES; l++) {
      const x = laneX(l)
      const lit = now - s.pressed[l] < 110
      ctx.fillStyle = '#0C120F'
      ctx.fillRect(x - 32, HIT_Y - 12, 64, 24)
      ctx.fillStyle = COLORS[l]
      ctx.fillRect(x - 30, HIT_Y - 10, 60, 3)
      ctx.fillRect(x - 30, HIT_Y + 7, 60, 3)
      ctx.fillRect(x - 30, HIT_Y - 10, 3, 20)
      ctx.fillRect(x + 27, HIT_Y - 10, 3, 20)
      ctx.fillStyle = lit ? 'rgba(255,255,255,0.35)' : '#16201B'
      ctx.fillRect(x - 27, HIT_Y - 7, 54, 14)
    }
    // Notes
    for (const n of s.notes) {
      const x = laneX(n.lane)
      if (n.state === 'hit') {
        // A burst on the receptor
        const k = (now - n.doneAt) / 300
        if (k < 1) {
          ctx.strokeStyle = n.ghost ? GHOST : COLORS[n.lane]
          ctx.lineWidth = 4
          ctx.globalAlpha = 1 - k
          ctx.strokeRect(x - 30 - k * 14, HIT_Y - 10 - k * 14, 60 + k * 28, 20 + k * 28)
          ctx.globalAlpha = 1
        }
        continue
      }
      const y = HIT_Y - ((n.at - t) / def.travel) * (HIT_Y - TOP)
      if (y < TOP - 10 || y > H + 10) continue
      ctx.globalAlpha = n.state === 'miss' || n.state === 'gone' ? 0.3 : 1
      ctx.fillStyle = '#0C120F'
      ctx.fillRect(x - 29, y - 9, 58, 18)
      if (n.ghost) {
        ctx.globalAlpha *= 0.65 + 0.35 * Math.sin(now / 70)
        ctx.fillStyle = GHOST
        ctx.fillRect(x - 26, y - 6, 52, 12)
        // A little skull face: don't tap!
        ctx.fillStyle = '#F2ECFF'
        ctx.fillRect(x - 8, y - 4, 4, 4)
        ctx.fillRect(x + 4, y - 4, 4, 4)
        ctx.fillRect(x - 5, y + 2, 10, 2)
      } else {
        ctx.fillStyle = COLORS[n.lane]
        ctx.fillRect(x - 26, y - 6, 52, 12)
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.fillRect(x - 26, y - 6, 52, 3)
      }
      ctx.globalAlpha = 1
    }
    // You, conducting back from the bottom of the stage
    sprite(ctx, RIDER, RIDER_PAL, W / 2 - 15, H - 34 + (now - s.beatAt < 90 ? -2 : 0), 3)
    // Sour chord: a wave of red rolling down
    const sk = (now - s.sour) / 500
    if (sk < 1) {
      ctx.fillStyle = `rgba(220, 40, 40, ${0.35 * (1 - sk)})`
      ctx.fillRect(0, 0, W, H)
    }
    if (!started) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.fillRect(0, TOP, W, H - TOP)
    } else if (t < 2200) {
      ctx.fillStyle = '#FBF3DF'
      ctx.font = `bold 26px ${font}`
      ctx.textAlign = 'center'
      ctx.fillText(t < 1100 ? 'Ready…' : 'Play!', W / 2, (TOP + HIT_Y) / 2)
    }
    s.floaters = s.floaters.filter((fl) => now - fl.born < 1000)
    drawFloaters(ctx, s.floaters, now, font)
  }
  // The loop calls the latest frame through a ref, outside render
  const frameRef = useRef(frame)
  useEffect(() => {
    frameRef.current = frame
  })
  const canvas = useCanvasLoop(W, H, (ctx, now, font) => frameRef.current(ctx, now, font))


  return (
    <PixelScreen>
      <StatusBar tone="light" />
      <BossHeader line={line} name={NAME} onQuit={() => onExit(0)} />
      <BossHp line={line} hp={hud.hp} maxHp={maxHp} phase={hud.phase} phaseName={PHASES[hud.phase].name} />

      <div className="absolute left-4 top-[164px] border-[3px] border-ink shadow-[4px_4px_0_rgba(15,19,24,0.7)]" style={{ width: W + 6, height: H + 6 }}>
        <canvas ref={canvas} style={{ width: W, height: H }} className="block [image-rendering:pixelated]" role="img" aria-label="Four lanes of falling notes and the hit line" />
      </div>

      <PlayerRow hearts={hud.hearts} maxHearts={stats.hearts} shield={hud.shield} combo={hud.mult} potions={hud.potions} onPotion={drink}>
        <span className="flex items-center gap-1" aria-label={`${hud.misses} of ${MISS_LIMIT} misses before a sour chord`} title="Misses before his sour chord">
          {Array.from({ length: MISS_LIMIT }, (_, i) => (
            <span key={i} className={`h-3 w-3 border-2 border-ink ${i < hud.misses ? 'bg-[#E0463B]' : 'bg-[#3A3F47]'}`} />
          ))}
        </span>
      </PlayerRow>

      {/* The four pads */}
      <div className="absolute inset-x-4 top-[628px] grid grid-cols-4 gap-2">
        {COLORS.map((c, i) => (
          <button
            key={c}
            type="button"
            aria-label={`Lane ${i + 1}`}
            onPointerDown={(e) => {
              e.preventDefault()
              tap(i)
            }}
            className="flex h-[118px] touch-none select-none flex-col items-center justify-end border-[3px] border-ink pb-2 font-pixel text-[15px] font-bold text-ink shadow-[3px_3px_0_rgba(15,19,24,0.8)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            style={{ backgroundColor: c }}
          >
            {KEYS[i].toUpperCase()}
          </button>
        ))}
      </div>

      {banner && <PhaseBanner line={line} phase={banner} name={PHASES[banner].name} />}
      {!started && (
        <BossIntro
          line={line}
          name={NAME}
          taunt={TAUNT}
          onStart={start}
          rules={
            <>
              <p>♪ Notes fall down four lanes. Tap the pad (or D F J K) as each one reaches the line, on the beat.</p>
              <p>♪ Every note you hit hurts him. Keep a streak going to raise your combo.</p>
              <p>♪ Miss three and his sour chord costs a heart. In the Crescendo, don&apos;t tap the purple ghost notes!</p>
            </>
          }
        />
      )}
      {result && (
        <BossResults
          line={line}
          result={result}
          winText="The Conductor takes a bow and fades into the 1897 tunnel. The Green Line runs on time again."
          loseText={`He drowned you out. You dealt ${result.dealt} damage first.`}
          onRetry={onRetry}
          onExit={onExit}
        />
      )}
    </PixelScreen>
  )
}

// ---------- The Conductor ----------

/** A ghostly train conductor in a peaked cap, baton in hand. */
const PHANTOM = [
  '....kkkkkkkk....',
  '...kCCCCCCCCk...',
  '..kCCCCbbCCCCk..',
  '..kkkkkkkkkkkk..',
  '...kggggggggk...',
  '...kgEEggEEgk...',
  '...kggggggggk...',
  '....kggMMggk....',
  '.....kggggk.....',
  '...kkUUwwUUkk...',
  '..kUUUUwwUUUUk..',
  '.kUUUUUbbUUUUUk.',
  '.kUUkUUwwUUkUUk.',
  '.kggkUUbbUUkggk.',
  '..k.kUUUUUUk.k..',
  '....kggggggk....',
  '.....gg..gg.....',
  '......g...g.....',
]
function drawConductor(ctx: Ctx, now: number, s: Fight, t: number, bpm: number) {
  const u = 5
  const bob = Math.round(Math.sin(now / 420) * 3)
  const shake = now - s.bossHurt < 160 ? Math.round(Math.sin(now / 12) * 3) : 0
  const x = W / 2 - 40 + shake
  const y = 12 + bob
  const flash = now - s.bossHurt < 90
  // Ghostly glow
  ctx.fillStyle = `rgba(120, 255, 180, ${0.08 + 0.04 * Math.sin(now / 300)})`
  ctx.fillRect(x - 10, y - 4, 100, 100)
  ctx.globalAlpha = 0.92
  sprite(
    ctx,
    PHANTOM,
    flash
      ? { k: '#FFFFFF', C: '#FFFFFF', b: '#FFFFFF', g: '#FFFFFF', E: '#FFFFFF', M: '#FFFFFF', U: '#FFFFFF', w: '#FFFFFF' }
      : { k: '#0C120F', C: '#1F4D35', b: '#E8C04A', g: '#BFF5D2', E: '#0C120F', M: '#4A8A64', U: '#2E3F38', w: '#E6F5EC' },
    x,
    y,
    u,
  )
  ctx.globalAlpha = 1
  // The baton swings with the beat
  const beat = 60000 / bpm
  const ph = ((t % beat) + beat) % beat / beat
  const ang = -0.9 + Math.sin(ph * Math.PI) * 1.3
  const hx = x + 14.5 * u
  const hy = y + 12 * u
  ctx.strokeStyle = '#FBF3DF'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(hx, hy)
  ctx.lineTo(hx + Math.cos(ang) * 34, hy + Math.sin(ang) * 34)
  ctx.stroke()
  // Musical notes drifting off him
  ctx.fillStyle = 'rgba(191, 245, 210, 0.7)'
  for (let i = 0; i < 4; i++) {
    const k = ((now / 1800 + i / 4) % 1 + 1) % 1
    const nx = (i % 2 ? x + 100 : x - 24) + Math.sin(k * 6 + i) * 8
    const ny = y + 80 - k * 70
    ctx.fillRect(nx, ny, 5, 4)
    ctx.fillRect(nx + 4, ny - 10, 2, 12)
  }
}
