'use client'

// Shared pieces for the end-of-line boss fights: header, boss HP, your hearts and potions, the
// intro card, the phase banner, results, and a canvas animation loop. The Red Line fight lives in
// LineBoss.tsx; the Green (rhythm) and Orange (slingshot) fights build on these.

import { useEffect, useRef, type ReactNode } from 'react'
import { FlaskConical, Heart, Map as MapIcon, RotateCcw, Shield, Skull, Swords, Trophy, X } from 'lucide-react'
import { LINES, type LineId } from './stations'
import { Coin } from './fantasy'
import { NUM, PANEL } from './pixel'
import { END_BOSS } from './stats'
import type { FighterStats } from './LineBoss'

export type Phase = 1 | 2 | 3
export type BossResult = { won: boolean; gold: number; dealt: number }
export type EndFightProps = {
  line: LineId
  maxHp: number
  stats: FighterStats
  onExit: (gold: number) => void
  onRetry: () => void
  onResult?: (r: BossResult) => void
}

export const ROMAN = ['I', 'II', 'III']
export const phaseOf = (hp: number, max: number): Phase => (hp > (max * 2) / 3 ? 1 : hp > max / 3 ? 2 : 3)
export const resultFor = (won: boolean, dealt: number): BossResult => ({
  won,
  dealt,
  gold: won ? END_BOSS.winGold : Math.round(dealt * END_BOSS.partialRate),
})

/** Calls onResult once when the fight has a result (a retry remounts the fight). */
export function useReportResult(result: BossResult | null, onResult?: (r: BossResult) => void) {
  const reported = useRef(false)
  useEffect(() => {
    if (result && !reported.current) {
      reported.current = true
      onResult?.(result)
    }
  }, [result, onResult])
}

export function BossHeader({ line, name, onQuit }: { line: LineId; name: string; onQuit: () => void }) {
  const info = LINES[line]
  return (
    <header className={`absolute inset-x-4 top-[56px] z-10 flex h-[56px] items-center gap-2 pl-1.5 pr-3 ${PANEL}`}>
      <button
        type="button"
        onClick={onQuit}
        aria-label="Run away to the map"
        className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-[#F1E7CF] active:translate-x-[1px] active:translate-y-[1px]"
      >
        <X size={20} strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-pixel text-[12px] leading-none text-muted">
          {info.name} boss · {info.realm}
        </p>
        <h1 className="truncate font-pixel text-[19px] font-bold leading-tight">{name}</h1>
      </div>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink text-white" style={{ backgroundColor: info.color }} aria-hidden>
        <Skull size={16} strokeWidth={2.6} />
      </span>
    </header>
  )
}

export function BossHp({ line, hp, maxHp, phase, phaseName }: { line: LineId; hp: number; maxHp: number; phase: Phase; phaseName: string }) {
  const info = LINES[line]
  const pct = (hp / maxHp) * 100
  return (
    <div className="absolute inset-x-4 top-[122px] z-10">
      <div className="flex items-baseline justify-between font-pixel text-[12.5px] font-bold text-[#FBF3DF]">
        <span>
          Phase {ROMAN[phase - 1]} · {phaseName}
        </span>
        <span className={NUM}>
          {hp} / {maxHp}
        </span>
      </div>
      <div className="relative mt-1 h-[18px] border-[3px] border-ink bg-[#3A1414]" role="meter" aria-label="Boss health" aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={hp}>
        <div className="h-full transition-[width] duration-300" style={{ width: `${pct}%`, backgroundColor: info.color }} />
        <div className="absolute inset-x-0 top-0 h-[3px] bg-white/30" style={{ width: `${pct}%` }} />
        <span className="absolute inset-y-0 left-1/3 w-[3px] bg-ink" />
        <span className="absolute inset-y-0 left-2/3 w-[3px] bg-ink" />
      </div>
    </div>
  )
}

/** Your hearts, shield and combo, plus the potion button. */
export function PlayerRow({
  hearts,
  maxHearts,
  shield,
  combo,
  potions,
  onPotion,
  children,
}: {
  hearts: number
  maxHearts: number
  shield: boolean
  combo: number
  potions: number
  onPotion: () => void
  children?: ReactNode
}) {
  return (
    <div className="absolute inset-x-4 top-[580px] flex items-center gap-2 font-pixel text-[14px] font-bold text-[#FBF3DF]">
      <span className="flex items-center gap-0.5" aria-label={`${hearts} of ${maxHearts} hearts`}>
        {Array.from({ length: maxHearts }, (_, i) => (
          <Heart key={i} size={19} strokeWidth={2.6} className={i < hearts ? 'fill-[#E0463B] text-[#1B1F24]' : 'fill-[#3A3F47] text-[#1B1F24]'} />
        ))}
      </span>
      {shield && (
        <span className="flex items-center border-2 border-ink bg-[#9FD3F5] px-1 leading-[20px] text-ink" title="Brass Shield blocks the next hit" aria-label="Shield ready">
          <Shield size={13} strokeWidth={2.8} />
        </span>
      )}
      <span className="text-[13px]">
        ×<span className={`${NUM} text-[#FFD24A]`}>{combo}</span>
      </span>
      {children}
      <button
        type="button"
        aria-label={`Drink a potion, ${potions} left`}
        onPointerDown={(e) => {
          e.preventDefault()
          onPotion()
        }}
        className={`ml-auto flex h-9 touch-none select-none items-center gap-1 border-2 border-ink bg-[#2F9E5A] px-2 text-[13px] text-white shadow-[2px_2px_0_rgba(15,19,24,0.8)] active:translate-x-px active:translate-y-px active:shadow-none ${potions ? '' : 'opacity-50'}`}
      >
        <FlaskConical size={16} strokeWidth={2.6} /> ×<span className={NUM}>{potions}</span>
      </button>
    </div>
  )
}

export function BossIntro({
  line,
  name,
  taunt,
  rules,
  onStart,
}: {
  line: LineId
  name: string
  taunt: string
  rules: ReactNode
  onStart: () => void
}) {
  const info = LINES[line]
  return (
    <div className="absolute inset-0 flex animate-fade-in items-center justify-center bg-[#0F1318]/60 px-5">
      <div className={`w-full animate-pop p-4 text-center ${PANEL}`}>
        <p className="font-pixel text-[12px] font-bold tracking-[0.1em] text-muted">END OF THE {info.name.toUpperCase()}</p>
        <p className="font-pixel text-[24px] font-bold leading-tight">{name}</p>
        <p className="mt-1 text-[13px] italic leading-snug text-ink-soft">{taunt}</p>
        <div className="mt-2.5 space-y-1 text-left text-[13px] leading-snug">{rules}</div>
        <button
          type="button"
          onClick={onStart}
          autoFocus
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 border-[3px] border-ink font-pixel text-[18px] font-bold text-white shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          style={{ backgroundColor: info.color }}
        >
          <Swords size={18} strokeWidth={2.8} /> Fight!
        </button>
      </div>
    </div>
  )
}

export function PhaseBanner({ line, phase, name }: { line: LineId; phase: Phase; name: string }) {
  return (
    <div className="absolute inset-x-0 top-[150px] animate-pop border-y-[3px] border-ink py-2 text-center text-white" style={{ backgroundColor: LINES[line].dark }}>
      <p className="font-pixel text-[13px] font-bold tracking-[0.12em] opacity-80">PHASE {ROMAN[phase - 1]}</p>
      <p className="font-pixel text-[24px] font-bold leading-tight">{name}</p>
    </div>
  )
}

export function BossResults({
  line,
  result,
  winText,
  loseText,
  onRetry,
  onExit,
}: {
  line: LineId
  result: BossResult
  winText: string
  loseText: string
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
        <p className="mt-1.5 text-[13.5px] leading-snug text-ink-soft">{result.won ? winText : loseText}</p>
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

// ---------- Canvas helpers ----------

export type Ctx = CanvasRenderingContext2D

/** Runs `frame` every animation frame on a crisp, pixel-art canvas; passes the UI's pixel font. */
export function useCanvasLoop(w: number, h: number, frame: (ctx: Ctx, now: number, font: string) => void) {
  const ref = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(frame)
  useEffect(() => {
    frameRef.current = frame
  })
  useEffect(() => {
    const canvas = ref.current!
    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr
    canvas.height = h * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.imageSmoothingEnabled = false
    const font = getComputedStyle(canvas).getPropertyValue('--font-pixelify').trim() || 'monospace'
    let raf = 0
    const loop = (now: number) => {
      frameRef.current(ctx, now, font)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [w, h])
  return ref
}

export function sprite(ctx: Ctx, rows: string[], pal: Record<string, string>, x: number, y: number, u: number) {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const col = pal[rows[r][c]]
      if (!col) continue
      ctx.fillStyle = col
      ctx.fillRect(Math.round(x + c * u), Math.round(y + r * u), u, u)
    }
  }
}

export type Floater = { text: string; color: string; x: number; y: number; born: number; big?: boolean }

/** Text that rises and fades over a second. */
export function drawFloaters(ctx: Ctx, floaters: Floater[], now: number, font: string) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const fl of floaters) {
    const k = (now - fl.born) / 1000
    if (k >= 1) continue
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

/** The rider in the gold hoodie, as in the other games. */
export const RIDER = ['...hhhh...', '..hhhhhh..', '..hhhhhh..', '...ssss...', '..cccccc..', '.bccccccb.', '.bccccccb.', '..cccccc..', '..pp..pp..', '..kk..kk..']
export const RIDER_PAL = { h: '#1B1F24', s: '#F1C9A5', c: '#F2B233', b: '#C0392B', p: '#2B3A55', k: '#1B1F24' }
