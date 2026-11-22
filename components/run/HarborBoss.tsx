'use client'

// Orange Line End Boss: HMS Intolerable, a British warship in Boston Harbor. A Tea Party fight:
// drag back on the harbor and let go to fling tea crates from your slingshot on Griffin's Wharf.
// Crates that hit the ship do a little damage; crates that hit a glowing weak point (a cannon
// about to fire, or the Admiral peeking out) do a lot, cancel that cannon's shot, and build your
// combo. Cannonballs that do get fired at you: hold Duck to take cover behind the barrel.
// Phase II adds double shots and the Admiral; Phase III a storm, with wind that bends your throws.

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Shield } from 'lucide-react'
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
import { PixelScreen } from './pixel'
import { StatusBar } from './ui'

const NAME = 'HMS Intolerable'
const TAUNT = '"Every crate of tea is taxed, colonist. Even the ones you throw."'

const W = 361
const H = 404
const WATER_Y = 300
const SLING = { x: 78, y: 286 }
const GRAVITY = 520
const MAX_PULL = 84
const POWER = 6.2
const RELOAD_MS = 750
const CRATE_R = 7
const WEAK_R = 17
const BANNER_MS = 1800

const PHASES: Record<Phase, { name: string; drift: number; charge: number; flight: number; gap: number }> = {
  1: { name: "Griffin's Wharf", drift: 14, charge: 2800, flight: 1400, gap: 2600 },
  2: { name: 'Full Broadside', drift: 30, charge: 2200, flight: 1250, gap: 2000 },
  3: { name: 'Storm in the Harbor', drift: 42, charge: 1800, flight: 1050, gap: 1600 },
}

type Crate = { x: number; y: number; vx: number; vy: number; spin: number }
type Ball = { x0: number; y0: number; born: number; flight: number; grape: boolean }
type Splash = { x: number; y: number; born: number; big: boolean }
type Weak = { kind: 'cannon0' | 'cannon1' | 'admiral'; opens: number; until: number }
type Fight = {
  phase: Phase
  shipX: number
  shipDir: number
  hp: number
  hearts: number
  shield: boolean
  potions: number
  combo: number
  crates: Crate[]
  balls: Ball[]
  splashes: Splash[]
  weak: Weak[]
  nextAttack: number
  nextAdmiral: number
  reloadAt: number
  aim: { x0: number; y0: number; dx: number; dy: number } | null
  ducking: boolean
  wind: number
  nextWind: number
  floaters: Floater[]
  bossHurt: number
  youHurt: number
  banner: number
  over: boolean
  last: number
}
type Hud = { hp: number; hearts: number; shield: boolean; potions: number; combo: number; phase: Phase; wind: number; ducking: boolean }

/** Where each weak point sits on the ship, relative to its center. */
const WEAK_AT: Record<Weak['kind'], { dx: number; dy: number }> = {
  cannon0: { dx: -40, dy: WATER_Y - 16 },
  cannon1: { dx: -6, dy: WATER_Y - 16 },
  admiral: { dx: 48, dy: WATER_Y - 66 },
}
const PLAYER = { x: 38, y: WATER_Y - 4 }

function newFight(maxHp: number, stats: EndFightProps['stats']): Fight {
  return {
  phase: 1,
  shipX: 262,
  shipDir: -1,
  hp: maxHp,
  hearts: stats.hearts,
  shield: stats.shield,
  potions: stats.potions,
  combo: 0,
  crates: [],
  balls: [],
  splashes: [],
  weak: [],
  nextAttack: 0,
  nextAdmiral: 0,
  reloadAt: 0,
  aim: null,
  ducking: false,
  wind: 0,
  nextWind: 0,
  floaters: [],
  bossHurt: 0,
  youHurt: 0,
  banner: 0,
  over: false,
  last: 0,
}
}

export function HarborFight({ line, maxHp, stats, onExit, onRetry, onResult }: EndFightProps) {
  // Created on first use (outside render), like the Red Line fight
  const fightRef = useRef<Fight | null>(null)
  const fight = () => (fightRef.current ??= newFight(maxHp, stats))
  const hudOf = (s: Fight): Hud => ({
    hp: s.hp,
    hearts: s.hearts,
    shield: s.shield,
    potions: s.potions,
    combo: Math.max(1, Math.min(s.combo, stats.combo)),
    phase: s.phase,
    wind: s.wind,
    ducking: s.ducking,
  })
  const [hud, setHud] = useState<Hud>(() => hudOf(newFight(maxHp, stats)))
  const [started, setStarted] = useState(false)
  const [banner, setBanner] = useState<Phase | null>(null)
  const [result, setResult] = useState<BossResult | null>(null)
  useReportResult(result, onResult)
  const sync = () => setHud(hudOf(fight()))
  const float = (text: string, color: string, x: number, y: number, big = false) =>
    fight().floaters.push({ text, color, x, y, born: performance.now(), big })

  // A test hook in development only, so scripted playtests can aim
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') (window as unknown as { __harbor?: Fight }).__harbor = fight()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finish = (won: boolean) => {
    const s = fight()
    if (s.over) return
    s.over = true
    s.aim = null
    window.setTimeout(() => setResult(resultFor(won, maxHp - s.hp)), 1000)
  }

  const running = () => started && !fight().over && performance.now() > fight().banner

  const damage = (amount: number, x: number, y: number, label?: string) => {
    const s = fight()
    const now = performance.now()
    s.hp = Math.max(0, s.hp - amount)
    s.bossHurt = now
    float(`−${amount}`, '#FFE38A', x, y - 14, !!label)
    if (label) float(label, '#FFFFFF', x, y - 40)
    if (s.hp <= 0) {
      float('Ship sunk!', '#FFE38A', W / 2 + 40, 120, true)
      finish(true)
    } else {
      const next = phaseOf(s.hp, maxHp)
      if (next !== s.phase) {
        s.phase = next
        s.weak = []
        s.balls = []
        s.banner = now + BANNER_MS
        s.nextAttack = now + BANNER_MS + 900
        s.nextAdmiral = now + BANNER_MS + 2500
        if (next === 3) s.nextWind = now
        setBanner(next)
        window.setTimeout(() => setBanner(null), BANNER_MS)
      }
    }
    sync()
  }

  const throwCrate = (dx: number, dy: number) => {
    const s = fight()
    const now = performance.now()
    if (!running() || s.ducking || now < s.reloadAt) return
    const len = Math.hypot(dx, dy)
    if (len < 12) return
    const k = Math.min(1, MAX_PULL / len)
    s.crates.push({ x: SLING.x, y: SLING.y, vx: -dx * k * POWER, vy: -dy * k * POWER, spin: 0 })
    s.reloadAt = now + RELOAD_MS
  }

  const setDuck = (on: boolean) => {
    const s = fight()
    if (s.ducking === on) return
    s.ducking = on
    if (on) s.aim = null
    sync()
  }

  const drink = () => {
    const s = fight()
    if (!started || s.over || s.potions <= 0 || s.hearts >= stats.hearts) return
    s.potions -= 1
    s.hearts += 1
    float('+1 heart', '#7CF29A', PLAYER.x + 20, PLAYER.y - 50, true)
    sync()
  }

  // Keyboard: Space/S hold to duck, H/P potion. Arrows + Enter aim and throw without a mouse.
  const keyAim = useRef({ angle: 45, power: 0.8, used: false })
  const live = useRef({ setDuck, drink, throwCrate })
  useEffect(() => {
    live.current = { setDuck, drink, throwCrate }
  })
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const a = keyAim.current
      if (e.key === ' ' || e.key === 's') live.current.setDuck(true)
      else if (e.key === 'h' || e.key === 'p') live.current.drink()
      else if (e.key === 'ArrowUp') a.angle = Math.min(80, a.angle + 3)
      else if (e.key === 'ArrowDown') a.angle = Math.max(5, a.angle - 3)
      else if (e.key === 'ArrowRight') a.power = Math.min(1, a.power + 0.04)
      else if (e.key === 'ArrowLeft') a.power = Math.max(0.3, a.power - 0.04)
      else if (e.key === 'Enter') {
        const r = (a.angle * Math.PI) / 180
        live.current.throwCrate(-Math.cos(r) * MAX_PULL * a.power, Math.sin(r) * MAX_PULL * a.power)
      } else return
      if (e.key.startsWith('Arrow')) a.used = true
      e.preventDefault()
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 's') live.current.setDuck(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const start = () => {
    const now = performance.now()
    Object.assign(fight(), { nextAttack: now + 1600, nextAdmiral: now + 1e9, last: now })
    setStarted(true)
  }

  /** The ship opens a cannon port (a weak point); if you don't hit it in time, it fires. */
  const attack = (now: number) => {
    const s = fight()
    const def = PHASES[s.phase]
    const free = (['cannon0', 'cannon1'] as const).filter((k) => !s.weak.some((w) => w.kind === k))
    if (!free.length) return
    const pick = free[Math.floor(Math.random() * free.length)]
    s.weak.push({ kind: pick, opens: now, until: now + def.charge })
    // Phase II+: sometimes both cannons, staggered
    const other = free.find((k) => k !== pick)
    if (s.phase >= 2 && other && Math.random() < 0.4) s.weak.push({ kind: other, opens: now + 500, until: now + 500 + def.charge })
    s.nextAttack = now + def.charge + def.gap * (0.8 + Math.random() * 0.4)
  }

  const fire = (w: Weak, now: number) => {
    const s = fight()
    const at = WEAK_AT[w.kind]
    const grape = s.phase === 3 && Math.random() < 0.45
    const n = grape ? 3 : 1
    for (let i = 0; i < n; i++) s.balls.push({ x0: s.shipX + at.dx - 14, y0: at.dy, born: now + i * 320, flight: PHASES[s.phase].flight, grape })
    float(grape ? 'Grapeshot!' : 'Fire!', '#FF6A5E', s.shipX + at.dx, at.dy - 26)
  }

  const frame = (ctx: Ctx, now: number, font: string) => {
    const s = fight()
    const def = PHASES[s.phase]
    const dt = Math.min(0.05, (now - (s.last || now)) / 1000)
    s.last = now
    const go = started && !s.over && now > s.banner

    // ---- update
    if (go) {
      s.shipX += s.shipDir * def.drift * dt
      if (s.shipX < 222) s.shipDir = 1
      if (s.shipX > 292) s.shipDir = -1
      if (now >= s.nextAttack) attack(now)
      if (s.phase >= 2 && now >= s.nextAdmiral && !s.weak.some((w) => w.kind === 'admiral')) {
        s.weak.push({ kind: 'admiral', opens: now, until: now + 2300 })
        float('The Admiral!', '#FFD24A', s.shipX + 48, WATER_Y - 100)
        s.nextAdmiral = now + 5500 + Math.random() * 3000
      } else if (s.phase < 2) s.nextAdmiral = now + 3000
      if (s.phase === 3 && now >= s.nextWind) {
        s.wind = Math.round((Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 90))
        s.nextWind = now + 5000
        sync()
      }
      // Weak points that ran out: cannons fire, the Admiral ducks back in
      for (const w of s.weak) if (now >= w.until && w.kind !== 'admiral') fire(w, now)
      s.weak = s.weak.filter((w) => now < w.until)

      // Crates in flight
      for (const c of s.crates) {
        c.vy += GRAVITY * dt
        c.vx += s.wind * dt
        c.x += c.vx * dt
        c.y += c.vy * dt
        c.spin += dt * 9
        // Weak points first
        let hit = false
        for (const w of s.weak) {
          if (now < w.opens) continue
          const at = WEAK_AT[w.kind]
          if (Math.hypot(c.x - (s.shipX + at.dx), c.y - at.dy) > WEAK_R + CRATE_R) continue
          s.weak = s.weak.filter((x) => x !== w)
          s.combo += 1
          const mult = Math.min(s.combo, stats.combo)
          const admiral = w.kind === 'admiral'
          s.splashes.push({ x: c.x, y: c.y, born: now, big: true })
          damage(Math.round(stats.damage * (admiral ? 4 : 2.5) * mult), c.x, c.y, admiral ? 'Admiral hit!' : 'Cannon jammed!')
          hit = true
          break
        }
        if (hit) {
          c.y = 9999
          continue
        }
        // The hull and sails
        const sx = s.shipX
        const onHull = c.x > sx - 72 && c.x < sx + 72 && c.y > WATER_Y - 32 && c.y < WATER_Y + 4
        const onStern = c.x > sx + 34 && c.x < sx + 72 && c.y > WATER_Y - 52 && c.y < WATER_Y
        const onSail = c.x > sx - 58 && c.x < sx + 30 && c.y > 128 && c.y < WATER_Y - 40
        if (onHull || onStern || onSail) {
          s.splashes.push({ x: c.x, y: c.y, born: now, big: false })
          damage(Math.round(stats.damage * 0.7), c.x, c.y)
          c.y = 9999
        } else if (c.y > WATER_Y + 6 && c.x > 120) {
          s.combo = 0
          s.splashes.push({ x: c.x, y: WATER_Y, born: now, big: false })
          float('Splash', '#9FD3F5', c.x, WATER_Y - 20)
          c.y = 9999
          sync()
        }
      }
      s.crates = s.crates.filter((c) => c.y < H + 20 && c.x > -20 && c.x < W + 40)

      // Cannonballs landing on the wharf
      for (const b of s.balls) {
        if (now - b.born < b.flight) continue
        b.born = -1e9
        if (s.ducking) float('Ducked!', '#7CF29A', PLAYER.x + 24, PLAYER.y - 44)
        else if (s.shield) {
          s.shield = false
          float('Blocked!', '#9FD3F5', PLAYER.x + 24, PLAYER.y - 44, true)
          sync()
        } else {
          s.hearts -= 1
          s.youHurt = now
          s.combo = 0
          float('−1 heart', '#FF6A5E', PLAYER.x + 24, PLAYER.y - 44, true)
          sync()
          if (s.hearts <= 0) finish(false)
        }
        s.splashes.push({ x: PLAYER.x, y: PLAYER.y - 10, born: now, big: true })
      }
      s.balls = s.balls.filter((b) => b.born > -1e8)
    }
    s.splashes = s.splashes.filter((p) => now - p.born < 500)

    // ---- draw
    drawHarbor(ctx, now, s, font)
    drawShip(ctx, now, s)

    // Cannonballs arcing toward you
    for (const b of s.balls) {
      const k = (now - b.born) / b.flight
      if (k < 0) continue
      const x = b.x0 + (PLAYER.x - b.x0) * k
      const y = b.y0 + (PLAYER.y - 14 - b.y0) * k - Math.sin(k * Math.PI) * 90
      ctx.fillStyle = '#0C0F12'
      ctx.fillRect(x - 6, y - 6, 12, 12)
      ctx.fillStyle = '#4A525C'
      ctx.fillRect(x - 4, y - 4, 4, 4)
    }

    // Wharf, barrel cover, slingshot and you
    ctx.fillStyle = '#6B4A2E'
    ctx.fillRect(0, WATER_Y - 2, 118, 10)
    ctx.fillStyle = '#4E3420'
    for (let x = 0; x < 118; x += 18) ctx.fillRect(x, WATER_Y - 2, 2, 10)
    for (const px of [10, 56, 104]) ctx.fillRect(px, WATER_Y + 8, 8, H - WATER_Y)
    const blink = now - s.youHurt < 800 && Math.floor(now / 80) % 2 === 0
    if (!blink) {
      if (s.ducking) sprite(ctx, RIDER.slice(0, 8), RIDER_PAL, PLAYER.x - 39, PLAYER.y - 26, 3)
      else sprite(ctx, RIDER, RIDER_PAL, PLAYER.x - 10, PLAYER.y - 32, 3)
    }
    // Barrel to hide behind
    ctx.fillStyle = '#1B1F24'
    ctx.fillRect(PLAYER.x - 38, PLAYER.y - 26, 26, 26)
    ctx.fillStyle = '#8C5A3A'
    ctx.fillRect(PLAYER.x - 36, PLAYER.y - 24, 22, 22)
    ctx.fillStyle = '#5E3A22'
    ctx.fillRect(PLAYER.x - 36, PLAYER.y - 19, 22, 3)
    ctx.fillRect(PLAYER.x - 36, PLAYER.y - 9, 22, 3)
    // Slingshot
    ctx.fillStyle = '#5E3A22'
    ctx.fillRect(SLING.x - 3, SLING.y, 6, WATER_Y - SLING.y)
    ctx.fillRect(SLING.x - 12, SLING.y - 16, 5, 18)
    ctx.fillRect(SLING.x + 7, SLING.y - 16, 5, 18)
    ctx.fillRect(SLING.x - 12, SLING.y - 2, 24, 5)
    const pulled = s.aim ? clampPull(s.aim.dx, s.aim.dy) : null
    const ready = now >= s.reloadAt && !s.ducking && started && !s.over
    if (ready) {
      const cx = SLING.x + (pulled ? -pulled.dx : 0)
      const cy = SLING.y - 12 + (pulled ? -pulled.dy : 0)
      ctx.strokeStyle = '#2B1A0E'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(SLING.x - 10, SLING.y - 14)
      ctx.lineTo(cx, cy)
      ctx.lineTo(SLING.x + 10, SLING.y - 14)
      ctx.stroke()
      drawCrate(ctx, cx, cy, 0)
    }
    // Aim preview: the first part of the arc, so you still have to judge the rest
    const keyA = keyAim.current
    const preview = pulled
      ? { vx: pulled.dx * POWER, vy: pulled.dy * POWER }
      : keyA.used && ready
        ? (() => {
            const r = (keyA.angle * Math.PI) / 180
            return { vx: Math.cos(r) * MAX_PULL * keyA.power * POWER, vy: -Math.sin(r) * MAX_PULL * keyA.power * POWER }
          })()
        : null
    if (preview && ready) {
      let { vx, vy } = preview
      let x = SLING.x
      let y = SLING.y
      ctx.fillStyle = 'rgba(255, 244, 200, 0.85)'
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 3; j++) {
          vy += GRAVITY * 0.016
          vx += s.wind * 0.016
          x += vx * 0.016
          y += vy * 0.016
        }
        ctx.fillRect(x - 2, y - 2, 4, 4)
      }
    }
    for (const c of s.crates) drawCrate(ctx, c.x, c.y, c.spin)

    // Incoming warning over your head
    if (s.balls.some((b) => now - b.born > 0) && !s.ducking && Math.floor(now / 120) % 2) {
      ctx.fillStyle = '#1B1F24'
      ctx.fillRect(PLAYER.x - 9, PLAYER.y - 66, 18, 22)
      ctx.fillStyle = '#E0463B'
      ctx.fillRect(PLAYER.x - 7, PLAYER.y - 64, 14, 18)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(PLAYER.x - 2, PLAYER.y - 62, 4, 8)
      ctx.fillRect(PLAYER.x - 2, PLAYER.y - 52, 4, 4)
    }
    // Splashes and bursts
    for (const p of s.splashes) {
      const k = (now - p.born) / 500
      ctx.globalAlpha = 1 - k
      ctx.fillStyle = p.big ? '#FFE38A' : '#CFE9FF'
      const r = (p.big ? 22 : 12) * (0.4 + k)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        ctx.fillRect(p.x + Math.cos(a) * r - 3, p.y + Math.sin(a) * r - 3, 6, 6)
      }
      ctx.globalAlpha = 1
    }
    const hk = (now - s.youHurt) / 300
    if (hk < 1) {
      ctx.fillStyle = `rgba(220, 30, 30, ${0.3 * (1 - hk)})`
      ctx.fillRect(0, 0, W, H)
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


  const toCanvas = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }

  return (
    <PixelScreen>
      <StatusBar tone="light" />
      <BossHeader line={line} name={NAME} onQuit={() => onExit(0)} />
      <BossHp line={line} hp={hud.hp} maxHp={maxHp} phase={hud.phase} phaseName={PHASES[hud.phase].name} />

      <div className="absolute left-4 top-[164px] border-[3px] border-ink shadow-[4px_4px_0_rgba(15,19,24,0.7)]" style={{ width: W + 6, height: H + 6 }}>
        <canvas
          ref={canvas}
          style={{ width: W, height: H, touchAction: 'none' }}
          className="block [image-rendering:pixelated]"
          role="img"
          aria-label="Boston Harbor: the warship on the right, your slingshot on the wharf. Drag back and let go to throw."
          onPointerDown={(e) => {
            if (!running() || fight().ducking) return
            e.currentTarget.setPointerCapture(e.pointerId)
            const p = toCanvas(e)
            fight().aim = { x0: p.x, y0: p.y, dx: 0, dy: 0 }
          }}
          onPointerMove={(e) => {
            const a = fight().aim
            if (!a) return
            const p = toCanvas(e)
            a.dx = p.x - a.x0
            a.dy = p.y - a.y0
          }}
          onPointerUp={() => {
            const a = fight().aim
            fight().aim = null
            if (a) throwCrate(a.dx, a.dy)
          }}
          onPointerCancel={() => (fight().aim = null)}
        />
      </div>

      <PlayerRow hearts={hud.hearts} maxHearts={stats.hearts} shield={hud.shield} combo={hud.combo} potions={hud.potions} onPotion={drink}>
        {hud.wind !== 0 && hud.phase === 3 && (
          <span className="ml-1 border-2 border-ink bg-[#CFE9FF] px-1.5 text-[12px] leading-[20px] text-ink" aria-label={`Wind blowing ${hud.wind > 0 ? 'right' : 'left'}`}>
            Wind {hud.wind > 0 ? '→' : '←'}
            {Math.abs(hud.wind) > 100 ? (hud.wind > 0 ? '→' : '←') : ''}
          </span>
        )}
      </PlayerRow>

      <button
        type="button"
        aria-label="Duck behind the barrel (hold)"
        aria-pressed={hud.ducking}
        onPointerDown={(e) => {
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
          setDuck(true)
        }}
        onPointerUp={() => setDuck(false)}
        onPointerCancel={() => setDuck(false)}
        className={`absolute inset-x-4 top-[628px] flex h-[96px] touch-none select-none flex-col items-center justify-center border-[3px] border-ink font-pixel text-[22px] font-bold shadow-[3px_3px_0_rgba(15,19,24,0.8)] ${
          hud.ducking ? 'translate-x-[2px] translate-y-[2px] bg-[#C9A23A] shadow-none' : 'bg-[#FBF3DF]'
        }`}
      >
        <span className="flex items-center gap-2">
          <Shield size={22} strokeWidth={2.8} /> {hud.ducking ? 'Ducking…' : 'Hold to duck'}
        </span>
        <span className="text-[12px] font-normal text-muted">Drag back on the harbor and let go to throw</span>
      </button>

      {banner && <PhaseBanner line={line} phase={banner} name={PHASES[banner].name} />}
      {!started && (
        <BossIntro
          line={line}
          name={NAME}
          taunt={TAUNT}
          onStart={start}
          rules={
            <>
              <p>⚓ Drag back on the harbor and let go to fling tea crates at the warship.</p>
              <p>⚓ Hit a glowing cannon before it fires to jam it, for big damage. Later, the Admiral peeks out: hit him too.</p>
              <p>⚓ When a cannonball flies at you, hold Duck to hide behind the barrel. In the storm, wind bends your throws.</p>
            </>
          }
        />
      )}
      {result && (
        <BossResults
          line={line}
          result={result}
          winText="HMS Intolerable sinks into Boston Harbor in a cloud of tea. The Orange Line rolls on."
          loseText={`The warship drove you off the wharf. You dealt ${result.dealt} damage first.`}
          onRetry={onRetry}
          onExit={onExit}
        />
      )}
    </PixelScreen>
  )
}

function clampPull(dx: number, dy: number) {
  const len = Math.hypot(dx, dy)
  const k = len > MAX_PULL ? MAX_PULL / len : 1
  return { dx: -dx * k, dy: -dy * k }
}

// ---------- Drawing ----------

function drawCrate(ctx: Ctx, x: number, y: number, spin: number) {
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate(Math.round(spin * 2) * (Math.PI / 4))
  ctx.fillStyle = '#1B1F24'
  ctx.fillRect(-8, -8, 16, 16)
  ctx.fillStyle = '#C08A4E'
  ctx.fillRect(-6, -6, 12, 12)
  ctx.fillStyle = '#7A4D2A'
  ctx.fillRect(-6, -1, 12, 2)
  ctx.fillRect(-1, -6, 2, 12)
  ctx.restore()
}

function drawHarbor(ctx: Ctx, now: number, s: Fight, font: string) {
  const storm = s.phase === 3
  // Sky
  ctx.fillStyle = storm ? '#3A4250' : '#8FC6E8'
  ctx.fillRect(0, 0, W, WATER_Y)
  ctx.fillStyle = storm ? '#323946' : '#A9D6F0'
  ctx.fillRect(0, WATER_Y - 90, W, 90)
  // Clouds drift with the wind
  ctx.fillStyle = storm ? '#4B5462' : '#F4FAFF'
  for (let i = 0; i < 4; i++) {
    const x = ((i * 120 + (now / 1000) * (8 + s.wind * 0.2)) % (W + 120) + W + 120) % (W + 120) - 60
    const y = 26 + (i % 2) * 34
    ctx.fillRect(x, y, 56, 12)
    ctx.fillRect(x + 10, y - 8, 30, 10)
  }
  // Rain in the storm
  if (storm) {
    ctx.fillStyle = 'rgba(200, 220, 255, 0.35)'
    for (let i = 0; i < 40; i++) {
      const x = ((i * 47 + now * 0.05 + (s.wind * now) / 4000) % W + W) % W
      const y = (i * 71 + now * 0.4) % WATER_Y
      ctx.fillRect(x, y, 2, 8)
    }
  }
  // Water
  ctx.fillStyle = storm ? '#1E3346' : '#2C6B9A'
  ctx.fillRect(0, WATER_Y, W, H - WATER_Y)
  ctx.fillStyle = storm ? '#2B4660' : '#3F86B8'
  for (let y = WATER_Y + 8; y < H; y += 14) {
    const off = Math.round(Math.sin(now / 500 + y) * 8)
    for (let x = ((y / 14) % 2) * 20; x < W; x += 40) ctx.fillRect(x + off, y, 18, 3)
  }
  if (storm && s.wind) {
    ctx.fillStyle = '#FBF3DF'
    ctx.font = `bold 14px ${font}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`Wind ${s.wind > 0 ? '→' : '←'}`, 8, 8)
  }
}

function drawShip(ctx: Ctx, now: number, s: Fight) {
  const x = Math.round(s.shipX)
  const bob = Math.round(Math.sin(now / 520) * 2)
  const shake = now - s.bossHurt < 160 ? Math.round(Math.sin(now / 10) * 3) : 0
  const ox = x + shake
  const flash = now - s.bossHurt < 90
  const C = (c: string) => (flash ? '#FFFFFF' : c)
  ctx.save()
  ctx.translate(0, bob)
  // Masts and sails
  ctx.fillStyle = C('#3A2716')
  ctx.fillRect(ox - 24, 110, 5, WATER_Y - 140)
  ctx.fillRect(ox + 12, 140, 4, WATER_Y - 170)
  ctx.fillStyle = C('#1B1F24')
  ctx.fillRect(ox - 58, 136, 70, 46)
  ctx.fillRect(ox - 50, 190, 56, 44)
  ctx.fillRect(ox - 2, 160, 34, 50)
  ctx.fillStyle = C(s.phase === 3 ? '#C9C2B0' : '#F1EAD6')
  ctx.fillRect(ox - 56, 138, 66, 42)
  ctx.fillRect(ox - 48, 192, 52, 40)
  ctx.fillRect(ox, 162, 30, 46)
  // Tears in the sails as it takes damage
  if (s.phase >= 2) {
    ctx.fillStyle = C('#8FC6E8')
    ctx.fillRect(ox - 36, 150, 8, 10)
    ctx.fillRect(ox - 20, 204, 6, 12)
  }
  // Red ensign on the mast, blowing with the wind
  const dir = s.wind < 0 ? -1 : 1
  ctx.fillStyle = C('#B22234')
  const fx = dir > 0 ? ox - 19 : ox - 44
  ctx.fillRect(fx, 108, 25, 14)
  ctx.fillStyle = C('#1F3A80')
  ctx.fillRect(dir > 0 ? fx : fx + 13, 108, 12, 7)
  // Hull
  ctx.fillStyle = C('#1B1F24')
  ctx.fillRect(ox - 74, WATER_Y - 34, 148, 40)
  ctx.fillRect(ox + 32, WATER_Y - 56, 44, 24)
  ctx.fillStyle = C('#5A3A22')
  ctx.fillRect(ox - 72, WATER_Y - 32, 144, 36)
  ctx.fillRect(ox + 34, WATER_Y - 54, 40, 24)
  ctx.fillStyle = C('#E0B84A')
  ctx.fillRect(ox - 72, WATER_Y - 24, 144, 3)
  ctx.fillRect(ox + 34, WATER_Y - 46, 40, 2)
  ctx.fillStyle = C('#3A2716')
  ctx.fillRect(ox - 72, WATER_Y - 4, 144, 8)
  // Bow
  ctx.fillStyle = C('#1B1F24')
  ctx.fillRect(ox - 86, WATER_Y - 30, 14, 20)
  ctx.fillStyle = C('#5A3A22')
  ctx.fillRect(ox - 84, WATER_Y - 28, 12, 16)
  // Gun ports: closed, or glowing open while a cannon charges
  for (const k of ['cannon0', 'cannon1'] as const) {
    const at = WEAK_AT[k]
    const w = s.weak.find((v) => v.kind === k && now >= v.opens)
    const px = ox + at.dx
    ctx.fillStyle = '#1B1F24'
    ctx.fillRect(px - 9, at.dy - 8, 18, 16)
    if (w) {
      const k2 = (now - w.opens) / (w.until - w.opens)
      ctx.fillStyle = Math.floor(now / (k2 > 0.7 ? 60 : 140)) % 2 ? '#FFD24A' : '#FF6A3D'
      ctx.fillRect(px - 7, at.dy - 6, 14, 12)
      ctx.fillStyle = '#2A2F37'
      ctx.fillRect(px - 16, at.dy - 3, 10, 6)
      // Target ring: this is the weak point
      ctx.strokeStyle = '#FFE38A'
      ctx.lineWidth = 2
      ctx.strokeRect(px - WEAK_R, at.dy - WEAK_R, WEAK_R * 2, WEAK_R * 2)
    } else {
      ctx.fillStyle = C('#3A2716')
      ctx.fillRect(px - 7, at.dy - 6, 14, 12)
    }
  }
  // The Admiral peeks out of the stern cabin
  const adm = s.weak.find((v) => v.kind === 'admiral')
  if (adm) {
    const at = WEAK_AT.admiral
    const px = ox + at.dx
    const rise = Math.min(1, (now - adm.opens) / 250)
    const py = at.dy + Math.round((1 - rise) * 14)
    sprite(
      ctx,
      ['.wwww.', 'wwwwww', '.ssss.', '.sEsE.', '.ssss.', 'rrrrrr', 'rrggrr'],
      { w: '#F4F1EA', s: '#F1C9A5', E: '#1B1F24', r: '#B22234', g: '#E0B84A' },
      px - 9,
      py - 10,
      3,
    )
    ctx.strokeStyle = '#FFE38A'
    ctx.lineWidth = 2
    ctx.strokeRect(px - WEAK_R, at.dy - WEAK_R, WEAK_R * 2, WEAK_R * 2)
  }
  ctx.restore()
}
