'use client'

// End-of-line boss fights in pixel style. Each line gets its own boss; the Red Line's is The Iron
// Archivist, a knowledge golem from the Harvard/MIT end of the line that hurls books, pop quizzes,
// formulas and diplomas at you.
//
// The fight is parry, then attack. When an attack flies at you a ring closes in on you; tap PARRY
// as it meets the circle to knock it away. Parry every hit of a move and the boss is open: tap
// ATTACK to swing your weapon. A perfect parry on every hit stuns it, and that swing does double.
// Combos build while you keep landing hits and reset when you get hit. Potions heal a heart, but
// you can't parry while you drink.

import { useEffect, useRef, useState } from 'react'
import { FlaskConical, Heart, Map as MapIcon, RotateCcw, Shield, Skull, Swords, Trophy, X } from 'lucide-react'
import { LINES, type LineId } from './stations'
import { Coin } from './fantasy'
import { NUM, PANEL, PixelScreen } from './pixel'
import { StatusBar } from './ui'
import { END_BOSS } from './stats'

/** What you bring into the fight, from your loadout. */
export type FighterStats = { hearts: number; damage: number; combo: number; potions: number; shield: boolean }

// ---------- Bosses ----------

type Phase = 1 | 2 | 3
/** How a shot travels: each has its own path and rhythm, so every move reads differently. */
type ShotKind = 'book' | 'chalk' | 'formula' | 'plane' | 'bolt' | 'charge'
/** One hit of a move: when it lands (ms after the move starts) and how long it's in the air. */
type Hit = { kind: ShotKind; at: number; travel: number; high?: number }
type Move = { name: string; hits: Hit[]; /** Up to this much extra, random wind-up, so you can't count it. */ tellRandom?: number }
type BossDef = { name: string; taunt: string; phases: [string, string, string]; moves: Record<Phase, Move[]> }

/** A huge book drops from the ceiling onto your head, speeding up as it falls. */
const BOOK_SLAM: Move = { name: 'Book Slam!', hits: [{ kind: 'book', at: 1200, travel: 1200 }] }
/** Three pieces of chalk in a steady rhythm. */
const CHALK: Move = {
  name: 'Chalk Volley!',
  hits: [700, 1020, 1340].map((at) => ({ kind: 'chalk' as const, at, travel: 700 })),
}
/** The boss itself dashes at you. Parry it and it staggers, opening it up for a double hit. */
const CHARGE: Move = { name: 'Tenure Charge!', hits: [{ kind: 'charge', at: 1050, travel: 1050 }] }
/** A paper plane flies in, stops to loop in the air, then darts at you. Don't fall for the pause. */
const TRICK: Move = { name: 'Trick Question!', hits: [{ kind: 'plane', at: 1900, travel: 1900 }] }
/** Two formulas launch together and split apart, landing at different times. */
const SPLIT: Move = {
  name: 'Formula Split!',
  hits: [
    { kind: 'formula', at: 950, travel: 950, high: 70 },
    { kind: 'formula', at: 1280, travel: 1280, high: -20 },
  ],
}
/** A lightbulb flickers over your head for a random while, then lightning strikes fast. */
const EUREKA: Move = { name: 'Eureka!', hits: [{ kind: 'bolt', at: 380, travel: 380 }], tellRandom: 1100 }
/** A stream of chalk that keeps speeding up. */
const LECTURE: Move = {
  name: 'Endless Lecture!',
  hits: [650, 960, 1220, 1440, 1620].map((at) => ({ kind: 'chalk' as const, at, travel: 650 })),
}
/** Everything at once: chalk, a falling book, then a charge. */
const DEFENSE: Move = {
  name: 'Thesis Defense!',
  hits: [
    { kind: 'chalk', at: 650, travel: 650 },
    { kind: 'chalk', at: 930, travel: 650 },
    { kind: 'book', at: 1750, travel: 1000 },
    { kind: 'charge', at: 2650, travel: 850 },
  ],
}

const BOSSES: Partial<Record<LineId, BossDef>> = {
  red: {
    name: 'The Iron Archivist',
    taunt: '“Class is in session, rider. This is the end of the line.”',
    phases: ['The Lecture Hall', 'Finals Week', 'The Thesis Defense'],
    moves: {
      1: [BOOK_SLAM, CHALK, CHARGE],
      2: [CHALK, CHARGE, TRICK, SPLIT, BOOK_SLAM],
      3: [TRICK, SPLIT, EUREKA, LECTURE, DEFENSE],
    },
  },
}

const FORMULAS = ['E=mc²', 'F=ma', 'πr²', 'a²+b²', '∫dx', 'PV=nRT']
const ROMAN = ['I', 'II', 'III']

// ---------- Timing (ms) ----------

/** The boss winds up (and names the move) before anything flies. */
const TELL_MS = 700
/** Every move runs faster in later phases. */
const SPEED: Record<Phase, number> = { 1: 1, 2: 0.88, 3: 0.78 }
/** Parry windows around the moment of impact. */
const PERFECT_MS = 85
const EARLY_MS = 230
const LATE_MS = 110
/** Parrying too early locks you out for a moment, so mashing doesn't work. */
const WHIFF_MS = 450
/** How long the boss stays open after you parry, longer when stunned. */
const COUNTER_MS = 1400
const STUN_MS = 1900
const DRINK_MS = 700
const STRIKE_MS = 520

const phaseOf = (hp: number, max: number): Phase => (hp > (max * 2) / 3 ? 1 : hp > max / 3 ? 2 : 3)

// ---------- Fight state ----------

type Mode = 'intro' | 'tell' | 'attack' | 'counter' | 'strike' | 'recover' | 'phase' | 'won' | 'lost'
type Grade = 'perfect' | 'good' | 'hit' | 'blocked'
type Shot = { kind: ShotKind; label: string; high: number; spawn: number; impact: number; grade: Grade | null; at: number }
type Floater = { text: string; color: string; x: number; y: number; born: number; big?: boolean }
type Fight = {
  mode: Mode
  until: number
  hp: number
  hearts: number
  potions: number
  shield: boolean
  combo: number
  dealt: number
  phase: Phase
  move: Move | null
  shots: Shot[]
  crit: boolean
  whiffUntil: number
  drinkUntil: number
  lunge: number
  struck: boolean
  bossFlash: number
  hurt: number
  endAt: number
  floaters: Floater[]
}
type Hud = Pick<Fight, 'mode' | 'hp' | 'hearts' | 'potions' | 'shield' | 'combo' | 'phase' | 'crit'> & { move: string }
type Result = { won: boolean; gold: number; dealt: number }

const newFight = (maxHp: number, s: FighterStats): Fight => ({
  mode: 'intro',
  until: 0,
  hp: maxHp,
  hearts: s.hearts,
  potions: s.potions,
  shield: s.shield,
  combo: 0,
  dealt: 0,
  phase: 1,
  move: null,
  shots: [],
  crit: false,
  whiffUntil: 0,
  drinkUntil: 0,
  lunge: 0,
  struck: false,
  bossFlash: 0,
  hurt: 0,
  endAt: 0,
  floaters: [],
})
const hudOf = (f: Fight): Hud => ({
  mode: f.mode,
  hp: f.hp,
  hearts: f.hearts,
  potions: f.potions,
  shield: f.shield,
  combo: f.combo,
  phase: f.phase,
  crit: f.crit,
  move: f.move?.name ?? '',
})

// ---------- Component ----------

export function LineBoss(props: {
  line: LineId
  maxHp: number
  stats: FighterStats
  onExit: (gold: number) => void
  /** Called once when a fight ends, e.g. to save the result on the server. */
  onResult?: (result: { won: boolean; gold: number; dealt: number }) => void
}) {
  // A retry is a fresh fight
  const [attempt, setAttempt] = useState(0)
  return <BossFight key={attempt} {...props} onRetry={() => setAttempt((n) => n + 1)} />
}

function BossFight({
  line,
  maxHp,
  stats,
  onExit,
  onRetry,
  onResult,
}: {
  line: LineId
  maxHp: number
  stats: FighterStats
  onExit: (gold: number) => void
  onRetry: () => void
  onResult?: (result: Result) => void
}) {
  const boss = BOSSES[line] ?? BOSSES.red!
  const lineInfo = LINES[line]
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fight = useRef<Fight | null>(null)
  const [hud, setHud] = useState<Hud>(() => hudOf(newFight(maxHp, stats)))
  const [result, setResult] = useState<Result | null>(null)
  // Report the outcome once per fight (a retry remounts this component).
  const reported = useRef(false)
  useEffect(() => {
    if (result && !reported.current) {
      reported.current = true
      onResult?.(result)
    }
  }, [result, onResult])

  const sync = () => fight.current && setHud(hudOf(fight.current))
  const float = (text: string, color: string, x: number, y: number, big = false) =>
    fight.current?.floaters.push({ text, color, x, y, born: performance.now(), big })

  const nextMove = (now: number) => {
    const f = fight.current!
    const pool = boss.moves[f.phase]
    const options = pool.length > 1 ? pool.filter((m) => m !== f.move) : pool
    f.move = options[Math.floor(Math.random() * options.length)]
    f.mode = 'tell'
    f.until = now + TELL_MS + Math.random() * (f.move.tellRandom ?? 0)
    sync()
  }

  const takeHit = (s: Shot, now: number) => {
    const f = fight.current!
    s.at = now
    if (f.shield) {
      f.shield = false
      s.grade = 'blocked'
      float('BLOCKED!', '#9FD3F5', TARGET.x, TARGET.y - 50)
    } else {
      s.grade = 'hit'
      f.hearts -= 1
      f.combo = 0
      f.hurt = now
      float('-1 ♥', '#FF6B5E', TARGET.x, TARGET.y - 50)
      if (f.hearts <= 0) {
        f.mode = 'lost'
        f.endAt = now + 1200
      }
    }
    sync()
  }

  /** Advance the fight; called every frame. */
  const step = (now: number) => {
    const f = fight.current!
    f.floaters = f.floaters.filter((x) => now - x.born < 1000)
    if (f.mode === 'tell' && now >= f.until) {
      const sp = SPEED[f.phase]
      f.shots = f.move!.hits.map((h) => ({
        kind: h.kind,
        label: FORMULAS[Math.floor(Math.random() * FORMULAS.length)],
        high: h.high ?? 40,
        spawn: now + (h.at - h.travel) * sp,
        impact: now + h.at * sp,
        grade: null,
        at: 0,
      }))
      f.mode = 'attack'
    }
    if (f.mode === 'attack') {
      for (const s of f.shots) if (!s.grade && now > s.impact + LATE_MS && f.mode === 'attack') takeHit(s, now)
      if (f.mode === 'attack' && f.shots.every((s) => s.grade)) {
        const clean = f.shots.every((s) => s.grade === 'perfect' || s.grade === 'good')
        if (clean) {
          // Parrying a charge always staggers the boss; otherwise it takes all perfect parries
          const charged = f.shots.some((s) => s.kind === 'charge')
          f.crit = charged || f.shots.every((s) => s.grade === 'perfect')
          f.mode = 'counter'
          f.until = now + (f.crit ? STUN_MS : COUNTER_MS)
          float(charged ? 'STAGGERED!' : f.crit ? 'STUNNED!' : 'OPENING!', '#FFE38A', BOSS_CX, BOSS_Y - 6, true)
        } else {
          f.mode = 'recover'
          f.until = now + 700
        }
        sync()
      }
    }
    if (f.mode === 'counter' && now >= f.until) {
      f.mode = 'recover'
      f.until = now + 450
      float('Too slow!', '#C9CED6', BOSS_CX, BOSS_Y - 6)
      sync()
    }
    if (f.mode === 'strike') {
      if (!f.struck && now >= f.lunge + 170) {
        f.struck = true
        const dmg = Math.round(stats.damage * 2 * Math.min(f.combo + 1, stats.combo) * (f.crit ? 2 : 1))
        f.hp = Math.max(0, f.hp - dmg)
        f.dealt += dmg
        f.combo += 1
        f.bossFlash = now
        float(`-${dmg}`, f.crit ? '#FFD24A' : '#FFFFFF', BOSS_CX, BOSS_Y + 20, true)
        sync()
      }
      if (now >= f.lunge + STRIKE_MS) {
        const next = phaseOf(f.hp, maxHp)
        if (f.hp <= 0) {
          f.mode = 'won'
          f.bossFlash = now
          f.endAt = now + 1500
        } else if (next > f.phase) {
          f.phase = next
          f.mode = 'phase'
          f.until = now + 1800
        } else {
          f.mode = 'recover'
          f.until = now + 450
        }
        f.crit = false
        sync()
      }
    }
    if ((f.mode === 'recover' || f.mode === 'phase') && now >= f.until) nextMove(now)
    if ((f.mode === 'won' || f.mode === 'lost') && f.endAt && now >= f.endAt) {
      f.endAt = 0
      const won = f.mode === 'won'
      setResult({ won, dealt: f.dealt, gold: won ? END_BOSS.winGold : Math.round(f.dealt * END_BOSS.partialRate) })
    }
  }

  const parry = () => {
    const f = fight.current
    const now = performance.now()
    if (!f || (f.mode !== 'attack' && f.mode !== 'tell') || now < f.whiffUntil || now < f.drinkUntil) return
    const s = f.mode === 'attack' ? f.shots.find((x) => !x.grade) : undefined
    if (!s || now < s.impact - EARLY_MS) {
      f.whiffUntil = now + WHIFF_MS
      float('Too early!', '#C9CED6', TARGET.x, TARGET.y - 50)
      return
    }
    s.grade = Math.abs(now - s.impact) <= PERFECT_MS ? 'perfect' : 'good'
    s.at = now
    float(s.grade === 'perfect' ? 'PERFECT!' : 'PARRY!', s.grade === 'perfect' ? '#FFD24A' : '#FBF3DF', TARGET.x + 20, TARGET.y - 54, s.grade === 'perfect')
  }

  const attack = () => {
    const f = fight.current
    if (!f) return
    if (f.mode === 'counter') {
      f.mode = 'strike'
      f.lunge = performance.now()
      f.struck = false
      sync()
    } else if (f.mode === 'tell' || f.mode === 'attack') {
      float('Parry first!', '#C9CED6', TARGET.x + 20, TARGET.y - 54)
    }
  }

  const drink = () => {
    const f = fight.current
    const now = performance.now()
    if (!f || f.mode === 'intro' || f.mode === 'won' || f.mode === 'lost' || now < f.drinkUntil) return
    if (f.potions <= 0) return
    if (f.hearts >= stats.hearts) {
      float('Full health', '#C9CED6', TARGET.x, TARGET.y - 50)
      return
    }
    f.potions -= 1
    f.hearts += 1
    f.drinkUntil = now + DRINK_MS
    float('+1 ♥', '#7CE39B', TARGET.x, TARGET.y - 50, true)
    sync()
  }

  const start = () => {
    const f = fight.current
    if (!f) return
    f.mode = 'recover'
    f.until = performance.now() + 500
    sync()
  }

  // Handlers read through refs so the key and frame listeners never go stale
  const live = useRef({ step, parry, attack, drink })
  useEffect(() => {
    live.current = { step, parry, attack, drink }
  })

  useEffect(() => {
    fight.current = newFight(maxHp, stats)
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const k = e.key.toLowerCase()
      if (k === ' ' || k === 'j') live.current.parry()
      else if (k === 'k' || k === 'enter') live.current.attack()
      else if (k === 'h' || k === 'p') live.current.drink()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)

    const canvas = canvasRef.current!
    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.imageSmoothingEnabled = false
    const font = getComputedStyle(canvas).getPropertyValue('--font-pixelify').trim() || 'monospace'
    let raf = 0
    const frame = (now: number) => {
      const f = fight.current
      if (f) {
        live.current.step(now)
        drawScene(ctx, f, now, font)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
    }
    // Set up once per fight; stats and HP are fixed for its length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { mode } = hud
  const defending = mode === 'tell' || mode === 'attack'
  const open = mode === 'counter'
  const hpPct = (hud.hp / maxHp) * 100
  const comboMult = Math.min(hud.combo + 1, stats.combo)
  const hint = defending
    ? 'Tap PARRY when the ring turns gold'
    : open
      ? hud.crit
        ? 'Stunned! ATTACK for double damage'
        : 'It’s open: tap ATTACK!'
      : mode === 'phase'
        ? 'It’s getting angrier…'
        : ''

  return (
    <PixelScreen>
      <StatusBar tone="light" />

      {/* Header */}
      <header className={`absolute inset-x-4 top-[56px] z-10 flex h-[56px] items-center gap-2 pl-1.5 pr-3 ${PANEL}`}>
        <button
          type="button"
          onClick={() => onExit(0)}
          aria-label="Run away to the map"
          className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-[#F1E7CF] active:translate-x-[1px] active:translate-y-[1px]"
        >
          <X size={20} strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-pixel text-[12px] leading-none text-muted">
            {lineInfo.name} boss · {lineInfo.realm}
          </p>
          <h1 className="truncate font-pixel text-[19px] font-bold leading-tight">{boss.name}</h1>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink text-white" style={{ backgroundColor: lineInfo.color }} aria-hidden>
          <Skull size={16} strokeWidth={2.6} />
        </span>
      </header>

      {/* Boss HP */}
      <div className="absolute inset-x-4 top-[122px] z-10">
        <div className="flex items-baseline justify-between font-pixel text-[12.5px] font-bold text-[#FBF3DF]">
          <span>
            Phase {ROMAN[hud.phase - 1]} · {boss.phases[hud.phase - 1]}
          </span>
          <span className={NUM}>
            {hud.hp} / {maxHp}
          </span>
        </div>
        <div className="relative mt-1 h-[18px] border-[3px] border-ink bg-[#3A1414]" role="meter" aria-label="Boss health" aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={hud.hp}>
          <div className="h-full transition-[width] duration-300" style={{ width: `${hpPct}%`, backgroundColor: lineInfo.color }} />
          <div className="absolute inset-x-0 top-0 h-[3px] bg-white/30" style={{ width: `${hpPct}%` }} />
          <span className="absolute inset-y-0 left-1/3 w-[3px] bg-ink" />
          <span className="absolute inset-y-0 left-2/3 w-[3px] bg-ink" />
        </div>
      </div>

      {/* Arena */}
      <div className="absolute left-4 top-[170px] border-[3px] border-ink shadow-[4px_4px_0_rgba(15,19,24,0.7)]" style={{ width: W + 6, height: H + 6 }}>
        <canvas
          ref={canvasRef}
          style={{ width: W, height: H }}
          className="block [image-rendering:pixelated]"
          role="img"
          aria-label={`${boss.name} attacks from the right. Tap Parry as the ring closes on you, then Attack.`}
        />
        {defending && hud.move && (
          <p key={hud.move + hud.hp} className="absolute right-2 top-2 animate-pop border-2 border-ink bg-[#FBF3DF] px-2 font-pixel text-[15px] font-bold leading-[24px]">
            {hud.move}
          </p>
        )}
        {mode === 'phase' && (
          <div className="absolute inset-x-0 top-[120px] animate-pop border-y-[3px] border-ink py-2 text-center text-white" style={{ backgroundColor: lineInfo.dark }}>
            <p className="font-pixel text-[13px] font-bold tracking-[0.12em] opacity-80">PHASE {ROMAN[hud.phase - 1]}</p>
            <p className="font-pixel text-[24px] font-bold leading-tight">{boss.phases[hud.phase - 1]}</p>
          </div>
        )}
        {mode === 'intro' && (
          <div className="absolute inset-0 flex animate-fade-in items-center justify-center bg-[#0F1318]/55 px-5">
            <div className={`w-full animate-pop p-4 text-center ${PANEL}`}>
              <p className="font-pixel text-[12px] font-bold tracking-[0.1em] text-muted">END OF THE {lineInfo.name.toUpperCase()}</p>
              <p className="font-pixel text-[24px] font-bold leading-tight">{boss.name}</p>
              <p className="mt-1 text-[13px] italic leading-snug text-ink-soft">{boss.taunt}</p>
              <ul className="mt-2.5 space-y-1 text-left text-[13px] leading-snug">
                <li>
                  <b>Parry:</b> tap when the closing ring turns gold and meets the white circle. Perfect parries stun it.
                </li>
                <li>
                  <b>Attack:</b> after parrying every hit, swing your weapon.
                </li>
                <li>
                  <b>Potions:</b> heal a heart, but you can&apos;t parry while drinking.
                </li>
              </ul>
              <button
                type="button"
                onClick={start}
                autoFocus
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 border-[3px] border-ink font-pixel text-[18px] font-bold text-white shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                style={{ backgroundColor: lineInfo.color }}
              >
                <Swords size={18} strokeWidth={2.8} /> Fight!
              </button>
            </div>
          </div>
        )}
      </div>

      {/* You */}
      <div className="absolute inset-x-4 top-[584px] flex items-center gap-2 font-pixel text-[14px] font-bold text-[#FBF3DF]">
        <span className="flex items-center gap-0.5" aria-label={`${hud.hearts} of ${stats.hearts} hearts`}>
          {Array.from({ length: stats.hearts }, (_, i) => (
            <Heart key={i} size={20} strokeWidth={2.6} className={i < hud.hearts ? 'fill-[#E0463B] text-[#1B1F24]' : 'fill-[#3A3F47] text-[#1B1F24]'} />
          ))}
        </span>
        {hud.shield && (
          <span className="flex items-center gap-1 border-2 border-ink bg-[#9FD3F5] px-1.5 text-[12px] leading-[20px] text-ink" title="Brass Shield blocks the next hit">
            <Shield size={13} strokeWidth={2.8} /> Shield
          </span>
        )}
        <span className="ml-auto">
          Combo <span className={`${NUM} text-[#FFD24A]`}>×{comboMult}</span>
        </span>
      </div>

      {/* Controls */}
      <div className="absolute inset-x-4 top-[620px] flex gap-2">
        <ActionButton label={`Potion, ${hud.potions} left`} onPress={drink} className="w-[78px] bg-[#2F9E5A] text-white" dim={hud.potions === 0}>
          <FlaskConical size={22} strokeWidth={2.6} />
          <span className="text-[13px]">
            Potion <span className={NUM}>×{hud.potions}</span>
          </span>
        </ActionButton>
        <ActionButton label="Parry" onPress={parry} className={`flex-1 ${defending ? 'bg-[#FBF3DF]' : 'bg-[#C9C1AE]'}`}>
          <Shield size={24} strokeWidth={2.8} />
          <span className="text-[19px]">PARRY</span>
        </ActionButton>
        <ActionButton
          label="Attack"
          onPress={attack}
          className={`flex-1 ${open ? 'animate-pulse bg-[#F2C94C]' : 'bg-[#C9C1AE]'}`}
          style={open ? { backgroundColor: hud.crit ? '#FFD24A' : '#F2C94C' } : undefined}
        >
          <Swords size={24} strokeWidth={2.8} />
          <span className="text-[19px]">ATTACK</span>
        </ActionButton>
      </div>
      <p className="absolute inset-x-4 top-[724px] text-center font-pixel text-[13.5px] font-bold text-[#FBF3DF]" aria-live="polite">
        {hint}
      </p>

      {result && <Results bossName={boss.name} line={line} result={result} onRetry={onRetry} onExit={onExit} />}
    </PixelScreen>
  )
}

function ActionButton({
  label,
  onPress,
  className,
  style,
  dim,
  children,
}: {
  label: string
  onPress: () => void
  className: string
  style?: React.CSSProperties
  dim?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      // pointerdown so a parry registers the instant you touch, not on release
      onPointerDown={(e) => {
        e.preventDefault()
        onPress()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') e.stopPropagation()
      }}
      className={`flex h-[92px] touch-none select-none flex-col items-center justify-center gap-1 border-[3px] border-ink font-pixel font-bold shadow-[3px_3px_0_rgba(15,19,24,0.8)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${dim ? 'opacity-50' : ''} ${className}`}
      style={style}
    >
      {children}
    </button>
  )
}

function Results({
  bossName,
  line,
  result,
  onRetry,
  onExit,
}: {
  bossName: string
  line: LineId
  result: Result
  onRetry: () => void
  onExit: (gold: number) => void
}) {
  const info = LINES[line]
  return (
    <div className="absolute inset-0 z-30 flex animate-fade-in items-center justify-center bg-[#0F1318]/75 px-5">
      <div role="dialog" aria-modal="true" aria-labelledby="boss-done" className={`w-full animate-pop p-4 text-center ${PANEL}`}>
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center border-[3px] border-ink text-white"
          style={{ backgroundColor: result.won ? '#2F7A4A' : '#8C3A30' }}
        >
          {result.won ? <Trophy size={28} strokeWidth={2.6} /> : <Skull size={28} strokeWidth={2.6} />}
        </span>
        <h2 id="boss-done" className="mt-2 font-pixel text-[28px] font-bold leading-none">
          {result.won ? `${info.name} cleared!` : 'Knocked out!'}
        </h2>
        <p className="mt-1.5 text-[13.5px] leading-snug text-ink-soft">
          {result.won
            ? `${bossName} closes its book for good. The ${info.realm} is yours.`
            : `You dealt ${result.dealt} damage before ${bossName} ended the lecture.`}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 border-2 border-ink bg-[#FFE7A3] py-2">
          <Coin size={24} />
          <span className={`text-[24px] text-[#7A4D0E] ${NUM}`}>+{result.gold}</span>
          <span className="font-pixel text-[14px] text-[#7A4D0E]">gold</span>
        </div>
        <div className="mt-4 flex gap-2.5">
          {!result.won && (
            <button
              type="button"
              onClick={onRetry}
              autoFocus
              className="flex h-12 flex-1 items-center justify-center gap-1.5 border-[3px] border-ink bg-[#F1E7CF] font-pixel text-[16px] font-bold shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <RotateCcw size={17} strokeWidth={2.8} />
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={() => onExit(result.gold)}
            autoFocus={result.won}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 border-[3px] border-ink font-pixel text-[16px] font-bold text-white shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            style={{ backgroundColor: info.color }}
          >
            <MapIcon size={17} strokeWidth={2.8} />
            {result.won ? 'Collect & map' : 'Map'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- Drawing ----------

type Ctx = CanvasRenderingContext2D

const W = 361
const H = 400
const FLOOR = 236
const BS = 6 // boss art pixel
const PS = 5 // player art pixel
const BOSS_X = 196
const BOSS_Y = 58
const BOSS_CX = BOSS_X + 11 * BS
const PLAYER_X = 46
const PLAYER_Y = 288
/** Where shots land (your chest) and where they're thrown from (the boss's hand). */
const TARGET = { x: PLAYER_X + 5 * PS, y: PLAYER_Y + 6 * PS }
/** The white circle around you that the closing ring has to meet. */
const RING_R = 26
const ORIGIN = { x: BOSS_X + 1.5 * BS, y: BOSS_Y + 14.5 * BS }

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

const hash = (a: number, b: number) => {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return n - Math.floor(n)
}

/** The Iron Archivist: an iron scholar in a crimson gown and mortarboard, a huge book under one arm. */
const ARCHIVIST = [
  '....kkkkkkkkkkkkkk....',
  '...kmmmmmmmmmmmmmmk...',
  '....kkkkkmmmmkkkkkt...',
  '........kmmmmk....t...',
  '.......kffffffk...t...',
  '......kffffffffk..tt..',
  '......kfeeffeefk......',
  '......kffffffffk......',
  '......kfFkkkkFfk......',
  '.......kffffffk.......',
  '....kkkkrrggrrkkkk....',
  '...krrrrrrggrrrrrrk...',
  '..krrRrrrrggrrrrRrrk..',
  '..krRrrrrrggrrrrrRrk..',
  '.khhkrrrrrggrrrrrkbbbk',
  '.khhkrrrrrggrrrrkbpppk',
  '..kkkrrrrrggrrrrkbpppk',
  '....krrrrrggrrrrkbpppk',
  '....krRrrrggrrRrkbbbbk',
  '....krRrrrggrrRrrkkkk.',
  '...krrRrrrggrrRrrk....',
  '...krrRrrrggrrRrrk....',
  '..krrrRrrrggrrrRrrk...',
  '..kgggggggggggggggk...',
  '..kkkkkkkkkkkkkkkkk...',
]
const ARCHIVIST_PAL: Record<string, string> = {
  k: '#1B1F24',
  m: '#2B2F36',
  t: '#F2C94C',
  f: '#7A828E',
  F: '#565D68',
  r: '#8C1515',
  R: '#5E0E0E',
  g: '#F2C94C',
  h: '#7A828E',
  b: '#6B4423',
  p: '#F6EEDC',
}
const EYES: Record<Phase, string> = { 1: '#FFB020', 2: '#FF6A28', 3: '#FF2D55' }
const WHITE = Object.fromEntries(Object.keys(ARCHIVIST_PAL).map((k) => [k, '#FFFFFF']))

/** You, facing the boss, in the gold hoodie from the other games. */
const RIDER = [
  '...hhhh...',
  '..hhhhhh..',
  '..hhhsse..',
  '...ssss...',
  '..cccccc..',
  '.bccccccss',
  '.bcccccc..',
  '.bcccccc..',
  '..cccccc..',
  '..pp..pp..',
  '..pp..pp..',
  '..kk..kk..',
]
const RIDER_PAL = { h: '#1B1F24', s: '#F1C9A5', e: '#1B1F24', c: '#F2B233', b: '#C0392B', p: '#2B3A55', k: '#1B1F24' }

const BOOK_ART = ['kkkkkkkkk', 'kbbbbbbbk', 'kbgggbbbk', 'kbbbbbbbk', 'kbbbbbbbk', 'kpppppppk', 'kkkkkkkkk']
const PLANE_ART = ['.......k', '.....kpk', '...kkppk', 'kkkppppk', '...kkpPk', '.....kPk', '.......k']
const BULB_ART = ['.kkkk.', 'kyyyyk', 'kyywyk', 'kyyyyk', '.kyyk.', '.kssk.', '..kk..']
const POTION_ART = ['.kk.', 'kwwk', 'kGGk', 'kGGk', '.kk.']
const SHOT_PAL = { k: '#1B1F24', b: '#6B4423', g: '#F2C94C', p: '#F6EEDC', P: '#C9C1AE', r: '#CC0000', w: '#DDEFF0', G: '#2F9E5A', y: '#FFE38A', s: '#8C939C' }
const SPINES = ['#8C1515', '#2F5D8A', '#2F7A4A', '#6B4423', '#C9A04A', '#5B3A7A', '#A0522D', '#1F4E5A']

function drawBanner(ctx: Ctx, x: number, bg: string, fg: string, lines: string[], font: string) {
  ctx.fillStyle = '#C9A04A'
  ctx.fillRect(x - 4, 0, 48, 5)
  ctx.fillStyle = bg
  ctx.fillRect(x, 5, 40, 92)
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x, 97 + i * 4, 20 - i * 5, 4)
    ctx.fillRect(x + 20 + i * 5, 97 + i * 4, 20 - i * 5, 4)
  }
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.fillRect(x + 36, 5, 4, 92)
  ctx.fillStyle = fg
  ctx.font = `bold 13px ${font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  lines.forEach((l, i) => ctx.fillText(l, x + 20, 26 + i * 24))
}

function drawLibrary(ctx: Ctx, t: number, phase: Phase, font: string) {
  ctx.fillStyle = '#2E1C12'
  ctx.fillRect(0, 0, W, FLOOR)
  // Bookshelves
  for (let row = 0; row < 3; row++) {
    const y0 = 14 + row * 72
    const base = y0 + 60
    ctx.fillStyle = '#1F130C'
    ctx.fillRect(0, y0, W, 60)
    let x = 2
    for (let i = 0; x < W; i++) {
      const w = 6 + Math.floor(hash(row, i) * 6)
      const h = 34 + Math.floor(hash(i, row + 7) * 22)
      ctx.fillStyle = SPINES[Math.floor(hash(i * 3, row) * SPINES.length)]
      ctx.fillRect(x, base - h, w - 1, h)
      ctx.fillStyle = 'rgba(255,255,255,0.16)'
      ctx.fillRect(x + 1, base - h + 5, w - 3, 2)
      x += w
    }
    ctx.fillStyle = '#5C3A21'
    ctx.fillRect(0, base, W, 8)
    ctx.fillStyle = '#7A5030'
    ctx.fillRect(0, base, W, 2)
  }
  // Harvard's and MIT's banners
  drawBanner(ctx, 18, '#A51C30', '#F6EEDC', ['VE', 'RI', 'TAS'], font)
  drawBanner(ctx, 128, '#A31F34', '#C2C4C6', ['M', 'I', 'T'], font)
  // Stone floor
  for (let y = FLOOR; y < H; y += 22) {
    for (let x = 0; x < W; x += 22) {
      ctx.fillStyle = (x / 22 + (y - FLOOR) / 22) % 2 ? '#4A3426' : '#3E2B1F'
      ctx.fillRect(x, y, 22, 22)
    }
  }
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(0, FLOOR, W, 4)
  // Later phases: loose pages swirl and the room glows hotter
  if (phase >= 2) {
    for (let i = 0; i < 10; i++) {
      const x = (hash(i, 1) * W + t * 24 * (1 + (i % 3))) % W
      const y = (hash(i, 3) * H + t * 36 * (1 + hash(i, 2))) % H
      ctx.fillStyle = '#F6EEDC'
      const flip = Math.floor(t * 4 + i) % 2
      ctx.fillRect(x, y, flip ? 8 : 5, flip ? 6 : 8)
    }
    ctx.fillStyle = phase === 2 ? 'rgba(255,120,30,0.10)' : `rgba(220,30,40,${0.12 + 0.06 * Math.sin(t * 4)})`
    ctx.fillRect(0, 0, W, H)
  }
}

type Pt = { x: number; y: number; q: number }
const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k })

/** Where a shot is, and how far along it is (q, 0 to 1), which also sets how closed the parry ring is. */
function shotPos(s: Shot, now: number): Pt {
  const k = Math.min(1.08, (now - s.spawn) / (s.impact - s.spawn))
  switch (s.kind) {
    case 'chalk':
      return { ...lerp(ORIGIN, TARGET, k), q: k }
    case 'formula': {
      const p = lerp(ORIGIN, TARGET, k)
      return { x: p.x, y: p.y - Math.sin(Math.PI * Math.min(1, k)) * s.high, q: k }
    }
    case 'book': {
      // Falls from the ceiling, speeding up
      const q = k * k
      return { x: TARGET.x, y: -40 + (TARGET.y - 24 + 40) * q, q }
    }
    case 'plane': {
      // In to a point in the air, a loop there (the ring stops too), then a dart at you
      const mid = { x: (ORIGIN.x + TARGET.x) / 2 + 20, y: TARGET.y - 110 }
      if (k < 0.38) return { ...lerp(ORIGIN, mid, k / 0.38), q: (k / 0.38) * 0.45 }
      if (k < 0.8) {
        const a = ((k - 0.38) / 0.42) * Math.PI * 2
        return { x: mid.x + Math.sin(a) * 24, y: mid.y - (1 - Math.cos(a)) * 18, q: 0.45 }
      }
      const a = (k - 0.8) / 0.2
      return { ...lerp(mid, TARGET, a), q: 0.45 + 0.55 * a }
    }
    case 'bolt':
      return { x: TARGET.x, y: TARGET.y * Math.min(1, k), q: k }
    case 'charge':
      return { x: TARGET.x, y: TARGET.y, q: Math.min(1.08, k * k) }
  }
}

function drawShot(ctx: Ctx, s: Shot, x: number, y: number, q: number, font: string, now: number) {
  switch (s.kind) {
    case 'formula':
      ctx.font = `bold 18px ${font}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 4
      ctx.strokeStyle = '#1B1F24'
      ctx.strokeText(s.label, x, y)
      ctx.fillStyle = '#FFE38A'
      ctx.fillText(s.label, x, y)
      return
    case 'chalk': {
      // A stick of chalk with a dusty streak behind it
      ctx.fillStyle = 'rgba(246, 238, 220, 0.35)'
      ctx.fillRect(Math.round(x), Math.round(y) - 2, 26, 4)
      ctx.fillStyle = '#1B1F24'
      ctx.fillRect(Math.round(x) - 9, Math.round(y) - 4, 18, 8)
      ctx.fillStyle = '#F6EEDC'
      ctx.fillRect(Math.round(x) - 7, Math.round(y) - 2, 14, 4)
      return
    }
    case 'book': {
      const u = Math.round(4 + q * 3)
      sprite(ctx, BOOK_ART, SHOT_PAL, x - (9 * u) / 2, y - (7 * u) / 2, u)
      return
    }
    case 'plane': {
      sprite(ctx, PLANE_ART, SHOT_PAL, x - 16, y - 14, 4)
      // A question mark over it while it loops
      if (q === 0.45) {
        ctx.font = `bold 20px ${font}`
        ctx.textAlign = 'center'
        ctx.lineWidth = 4
        ctx.strokeStyle = '#1B1F24'
        ctx.strokeText('?', x, y - 26)
        ctx.fillStyle = '#FFE38A'
        ctx.fillText('?', x, y - 26)
      }
      return
    }
    case 'bolt': {
      // A jagged bolt from the ceiling down to its tip
      ctx.fillStyle = '#1B1F24'
      for (let yy = 0, i = 0; yy < y; yy += 16, i++) ctx.fillRect(x + (i % 2 ? 6 : -10) - 1, yy - 1, 10, 18)
      ctx.fillStyle = Math.floor(now / 50) % 2 ? '#FFE38A' : '#FFFFFF'
      for (let yy = 0, i = 0; yy < y; yy += 16, i++) ctx.fillRect(x + (i % 2 ? 6 : -10), yy, 8, 16)
      return
    }
    case 'charge':
      return
  }
}

function drawStars(ctx: Ctx, cx: number, cy: number, t: number) {
  for (let i = 0; i < 3; i++) {
    const a = t * 7 + (i * Math.PI * 2) / 3
    const sx = Math.round(cx + Math.cos(a) * 30)
    const sy = Math.round(cy + Math.sin(a) * 8)
    ctx.fillStyle = '#1B1F24'
    ctx.fillRect(sx - 6, sy - 6, 12, 12)
    ctx.fillStyle = '#FFD24A'
    ctx.fillRect(sx - 1, sy - 5, 2, 10)
    ctx.fillRect(sx - 5, sy - 1, 10, 2)
    ctx.fillRect(sx - 2, sy - 2, 4, 4)
  }
}

function drawScene(ctx: Ctx, f: Fight, now: number, font: string) {
  const t = now / 1000
  drawLibrary(ctx, t, f.phase, font)

  // Boss, which lunges at you during a charge and springs back after
  let bx = BOSS_X
  let by = BOSS_Y + Math.round(Math.sin(t * 2) * 2)
  if (f.mode === 'tell') bx += Math.round(Math.sin(t * 70) * (f.move?.hits[0].kind === 'charge' ? 4 : 2))
  const charge = f.shots.find((s) => s.kind === 'charge' && now >= s.spawn && (!s.grade || now - s.at < 450))
  const cq = !charge ? 0 : !charge.grade ? Math.min(1, shotPos(charge, now).q) : Math.max(0, 1 - (now - charge.at) / 450)
  const CDX = PLAYER_X + 40 - BOSS_X
  const CDY = PLAYER_Y + 12 * PS - 25 * BS - BOSS_Y
  if (charge && !charge.grade && cq > 0.15) {
    // Afterimages trailing the dash
    ctx.save()
    for (const back of [0.55, 0.3]) {
      ctx.globalAlpha = 0.22
      sprite(ctx, ARCHIVIST, { ...ARCHIVIST_PAL, e: EYES[f.phase] }, bx + CDX * cq * back, by + CDY * cq * back, BS)
    }
    ctx.restore()
  }
  bx += Math.round(CDX * cq)
  by += Math.round(CDY * cq)
  ctx.save()
  if (f.mode === 'won') {
    const k = Math.min(1, (now - f.bossFlash) / 1200)
    ctx.globalAlpha = 1 - k
    by += k * 30
  }
  if (f.mode === 'tell' || f.mode === 'attack') {
    ctx.fillStyle = `rgba(255, 190, 80, ${0.12 + 0.08 * Math.sin(t * 10)})`
    ctx.fillRect(bx - 10, by - 10, 22 * BS + 20, 25 * BS + 20)
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(BOSS_X + 12, BOSS_Y + 25 * BS + 4, 19 * BS - 24, 8)
  const flash = now - f.bossFlash < 130
  sprite(ctx, ARCHIVIST, flash ? WHITE : { ...ARCHIVIST_PAL, e: f.mode === 'counter' ? '#9AA3AD' : EYES[f.phase] }, bx, by, BS)
  ctx.restore()
  if (f.mode === 'counter') drawStars(ctx, bx + 11 * BS, by + 2 * BS, t)

  // You
  let px = PLAYER_X
  let py = PLAYER_Y
  let swing = -1.05
  if (f.mode === 'strike') {
    const k = Math.min(1, (now - f.lunge) / STRIKE_MS)
    px += Math.round(Math.sin(Math.PI * k) * 110)
    py -= Math.round(Math.sin(Math.PI * k) * 46)
    swing = -1.05 + Math.min(1, k * 2.4) * 1.5
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(PLAYER_X + 6, PLAYER_Y + 12 * PS, 40, 6)
  // A falling book's shadow grows under you
  for (const s of f.shots) {
    if (s.kind !== 'book' || s.grade || now < s.spawn) continue
    const q = Math.min(1, shotPos(s, now).q)
    const w = Math.round(14 + 46 * q)
    ctx.fillStyle = `rgba(0,0,0,${0.2 + 0.35 * q})`
    ctx.fillRect(TARGET.x - w / 2, PLAYER_Y + 12 * PS - 2, w, 8)
  }
  const blink = now - f.hurt < 500 && Math.floor(now / 70) % 2 === 0
  ctx.save()
  if (f.mode === 'lost') ctx.globalAlpha = 0.45
  if (!blink) {
    sprite(ctx, RIDER, RIDER_PAL, px, py, PS)
    // Your weapon: a sword forged from an old rail spike
    const hx = px + 9.5 * PS
    const hy = py + 5.5 * PS
    for (let i = 0; i < 10; i++) {
      const sx = Math.round(hx + Math.cos(swing) * i * 5)
      const sy = Math.round(hy + Math.sin(swing) * i * 5)
      ctx.fillStyle = i < 2 ? '#6B4423' : i === 2 ? '#F2C94C' : '#1B1F24'
      ctx.fillRect(sx - 3, sy - 3, i === 2 ? 8 : 7, i === 2 ? 8 : 7)
      if (i > 2) {
        ctx.fillStyle = i === 9 ? '#FFFFFF' : '#C9D1DB'
        ctx.fillRect(sx - 2, sy - 2, 5, 5)
      }
    }
  }
  if (now < f.drinkUntil) sprite(ctx, POTION_ART, SHOT_PAL, px + 14, py - 30, 5)
  // Eureka: the lightbulb flickers over your head until the bolt drops
  const bolt = f.move?.hits[0].kind === 'bolt' && (f.mode === 'tell' || (f.mode === 'attack' && f.shots.some((s) => !s.grade)))
  if (bolt && Math.floor(now / 80) % 3 !== 0) sprite(ctx, BULB_ART, SHOT_PAL, px + 10, py - 46, 5)
  ctx.restore()

  // Shots in flight, and ones you knocked away
  for (const s of f.shots) {
    if (!s.grade) {
      if (now < s.spawn) continue
      const pt = shotPos(s, now)
      drawShot(ctx, s, pt.x, pt.y, pt.q, font, now)
    } else if (s.grade === 'perfect' || s.grade === 'good') {
      const d = now - s.at
      if (d > 450 || s.kind === 'bolt' || s.kind === 'charge') continue
      ctx.save()
      ctx.globalAlpha = 1 - d / 450
      drawShot(ctx, s, TARGET.x + d * 0.35, TARGET.y - d * 0.5, 1, font, now)
      ctx.restore()
    }
  }

  // The parry ring closing on you for the next shot, drawn over the shots so it's never hidden
  if (f.mode === 'attack' || f.mode === 'tell') {
    ctx.lineWidth = 3
    ctx.strokeStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(TARGET.x, TARGET.y, RING_R, 0, Math.PI * 2)
    ctx.stroke()
    const s = f.shots.find((x) => !x.grade && now >= x.spawn)
    if (f.mode === 'attack' && s) {
      const r = Math.max(6, RING_R + 64 * (1 - shotPos(s, now).q))
      const ready = now >= s.impact - EARLY_MS
      // Blue while it's closing in, gold once a parry will land
      ctx.lineWidth = 4
      ctx.strokeStyle = ready ? '#FFD24A' : '#7FB8E8'
      ctx.beginPath()
      ctx.arc(TARGET.x, TARGET.y, r, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  // Getting hit flashes the arena red
  const hurtK = (now - f.hurt) / 350
  if (hurtK < 1) {
    ctx.fillStyle = `rgba(220, 30, 30, ${0.3 * (1 - hurtK)})`
    ctx.fillRect(0, 0, W, H)
  }

  // Floating text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const fl of f.floaters) {
    const k = (now - fl.born) / 1000
    ctx.save()
    ctx.globalAlpha = Math.max(0, 1 - k * k)
    ctx.font = `bold ${fl.big ? 22 : 16}px ${font}`
    ctx.lineWidth = 4
    ctx.strokeStyle = '#1B1F24'
    ctx.strokeText(fl.text, fl.x, fl.y - k * 40)
    ctx.fillStyle = fl.color
    ctx.fillText(fl.text, fl.x, fl.y - k * 40)
    ctx.restore()
  }
}
