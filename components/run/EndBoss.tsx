'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, Award, FlaskConical, Hammer, Map as MapIcon, Shield, Sparkles, Swords, X, Zap } from 'lucide-react'
import { AnswerCard, CoinPill, type AnswerState } from './DelayBoss'
import { EndBossArt, type EndMood, type Phase } from './EndBossArt'
import { Coin, GOLD, GOLD_LIGHT, Gem, HeartRow, OrnateCorners, Ribbon, SparkleBurst } from './fantasy'
import { WoodButton } from './GameFrame'
import { END_BOSS, LOADOUT, PLAYER } from './stats'
import { StatusBar } from './ui'

export type EndState = 'intro' | 'fight' | 'heal' | 'blocked' | 'phase' | 'miss' | 'victory' | 'ko'

const BOSS = {
  name: 'The Iron Archivist',
  title: "Legendary · Scholars' Realm",
  taunt: '“This is the end of the line, scholar.”',
}
const BASE_DMG = PLAYER.damage
const BUFF = 1 + LOADOUT.shardBonus // Signal Shard
const DMG = Math.round(BASE_DMG * BUFF)
const BASE_HEARTS = PLAYER.maxHearts
const MAX_HEARTS = PLAYER.maxHearts + LOADOUT.badgeHearts // Conductor's Badge adds one gold heart slot

const PHASES: Record<Phase, { name: string; attack: string; glow: string; floor: string }> = {
  1: { name: 'The Rusted Stacks', attack: 'Rail Slam!', glow: 'rgba(242,178,51,0.42)', floor: '#2E1F14' },
  2: { name: 'The Burning Pages', attack: 'Page Storm!', glow: 'rgba(255,106,40,0.55)', floor: '#3A1A0C' },
  3: { name: 'The Last Chapter', attack: 'Inferno of Ink!', glow: 'rgba(220,30,60,0.6)', floor: '#2A0A14' },
}
const ROMAN = ['I', 'II', 'III'] as const
const phaseOf = (hp: number, max: number): Phase => (hp > (max * 2) / 3 ? 1 : hp > max / 3 ? 2 : 3)

// TODO: only 6 questions, so a full fight repeats them; answers should be checked server-side.
const QUESTIONS = [
  { q: 'Who was Harvard’s first president?', answers: ['John Harvard', 'Henry Dunster', 'Cotton Mather'], correct: 1 },
  { q: 'What did John Harvard leave the college?', answers: ['His library', 'A ship', 'His farm'], correct: 0 },
  { q: 'The statue in Harvard Yard was made in…', answers: ['1776', '1938', '1884'], correct: 2 },
  { q: 'Which line stop honors a herring?', answers: ['Alewife', 'Porter', 'Davis'], correct: 0 },
  { q: 'MIT moved to Cambridge in…', answers: ['1861', '1916', '1958'], correct: 1 },
  {
    q: 'Who sculpted the John Harvard statue?',
    answers: ['Augustus Saint-Gaudens', 'Paul Revere', 'Daniel Chester French'],
    correct: 2,
  },
]

type ItemId = 'badge' | 'shield' | 'tonic'
const ITEMS: Record<ItemId, { name: string; level: number; icon: ReactNode; note: string }> = {
  badge: { name: "Conductor's Badge", level: 1, icon: <Award size={22} strokeWidth={2.2} />, note: '+1 heart' },
  shield: { name: 'Brass Shield', level: 2, icon: <Shield size={22} strokeWidth={2.2} />, note: 'Blocks 1 miss' },
  tonic: { name: 'Healing Tonic', level: 1, icon: <FlaskConical size={22} strokeWidth={2.2} />, note: '+1 heart' },
}

type Snap = {
  state: EndState
  hp: number
  hearts: number
  combo: number
  q: number
  picked: number | null
  shield: boolean
  tonic: boolean
  lastDmg: number
  dealt: number
}

const P = (s: Partial<Snap> & { state: EndState }): Snap => ({
  hp: 1000,
  hearts: 4,
  combo: 0,
  q: 0,
  picked: null,
  shield: true,
  tonic: true,
  lastDmg: 0,
  dealt: 0,
  ...s,
})

const PREVIEWS: Record<EndState, Snap> = {
  intro: P({ state: 'intro' }),
  fight: P({ state: 'fight', hp: 820, hearts: 3, combo: 1, q: 1, dealt: 180 }),
  heal: P({ state: 'heal', hp: 590, hearts: 3, combo: 0, q: 2, tonic: false, dealt: 410 }),
  blocked: P({
    state: 'blocked',
    hp: 590,
    hearts: 3,
    combo: 0,
    q: 2,
    picked: 0,
    shield: false,
    tonic: false,
    dealt: 410,
  }),
  phase: P({ state: 'phase', hp: 666, hearts: 3, combo: 2, q: 3, shield: false, tonic: false, dealt: 334 }),
  miss: P({ state: 'miss', hp: 300, hearts: 2, combo: 0, q: 4, picked: 0, shield: false, tonic: false, dealt: 700 }),
  victory: P({ state: 'victory', hp: 0, hearts: 2, q: 5, shield: false, tonic: false, dealt: 1000 }),
  ko: P({ state: 'ko', hp: 412, hearts: 0, q: 5, shield: false, tonic: false, dealt: 588 }),
}

export function EndBoss({
  preview,
  maxHp = END_BOSS.hp,
  gold = 0,
  onExit,
}: {
  preview?: EndState
  /** Boss HP; lower it for demo mode. */
  maxHp?: number
  gold?: number
  /** Leave the fight; `goldEarned` is 0 when the player bails out. */
  onExit: (goldEarned: number) => void
}) {
  const [s, setS] = useState<Snap>(() => (preview ? PREVIEWS[preview] : P({ state: 'intro', hp: maxHp })))
  const frozen = !!preview
  const phase = phaseOf(s.hp, maxHp)
  const Q = QUESTIONS[s.q % QUESTIONS.length]
  const mult = Math.min(s.combo + 1, PLAYER.maxCombo)

  // Live play: reveals auto-advance so the items bar can stay at the bottom.
  useEffect(() => {
    if (frozen) return
    const delays: Partial<Record<EndState, number>> = { heal: 1100, blocked: 1400, miss: 1500, phase: 1900 }
    if (s.state === 'fight' && s.picked !== null) {
      const t = window.setTimeout(() => {
        setS((p) => {
          if (p.hp <= 0) return { ...p, state: 'victory' }
          return { ...p, q: p.q + 1, picked: null }
        })
      }, 1100)
      return () => window.clearTimeout(t)
    }
    const d = delays[s.state]
    if (!d) return
    const t = window.setTimeout(() => {
      setS((p) => {
        if (p.state === 'miss' && p.hearts <= 0) return { ...p, state: 'ko' }
        const advance = p.state === 'miss' || p.state === 'blocked' || p.state === 'phase'
        return { ...p, state: 'fight', picked: null, q: advance ? p.q + 1 : p.q }
      })
    }, d)
    return () => window.clearTimeout(t)
  }, [frozen, s.state, s.picked])

  const pick = (i: number) => {
    if (frozen || s.state !== 'fight' || s.picked !== null) return
    if (i === Q.correct) {
      const dmg = DMG * mult
      const hp = Math.max(0, s.hp - dmg)
      const crossed = hp > 0 && phaseOf(hp, maxHp) !== phaseOf(s.hp, maxHp)
      setS({ ...s, picked: i, hp, combo: s.combo + 1, lastDmg: dmg, dealt: s.dealt + (s.hp - hp) })
      if (crossed) window.setTimeout(() => setS((p) => ({ ...p, state: 'phase', picked: null })), 900)
    } else if (s.shield) {
      setS({ ...s, picked: i, shield: false, combo: 0, state: 'blocked' })
    } else {
      setS({ ...s, picked: i, hearts: s.hearts - 1, combo: 0, state: 'miss' })
    }
  }

  const drinkTonic = () => {
    if (frozen || !s.tonic || s.state !== 'fight' || s.picked !== null || s.hearts >= MAX_HEARTS) return
    setS({ ...s, tonic: false, hearts: s.hearts + 1, state: 'heal' })
  }

  if (s.state === 'intro')
    return (
      <Intro s={s} frozen={frozen} onStart={() => !frozen && setS({ ...s, state: 'fight' })} onExit={() => onExit(0)} />
    )

  const isEnd = s.state === 'victory' || s.state === 'ko'
  const hitNow = s.state === 'fight' && s.picked !== null && s.picked === Q.correct
  const mood: EndMood =
    s.state === 'victory'
      ? 'shatter'
      : s.state === 'ko'
        ? 'loom'
        : s.state === 'phase'
          ? 'roar'
          : s.state === 'miss'
            ? 'strike'
            : hitNow
              ? 'recoil'
              : 'idle'
  const effectivePhase: Phase = s.state === 'victory' ? 3 : phase

  return (
    <div className="absolute inset-0 overflow-hidden tex-leather">
      <div
        key={`${s.state}-${s.q}-${s.picked}`}
        className={`absolute inset-0 ${s.state === 'miss' && !frozen ? 'animate-screen-shake' : ''}`}
      >
        <StatusBar tone="light" />
        <div className="absolute inset-0 flex flex-col gap-2 px-4 pb-[30px] pt-[54px]">
          {/* Top bar */}
          <div className="flex h-11 shrink-0 items-center gap-2">
            <WoodButton onClick={() => onExit(0)} label="Retreat to map">
              <X size={21} strokeWidth={2.8} />
            </WoodButton>
            <div className="flex min-w-0 flex-1 justify-center">
              <span className="flex h-9 items-center whitespace-nowrap gap-1.5 rounded-full border-2 border-[#F6D47E] bg-[#DA291C] px-3 font-fantasy text-[12px] font-black tracking-[0.05em] text-white shadow-[0_3px_0_#6E120B]">
                <Swords size={14} strokeWidth={2.8} /> End of Line
              </span>
            </div>
            <CoinPill value={gold} />
          </div>

          {/* Arena */}
          <Arena phase={effectivePhase} flash={s.state === 'phase'} frozen={frozen}>
            <p className="relative z-10 mt-2.5 text-center font-fantasy text-[10px] font-black tracking-[0.2em] text-[#E8D3A4]">
              {BOSS.title.toUpperCase()}
            </p>
            <h2
              className="relative z-10 mx-auto line-clamp-2 max-w-[300px] px-6 text-center font-fantasy text-[19px] font-black leading-[1.1] [text-shadow:0_2px_0_#000]"
              style={{ color: GOLD_LIGHT }}
            >
              {BOSS.name}
            </h2>
            <div className="absolute inset-x-0 bottom-[66px] top-[52px] flex items-center justify-center">
              <div className="relative">
                <EndBossArt mood={mood} phase={effectivePhase} frozen={frozen} size={isEnd ? 190 : 150} />
                {hitNow && (
                  <>
                    <SparkleBurst frozen={frozen} count={14} />
                    <DamageNumber value={s.lastDmg} frozen={frozen} />
                  </>
                )}
                {s.state === 'ko' && (
                  <span className="absolute -right-4 top-2 rotate-12 font-fantasy text-[22px] font-black text-[#FF6B57] [text-shadow:0_2px_0_#000]">
                    HA! HA!
                  </span>
                )}
              </div>
            </div>
            {s.state === 'phase' && (
              <div
                className={`absolute inset-x-0 top-[38%] z-20 flex flex-col items-center ${frozen ? '' : 'animate-banner-drop'}`}
              >
                <span className="font-fantasy text-[34px] font-black tracking-[0.06em] text-[#FFE08A] [text-shadow:0_3px_0_#5A0E08,0_0_20px_rgba(255,120,40,0.8)]">
                  ROOOAR!
                </span>
                <span className="mt-1 rounded-md border-2 border-[#F6D47E] bg-[#1A0F08]/90 px-3 py-1 font-fantasy text-[14px] font-black tracking-[0.08em] text-[#F6D47E]">
                  PHASE {ROMAN[phase - 1]} · {PHASES[phase].name.toUpperCase()}
                </span>
              </div>
            )}
            {s.state === 'miss' && (
              <span className="absolute inset-x-0 top-[44%] z-20 text-center font-fantasy text-[28px] font-black tracking-[0.04em] text-[#FFF1D0] [paint-order:stroke] [-webkit-text-stroke:5px_#9E150C]">
                {PHASES[phase].attack.toUpperCase()}
              </span>
            )}
            {s.state === 'victory' && (
              <div
                className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,246,208,0.9),transparent_50%)] ${frozen ? 'opacity-50' : 'animate-flash'}`}
              />
            )}
            <div className="absolute inset-x-4 bottom-3">
              <SegmentedHp hp={s.hp} max={maxHp} phase={effectivePhase} flash={hitNow} frozen={frozen} />
            </div>
          </Arena>

          {isEnd ? (
            <EndPanel s={s} onExit={onExit} />
          ) : (
            <>
              <PlayerPanel s={s} mult={mult} frozen={frozen} />

              <div className="relative shrink-0 rounded-[14px] px-3.5 py-2 tex-parchment shadow-[inset_0_0_0_2px_#C99A3B,0_6px_14px_rgba(0,0,0,0.45)]">
                <OrnateCorners inset={3} />
                <p className="relative font-fantasy text-[10.5px] font-black tracking-[0.1em] text-[#8E1710]">
                  STRIKE {s.q + 1}
                </p>
                <p className="relative text-[16px] font-bold leading-snug text-[#2B1D10]">{Q.q}</p>
              </div>

              <div className={`flex shrink-0 flex-col gap-2 ${s.state === 'phase' ? 'opacity-60' : ''}`}>
                {Q.answers.map((a, i) => {
                  const revealed = s.picked !== null
                  const st: AnswerState = !revealed
                    ? 'idle'
                    : i === s.picked && i === Q.correct
                      ? 'hit'
                      : i === s.picked
                        ? s.state === 'blocked'
                          ? 'blocked'
                          : 'miss'
                        : i === Q.correct
                          ? 'answer'
                          : 'dim'
                  return (
                    <AnswerCard
                      key={`${s.q}-${i}`}
                      compact
                      letter={'ABC'[i]}
                      text={a}
                      state={st}
                      damage={s.lastDmg}
                      frozen={frozen}
                      disabled={revealed || s.state !== 'fight'}
                      onClick={() => pick(i)}
                    />
                  )
                })}
              </div>

              <ItemsBar s={s} frozen={frozen} onTonic={drinkTonic} />
            </>
          )}
        </div>
      </div>

      {s.state === 'blocked' && (
        <div className="pointer-events-none absolute inset-x-0 top-[300px] z-30 flex justify-center">
          <span
            className={`flex items-center gap-2 rounded-2xl border-[3px] border-[#E6EEF5] bg-[linear-gradient(180deg,#9AA8B6,#4F5A66)] px-5 py-2 font-fantasy text-[30px] font-black tracking-[0.06em] text-white shadow-[0_0_30px_rgba(220,235,250,0.8),0_6px_0_#1E252C] ${frozen ? '' : 'animate-blocked'}`}
          >
            <Shield size={30} strokeWidth={2.6} className="fill-white/30" /> BLOCKED!
          </span>
        </div>
      )}
      {s.state === 'miss' && (
        <div
          className={`pointer-events-none absolute inset-0 shadow-[inset_0_0_90px_30px_rgba(218,41,28,0.85)] ${frozen ? 'opacity-70' : 'animate-red-flash'}`}
          style={{ background: frozen ? 'rgba(218,41,28,0.12)' : 'rgba(218,41,28,0.35)' }}
        />
      )}
    </div>
  )
}

function Arena({
  phase,
  flash,
  frozen,
  children,
}: {
  phase: Phase
  flash: boolean
  frozen: boolean
  children: ReactNode
}) {
  const p = PHASES[phase]
  return (
    <section
      className="relative min-h-[240px] flex-1 overflow-hidden rounded-[22px] border-2 shadow-[0_10px_24px_rgba(0,0,0,0.5),inset_0_0_0_3px_rgba(0,0,0,0.5)] transition-[background] duration-700"
      style={{
        borderColor: GOLD,
        background: `radial-gradient(ellipse at 50% 48%, ${p.glow}, transparent 64%), radial-gradient(ellipse at 50% 120%, ${p.floor}, #0E0806 72%)`,
      }}
    >
      <LibraryBackdrop />
      <OrnateCorners inset={5} />
      {flash && <div className={`absolute inset-0 z-10 bg-[#FF7A1A] ${frozen ? 'opacity-20' : 'animate-flash'}`} />}
      {children}
    </section>
  )
}

function LibraryBackdrop() {
  return (
    <svg
      viewBox="0 0 360 260"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 h-full w-full opacity-40"
      aria-hidden
    >
      {[0, 300].map((x0) => (
        <g key={x0}>
          <rect x={x0} y="20" width="60" height="240" fill="#1A0F08" />
          {[60, 110, 160, 210].map((y) => (
            <g key={y}>
              <rect x={x0} y={y} width="60" height="4" fill="#3A2416" />
              {Array.from({ length: 7 }, (_, i) => (
                <rect
                  key={i}
                  x={x0 + 3 + i * 8}
                  y={y - 30 + (i % 3) * 3}
                  width="6"
                  height={30 - (i % 3) * 3}
                  fill={['#4A1A12', '#22324A', '#3A421E', '#4A3A1A'][i % 4]}
                />
              ))}
            </g>
          ))}
        </g>
      ))}
      <path
        d="M80 260 V120 C80 60 130 30 180 30 C230 30 280 60 280 120 V260"
        fill="none"
        stroke="#3A2A20"
        strokeWidth="10"
      />
    </svg>
  )
}

function DamageNumber({ value, frozen }: { value: number; frozen: boolean }) {
  return (
    <span
      className={`absolute left-1/2 top-0 -ml-12 w-24 text-center font-fantasy text-[48px] font-black text-[#FFF1D0] [paint-order:stroke] [-webkit-text-stroke:5px_#9E150C] ${frozen ? '' : 'animate-dmg'}`}
      style={frozen ? { transform: 'translateY(-18px)' } : undefined}
      aria-live="polite"
    >
      −{value}
    </span>
  )
}

/** One big HP bar split into 3 phase segments; the active segment glows. */
function SegmentedHp({
  hp,
  max,
  phase,
  flash,
  frozen,
}: {
  hp: number
  max: number
  phase: Phase
  flash: boolean
  frozen: boolean
}) {
  const seg = max / 3
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between font-fantasy font-black">
        <span className="text-[11px] tracking-[0.1em] text-[#E8D3A4]">
          PHASE {ROMAN[phase - 1]} · {PHASES[phase].name.toUpperCase()}
        </span>
        <span className="text-[16px] tabular-nums text-[#FFF1D0]">
          {hp} <span className="text-[12px] text-[#C9B28A]">/ {max}</span>
        </span>
      </div>
      <div
        className="flex gap-1"
        role="progressbar"
        aria-label={`Boss health, phase ${phase} of 3`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={hp}
      >
        {[0, 1, 2].map((k) => {
          // Left-anchored bar: leftmost third is phase III, rightmost is phase I (drained first).
          const segPhase = (3 - k) as Phase
          const fill = Math.max(0, Math.min(1, (hp - k * seg) / seg))
          const active = segPhase === phase
          return (
            <div
              key={k}
              className="relative h-[24px] flex-1 overflow-hidden rounded-[8px] border-2 bg-[#120B06] shadow-[inset_0_2px_5px_rgba(0,0,0,0.8),0_2px_0_#000]"
              style={{
                borderColor: active ? GOLD_LIGHT : '#6B5434',
                boxShadow: active ? '0 0 12px rgba(246,212,126,0.6), inset 0 2px 5px rgba(0,0,0,0.8)' : undefined,
              }}
            >
              <div
                className="absolute inset-y-0 left-0 transition-[width] duration-300"
                style={{
                  width: `${fill * 100}%`,
                  background: 'linear-gradient(180deg,#FF7A63 0%,#DA291C 45%,#9E150C 100%)',
                }}
              />
              <div className="absolute inset-x-0 top-0 h-[40%] bg-white/20" />
              <span className="absolute inset-0 flex items-center justify-center font-fantasy text-[11px] font-black text-white/85 [text-shadow:0_1px_2px_#000]">
                {ROMAN[segPhase - 1]}
              </span>
              {flash && active && (
                <div className={`absolute inset-0 bg-white ${frozen ? 'opacity-25' : 'animate-flash'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PlayerPanel({ s, mult, frozen }: { s: Snap; mult: number; frozen: boolean }) {
  return (
    <div className="relative shrink-0 rounded-[16px] border border-[#C99A3B]/60 bg-[#160D07]/85 px-3 py-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between">
        <div className="relative">
          <HeartRow
            hearts={s.hearts}
            max={MAX_HEARTS}
            base={BASE_HEARTS}
            cracking={s.state === 'miss' ? s.hearts : undefined}
            refilling={s.state === 'heal' ? s.hearts - 1 : undefined}
            frozen={frozen}
          />
          {s.state === 'heal' && (
            <span
              className={`absolute -top-4 right-0 font-fantasy text-[15px] font-black text-[#9BFFB0] [text-shadow:0_1px_3px_#000] ${frozen ? '' : 'animate-rise'}`}
            >
              +1
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5" aria-label={`Combo times ${mult}`}>
          <Zap size={18} strokeWidth={2.6} className={mult > 1 ? 'fill-[#F6D47E] text-[#F6D47E]' : 'text-[#8A7A5C]'} />
          <span className="font-fantasy text-[20px] font-black text-[#FFF1D0]">×{mult}</span>
          <span className="flex gap-0.5">
            {[1, 2, 3].map((n) => (
              <span key={n} className={`h-3.5 w-2 rounded-sm ${n <= mult ? 'bg-[#F6D47E]' : 'bg-[#3A2A1A]'}`} />
            ))}
          </span>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#F3E3BF]">
          <Swords size={14} strokeWidth={2.4} /> {DMG} dmg
          <span className="text-[#8A7A5C]">·</span>
          <Zap size={14} strokeWidth={2.4} /> ×{mult} combo
        </span>
        <span className="flex items-center gap-1 rounded-full border border-[#B07CF0]/70 bg-[#2A1640] px-2 py-0.5 text-[11.5px] font-bold text-[#E6D2FF]">
          <Gem level={2} size={13} /> Signal Shard +10%
        </span>
      </div>
    </div>
  )
}

function ItemsBar({ s, frozen, onTonic }: { s: Snap; frozen: boolean; onTonic: () => void }) {
  const slots: { id: ItemId; state: 'passive' | 'ready' | 'used' | 'active'; label: string; onClick?: () => void }[] = [
    { id: 'badge', state: 'passive', label: 'Always on' },
    {
      id: 'shield',
      state: s.state === 'blocked' ? 'active' : s.shield ? 'ready' : 'used',
      label: s.state === 'blocked' ? 'Blocked!' : s.shield ? '1 block' : 'Used',
    },
    {
      id: 'tonic',
      state: s.state === 'heal' ? 'active' : s.tonic ? 'ready' : 'used',
      label: s.state === 'heal' ? 'Healing…' : s.tonic ? 'Tap to use' : 'Used',
      onClick: onTonic,
    },
  ]
  return (
    <div className="grid h-[70px] shrink-0 grid-cols-3 gap-2" aria-label="Equipped items">
      {slots.map((sl) => {
        const it = ITEMS[sl.id]
        const tappable = sl.id === 'tonic' && sl.state === 'ready'
        return (
          <button
            key={sl.id}
            type="button"
            onClick={sl.onClick}
            disabled={!tappable}
            aria-label={`${it.name}, level ${ROMAN[it.level - 1]}. ${it.note}. ${sl.label}`}
            className={`relative flex flex-col items-center justify-center rounded-[14px] border-2 px-1 transition-transform enabled:active:translate-y-[2px] ${
              sl.state === 'used' ? 'opacity-50' : ''
            } ${sl.state === 'active' && !frozen ? 'animate-glow-pulse' : ''}`}
            style={{
              borderColor: sl.state === 'active' || tappable ? GOLD_LIGHT : '#6B5434',
              background:
                sl.state === 'active'
                  ? sl.id === 'tonic'
                    ? 'radial-gradient(circle at 50% 35%, #2F7A4A, #13301E)'
                    : 'radial-gradient(circle at 50% 35%, #6A7886, #232A31)'
                  : 'radial-gradient(circle at 50% 30%, #4A3020, #1E120A)',
              boxShadow:
                sl.state === 'active' && frozen
                  ? '0 0 0 2px #FFF1C2, 0 0 18px rgba(246,212,126,0.95)'
                  : tappable
                    ? '0 3px 0 #0E0804, 0 0 10px rgba(246,212,126,0.35)'
                    : '0 3px 0 #0E0804',
            }}
          >
            <span className="absolute right-1.5 top-1 rounded bg-[#C99A3B] px-1 font-fantasy text-[9px] font-black leading-[14px] text-[#2B1D10]">
              {ROMAN[it.level - 1]}
            </span>
            <span className={sl.state === 'active' ? 'text-white' : 'text-[#F6D47E]'}>{it.icon}</span>
            <span className="mt-0.5 max-w-full truncate text-[11px] font-bold leading-tight text-[#F3E3BF]">
              {it.name.replace("Conductor's ", '').replace('Brass ', '').replace('Healing ', '')}
            </span>
            <span
              className={`text-[10px] font-semibold leading-tight ${
                sl.state === 'used'
                  ? 'text-[#B9A988]'
                  : tappable || sl.state === 'active'
                    ? 'text-[#FFE08A]'
                    : 'text-[#C9B28A]'
              }`}
            >
              {sl.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function EndPanel({ s, onExit }: { s: Snap; onExit: (goldEarned: number) => void }) {
  const win = s.state === 'victory'
  const gold = win ? END_BOSS.winGold : Math.round(s.dealt * END_BOSS.partialRate)
  return (
    <>
      <div className="flex shrink-0 animate-banner-drop flex-col items-center text-center">
        {win ? (
          <div className="scale-[1.35] py-1">
            <Ribbon>LEGENDARY VICTORY</Ribbon>
          </div>
        ) : (
          <span className="flex h-10 items-center gap-2 rounded-full border-2 border-[#DA291C] bg-[#1A0905] px-5 font-fantasy text-[18px] font-black tracking-[0.1em] text-[#FF8A78]">
            KNOCKED OUT
          </span>
        )}
        <p className="mt-2 font-fantasy text-[16px] font-bold text-[#F3E3BF]">
          {win ? 'The Red Line is conquered!' : 'Not strong enough yet.'}
        </p>
        {!win && (
          <div className="mt-1.5">
            <HeartRow hearts={0} max={MAX_HEARTS} base={BASE_HEARTS} frozen size={26} />
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2">
        <div className="relative flex items-center gap-3 rounded-[16px] px-4 py-2.5 tex-parchment shadow-[inset_0_0_0_2px_#C99A3B,0_6px_14px_rgba(0,0,0,0.45)]">
          <OrnateCorners inset={4} />
          <span className="relative flex w-[46px] shrink-0" aria-hidden>
            <Coin size={30} />
            <Coin size={30} className="-ml-4 mt-2" />
          </span>
          <span className="relative flex-1">
            <span className="block font-fantasy text-[26px] font-black leading-none text-[#7A4A0E]">
              +{gold.toLocaleString()} gold
            </span>
            <span className="text-[13px] font-medium text-[#5A4020]">
              {win ? 'Boss bounty · all 3 phases cleared' : `Kept for ${s.dealt} damage dealt`}
            </span>
          </span>
        </div>

        {win ? (
          <div className="rounded-[18px] bg-[linear-gradient(90deg,#F6D47E,#FF8A78,#B07CF0,#7FE7D8,#F6D47E)] bg-[length:200%_100%] p-[3px] shadow-[0_0_26px_rgba(246,212,126,0.6)] animate-shimmer">
            <div className="relative flex items-center gap-3 rounded-[15px] px-3.5 py-3 tex-parchment">
              <OrnateCorners inset={4} />
              <span className="relative flex h-14 w-12 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(160deg,#7A1E14,#2A0A06)] text-[#F6D47E] shadow-[inset_0_0_0_2px_#F6D47E]">
                <Sparkles size={24} strokeWidth={2.2} />
              </span>
              <span className="relative flex-1">
                <span className="font-fantasy text-[10.5px] font-black tracking-[0.14em] text-[#8E1710]">
                  LEGENDARY CARD
                </span>
                <span className="block font-fantasy text-[18px] font-black leading-tight text-[#2B1D10]">
                  The Archivist’s Codex
                </span>
                <span className="text-[13px] font-semibold leading-snug text-[#3A2A16]">
                  +1 heart in every boss fight
                </span>
              </span>
            </div>
          </div>
        ) : (
          <div className="relative flex items-center gap-3 rounded-[16px] px-4 py-2.5 tex-parchment shadow-[inset_0_0_0_2px_#C99A3B]">
            <OrnateCorners inset={4} />
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1A0F08] text-[#F6D47E]">
              <Hammer size={22} strokeWidth={2.2} />
            </span>
            <span className="relative flex-1">
              <span className="font-fantasy text-[10.5px] font-black tracking-[0.12em] text-[#8E1710]">
                SUGGESTED UPGRADE
              </span>
              <span className="block text-[14px] font-bold leading-snug text-[#2B1D10]">
                Iron Rail Spike: +5 damage per level
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2">
        <button
          type="button"
          onClick={() => onExit(gold)}
          className="flex h-[56px] items-center justify-center gap-2 rounded-[18px] border-2 font-fantasy text-[19px] font-black tracking-[0.04em] text-white shadow-[0_5px_0_#6E120B,0_10px_20px_rgba(0,0,0,0.45)] transition-transform active:translate-y-[4px] active:shadow-[0_1px_0_#6E120B]"
          style={{ borderColor: GOLD_LIGHT, background: 'linear-gradient(180deg,#EC4A36 0%,#DA291C 45%,#B71F14 100%)' }}
        >
          {win ? (
            <>
              Claim Rewards <ArrowRight size={20} strokeWidth={3} />
            </>
          ) : (
            <>
              {/* TODO: route to the Armory once it exists */}
              <Hammer size={20} strokeWidth={2.6} /> Go to the Armory
            </>
          )}
        </button>
        {!win && (
          <button
            type="button"
            onClick={() => onExit(gold)}
            className="flex h-12 items-center justify-center gap-2 rounded-[16px] border-2 border-[#6B5434] font-fantasy text-[15px] font-bold text-[#E8D3A4]"
          >
            <MapIcon size={17} /> Back to Map
          </button>
        )}
      </div>
    </>
  )
}

function Intro({ s, frozen, onStart, onExit }: { s: Snap; frozen: boolean; onStart: () => void; onExit: () => void }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <div className={`absolute inset-0 tex-leather ${frozen ? '' : 'animate-fade-in [animation-duration:1.2s]'}`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(242,120,40,0.45),transparent_55%)]" />
      <StatusBar tone="light" />

      <div className="absolute inset-0 flex flex-col px-4 pb-[30px] pt-[58px]">
        <div className="flex shrink-0 items-center justify-between">
          <WoodButton onClick={onExit} label="Retreat to map">
            <X size={21} strokeWidth={2.8} />
          </WoodButton>
          <span className="flex h-9 items-center gap-1.5 rounded-full border-2 border-[#F6D47E] bg-[#DA291C] px-3 font-fantasy text-[12px] font-black tracking-[0.05em] text-white shadow-[0_3px_0_#6E120B]">
            <Swords size={14} strokeWidth={2.8} /> End of Line · Alewife
          </span>
          <span className="w-12" />
        </div>

        {/* Boss rises */}
        <div className="relative mt-1 flex shrink-0 justify-center">
          <div className="absolute bottom-0 h-10 w-64 rounded-[50%] bg-black/60 blur-md" />
          <EndBossArt mood={frozen ? 'idle' : 'rise'} phase={1} frozen={frozen} size={230} />
        </div>
        <p
          className={`text-center font-fantasy text-[11px] font-black tracking-[0.22em] text-[#E8D3A4] ${frozen ? '' : 'animate-fade-in [animation-delay:900ms]'}`}
        >
          {BOSS.title.toUpperCase()}
        </p>
        <h1
          className={`text-center font-fantasy text-[30px] font-black leading-[1.05] tracking-[0.02em] [text-shadow:0_3px_0_#000] ${frozen ? '' : 'animate-banner-drop [animation-delay:900ms]'}`}
          style={{ color: GOLD_LIGHT }}
        >
          {BOSS.name}
        </h1>
        <div
          className={`relative mx-auto mt-2 w-full max-w-[330px] rounded-[16px] px-4 py-2.5 tex-parchment shadow-[inset_0_0_0_2px_#C99A3B,0_8px_18px_rgba(0,0,0,0.5)] ${frozen ? '' : 'animate-fade-in [animation-delay:1200ms]'}`}
        >
          <OrnateCorners inset={4} />
          <p className="relative text-center font-fell text-[20px] italic leading-snug text-[#2B1D10]">{BOSS.taunt}</p>
        </div>

        {/* Loadout */}
        <div className={`mt-auto flex flex-col gap-2 ${frozen ? '' : 'animate-fade-in [animation-delay:1500ms]'}`}>
          <p className="text-center font-fantasy text-[11px] font-black tracking-[0.16em] text-[#E8D3A4]">
            YOUR LOADOUT
          </p>
          <PlayerPanel s={s} mult={1} frozen={frozen} />
          <ItemsBar s={s} frozen={frozen} onTonic={() => {}} />
          <button
            type="button"
            onClick={onStart}
            className="mt-1 flex h-16 items-center justify-center gap-2.5 rounded-[18px] border-2 font-fantasy text-[22px] font-black tracking-[0.06em] text-white shadow-[0_5px_0_#6E120B,0_10px_20px_rgba(0,0,0,0.5)] transition-transform active:translate-y-[4px] active:shadow-[0_1px_0_#6E120B]"
            style={{
              borderColor: GOLD_LIGHT,
              background: 'linear-gradient(180deg,#EC4A36 0%,#DA291C 45%,#B71F14 100%)',
            }}
          >
            <Swords size={24} strokeWidth={2.6} /> BEGIN THE BATTLE
          </button>
        </div>
      </div>
    </div>
  )
}
