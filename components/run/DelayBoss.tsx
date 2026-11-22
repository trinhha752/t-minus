'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, Check, Map as MapIcon, Search, Shield, Skull, Swords, TrainFront, TriangleAlert, X, Zap } from 'lucide-react'
import { BossArt, type BossMood } from './BossArt'
import { Coin, Crack, GOLD, GOLD_LIGHT, Gem, HeartRow, OrnateCorners, Ribbon, SparkleBurst, Twinkle } from './fantasy'
import { WoodButton } from './GameFrame'
import { MapScreen } from './MapScreen'
import { MINI_BOSS, PLAYER, hitDamage } from './stats'
import { StatusBar } from './ui'

export type BossState = 'takeover' | 'fight' | 'hit' | 'miss' | 'defeated' | 'escaped' | 'fallen'

/** Each delay spawns a different foe; names vary in length, so plates wrap to two lines. */
export const BOSSES = [
  { name: 'Signalbane the Unmoving', taunt: '“Your train? It’s not coming.”' },
  { name: 'Rustjaw', taunt: '“Delays are my feast.”' },
  { name: 'Wirewrath, Lord of the Sparking Line', taunt: '“Feel the sparks, rider.”' },
  { name: 'The Switch-Yard Grim', taunt: '“I hold every switch now.”' },
  { name: 'Mistmaw, Wraith Beneath Park Street', taunt: '“Stand clear… forever.”' },
]

// TODO: answers live in the browser here; move to /api/trivia (server-checked) like the README says.
// TODO: verify "cattle crossroads -> Davis" before the demo (Porter is the likelier answer).
const QUESTIONS = [
  { q: 'Which Red Line stop is named for a fish?', answers: ['Davis', 'Alewife', 'Quincy Adams'], correct: 1 },
  { q: 'Park Street opened in what year?', answers: ['1897', '1912', '1940'], correct: 0 },
  {
    q: 'What was first shown near Charles/MGH in 1846?',
    answers: ['The telephone', 'X-ray photos', 'Ether anesthesia'],
    correct: 2,
  },
  { q: 'South Station opened in…', answers: ['1876', '1899', '1925'], correct: 1 },
  { q: 'MIT moved to Kendall Square in…', answers: ['1916', '1861', '1950'], correct: 0 },
  { q: 'Harvard was founded in…', answers: ['1638', '1701', '1636'], correct: 2 },
  { q: 'Which stop was once a cattle crossroads?', answers: ['Davis', 'Central', 'Kendall'], correct: 0 },
  { q: 'Cambridge City Hall was a gift in…', answers: ['1920', '1889', '1855'], correct: 1 },
]

const MAX_HP = MINI_BOSS.hp
const LINE = { name: 'Red Line', delay: '+6 min' }

type Snap = {
  state: BossState
  hp: number
  ghost: number
  q: number
  picked: number | null
  train: number
  dealt: number
  hearts: number
  combo: number
  /** Damage of the most recent hit, for the pop-up number. */
  lastHit: number
}

const base: Snap = {
  state: 'takeover',
  hp: MAX_HP,
  ghost: MAX_HP,
  q: 0,
  picked: null,
  train: MINI_BOSS.trainSeconds,
  dealt: 0,
  hearts: PLAYER.maxHearts,
  combo: 0,
  lastHit: 0,
}

const PREVIEWS: Record<BossState, Snap> = {
  takeover: base,
  fight: { ...base, state: 'fight', hp: 180, ghost: 180, q: 1, train: 104, dealt: 20, combo: 1 },
  hit: { ...base, state: 'hit', hp: 140, ghost: 180, q: 1, picked: 0, train: 97, dealt: 60, combo: 2, lastHit: 40 },
  miss: { ...base, state: 'miss', hp: 180, ghost: 180, q: 1, picked: 2, train: 97, dealt: 20, hearts: 2 },
  defeated: { ...base, state: 'defeated', hp: 0, ghost: 0, q: 6, train: 22, dealt: MAX_HP },
  escaped: { ...base, state: 'escaped', hp: 80, ghost: 80, q: 5, train: 0, dealt: 120 },
  fallen: { ...base, state: 'fallen', hp: 100, ghost: 100, q: 4, train: 40, dealt: 100, hearts: 0 },
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function DelayBoss({
  preview,
  bossIndex,
  gold,
  played,
  streak,
  onExit,
}: {
  preview?: BossState
  /** Which boss from BOSSES; picked by the caller so rendering stays pure. */
  bossIndex: number
  gold: number
  played: Set<string>
  streak: number
  /** Leave the fight; `goldEarned` is 0 when the player bails out. */
  onExit: (goldEarned: number) => void
}) {
  const boss = BOSSES[bossIndex % BOSSES.length]
  const [s, setS] = useState<Snap>(() => PREVIEWS[preview ?? 'takeover'])
  const frozen = !!preview
  const Q = QUESTIONS[s.q % QUESTIONS.length]

  // Train countdown, only while choosing. Solo fight: only the player deals damage.
  useEffect(() => {
    if (frozen || s.state !== 'fight') return
    const t = window.setInterval(() => {
      setS((p) => {
        if (p.state !== 'fight') return p
        const train = p.train - 1
        if (train <= 0) return { ...p, train: 0, state: 'escaped' }
        return { ...p, train }
      })
    }, 1000)
    return () => window.clearInterval(t)
  }, [frozen, s.state])

  // Let the pale "chip" segment catch up shortly after a hit.
  useEffect(() => {
    if (frozen || s.ghost === s.hp) return
    const t = window.setTimeout(() => setS((p) => ({ ...p, ghost: p.hp })), 650)
    return () => window.clearTimeout(t)
  }, [frozen, s.hp, s.ghost])

  const pick = (i: number) => {
    if (frozen || s.state !== 'fight') return
    if (i === Q.correct) {
      const dmg = hitDamage(s.combo)
      const hp = Math.max(0, s.hp - dmg)
      setS({ ...s, picked: i, hp, ghost: s.hp, dealt: s.dealt + (s.hp - hp), combo: s.combo + 1, lastHit: dmg, state: 'hit' })
      if (hp <= 0) window.setTimeout(() => setS((p) => ({ ...p, state: 'defeated' })), 1100)
    } else {
      const hearts = s.hearts - 1
      setS({ ...s, picked: i, hearts, combo: 0, state: 'miss' })
      if (hearts <= 0) window.setTimeout(() => setS((p) => ({ ...p, state: 'fallen' })), 1100)
    }
  }

  const next = () => {
    if (frozen) return
    setS((p) =>
      p.hp <= 0 || p.hearts <= 0 ? p : { ...p, q: p.q + 1, picked: null, ghost: p.hp, state: 'fight' },
    )
  }

  const reward =
    s.state === 'defeated' ? MINI_BOSS.winBonus + s.dealt : Math.round(s.dealt * MINI_BOSS.partialRate)

  if (s.state === 'takeover')
    return (
      <Takeover
        boss={boss}
        frozen={frozen}
        played={played}
        streak={streak}
        gold={gold}
        onFight={() => !frozen && setS({ ...s, state: 'fight' })}
        onExit={() => onExit(0)}
      />
    )

  const inFight = s.state === 'fight' || s.state === 'hit' || s.state === 'miss'
  const mood: BossMood =
    s.state === 'hit'
      ? 'recoil'
      : s.state === 'miss'
        ? 'laugh'
        : s.state === 'defeated'
          ? 'shatter'
          : s.state === 'escaped'
            ? 'retreat'
            : s.state === 'fallen'
              ? 'laugh'
              : 'idle'

  return (
    <div className="absolute inset-0 overflow-hidden tex-leather">
      <div
        key={`${s.state}-${s.q}`}
        className={`absolute inset-0 ${s.state === 'miss' && !frozen ? 'animate-screen-shake' : ''}`}
      >
        <StatusBar tone="light" />
        <div className="absolute inset-0 flex flex-col gap-2.5 px-4 pb-[34px] pt-[54px]">
          {/* Top bar */}
          <div className="flex h-12 shrink-0 items-center gap-2">
            <WoodButton onClick={() => onExit(0)} label="Leave the fight">
              <X size={21} strokeWidth={2.8} />
            </WoodButton>
            <div className="flex min-w-0 flex-1 justify-center">
              <span className="flex h-9 items-center gap-1.5 rounded-full border-2 border-[#F6D47E] bg-[#DA291C] px-3 font-fantasy text-[12.5px] font-black tracking-[0.05em] text-white shadow-[0_3px_0_#6E120B]">
                <TriangleAlert size={15} strokeWidth={2.8} />
                {LINE.name} · {LINE.delay}
              </span>
            </div>
            <CoinPill value={gold} />
          </div>

          {/* Boss arena */}
          <section
            className="relative min-h-[300px] flex-1 overflow-hidden rounded-[22px] border-2 shadow-[0_10px_24px_rgba(0,0,0,0.5),inset_0_0_0_3px_rgba(0,0,0,0.5)]"
            style={{
              borderColor: GOLD,
              background:
                'radial-gradient(ellipse at 50% 46%, rgba(218,41,28,0.42), transparent 62%), radial-gradient(ellipse at 50% 120%, #3B2C24, #120B07 70%)',
            }}
          >
            <TunnelArch dim={s.state !== 'escaped'} />
            <OrnateCorners inset={5} />

            <h2
              className="relative z-10 mx-auto mt-3 line-clamp-2 max-w-[290px] px-6 text-center font-fantasy text-[18px] font-black leading-[1.15] tracking-[0.02em] [text-shadow:0_2px_0_#000]"
              style={{ color: GOLD_LIGHT }}
            >
              {boss.name}
            </h2>

            <div className="absolute inset-x-0 top-[50px] bottom-[86px] flex items-center justify-center">
              <div className="relative">
                <BossArt mood={mood} frozen={frozen} size={s.state === 'escaped' ? 190 : 168} />
                {s.state === 'hit' && (
                  <>
                    <SparkleBurst frozen={frozen} count={14} />
                    <span
                      className={`absolute left-1/2 top-2 -ml-10 w-20 text-center font-fantasy text-[46px] font-black text-[#FFF1D0] [paint-order:stroke] [-webkit-text-stroke:5px_#9E150C] ${frozen ? '' : 'animate-dmg'}`}
                      style={frozen ? { transform: 'translateY(-18px)' } : undefined}
                      aria-live="polite"
                    >
                      −{s.lastHit}
                    </span>
                  </>
                )}
                {s.state === 'miss' && (
                  <span
                    className="absolute -right-6 top-0 rotate-12 font-fantasy text-[22px] font-black text-[#FF6B57] [text-shadow:0_2px_0_#000]"
                    aria-live="polite"
                  >
                    HA! HA!
                  </span>
                )}
                {s.state === 'fallen' && (
                  <p className="absolute -bottom-2 left-1/2 w-60 -translate-x-1/2 text-center font-fell text-[22px] italic text-[#F3E3BF] [text-shadow:0_2px_4px_#000]">
                    “Too weak… for now.”
                  </p>
                )}
                {s.state === 'escaped' && (
                  <p className="absolute -bottom-2 left-1/2 w-56 -translate-x-1/2 text-center font-fell text-[22px] italic text-[#F3E3BF] [text-shadow:0_2px_4px_#000]">
                    “It’ll be back…”
                  </p>
                )}
              </div>
            </div>
            {s.state === 'defeated' && (
              <div
                className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,246,208,0.9),transparent_45%)] ${frozen ? 'opacity-50' : 'animate-flash'}`}
              />
            )}

            {/* HP + train timer */}
            <div className="absolute inset-x-4 bottom-3">
              <HpBar hp={s.hp} ghost={s.ghost} flash={s.state === 'hit'} frozen={frozen} />
              <div className="mt-1.5 flex items-center justify-between text-[12.5px] font-semibold text-[#E8D3A4]">
                <Hearts hearts={s.hearts} combo={s.combo} lostNow={s.state === 'miss' && !frozen} />
                <span className={`flex items-center gap-1.5 ${s.train <= 30 ? 'text-[#FF9A8A]' : ''}`}>
                  <TrainFront size={15} strokeWidth={2.4} />
                  {s.state === 'escaped' ? 'Train arrived' : `Train in ${fmt(s.train)}`}
                </span>
              </div>
            </div>
          </section>

          {inFight ? (
            <FightPanel
              Q={Q}
              qNum={s.q + 1}
              state={s.state}
              picked={s.picked}
              frozen={frozen}
              dmg={s.lastHit}
              onPick={pick}
              onNext={next}
            />
          ) : s.state === 'defeated' ? (
            <Outcome
              win
              title="Victory!"
              subtitle={`${boss.name.split(',')[0]} shatters!`}
              gold={reward}
              goldNote={`You dealt ${s.dealt} damage`}
              onPrimary={() => onExit(reward)}
              primary="Claim Rewards"
              onSecondary={() => onExit(reward)}
            />
          ) : s.state === 'fallen' ? (
            <Outcome
              icon={<Skull size={17} strokeWidth={2.6} />}
              title="Knocked Out"
              subtitle={`${boss.name.split(',')[0]} was too strong this time.`}
              gold={reward}
              goldNote={`Partial reward for ${s.dealt} damage`}
              onPrimary={() => onExit(reward)}
              primary="Retreat"
              onSecondary={() => onExit(reward)}
            />
          ) : (
            <Outcome
              title="Train Arrived"
              subtitle={`${boss.name.split(',')[0]} slips into the tunnel.`}
              gold={reward}
              goldNote={`Partial reward for ${s.dealt} damage`}
              onPrimary={() => onExit(reward)}
              primary="Board the Train"
              onSecondary={() => onExit(reward)}
            />
          )}
        </div>
      </div>

      {s.state === 'miss' && (
        <div
          className={`pointer-events-none absolute inset-0 shadow-[inset_0_0_90px_30px_rgba(218,41,28,0.85)] ${frozen ? 'opacity-70' : 'animate-red-flash'}`}
          style={{ background: frozen ? 'rgba(218,41,28,0.12)' : 'rgba(218,41,28,0.35)' }}
        />
      )}
    </div>
  )
}

function Hearts({ hearts, combo, lostNow }: { hearts: number; combo: number; lostNow: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <HeartRow hearts={hearts} max={PLAYER.maxHearts} cracking={lostNow ? hearts : undefined} size={18} />
      {combo > 0 && (
        <span className="flex items-center gap-0.5 font-fantasy text-[12px] font-black text-[#F6D47E]">
          <Zap size={13} strokeWidth={2.6} className="fill-current" />×{Math.min(combo + 1, PLAYER.maxCombo)}
        </span>
      )}
    </span>
  )
}

export function CoinPill({ value }: { value: number }) {
  return (
    <div
      className="relative flex h-12 shrink-0 items-center gap-1.5 rounded-full border-2 bg-[#160D07]/85 pl-1.5 pr-3 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]"
      style={{ borderColor: GOLD }}
      aria-label={`${value} gold`}
    >
      <span className="relative flex w-[30px]" aria-hidden>
        <Coin size={22} className="absolute -top-[13px] left-0" />
        <Coin size={22} className="absolute -top-[8px] left-[8px]" />
      </span>
      <span className="font-fantasy text-[18px] font-extrabold tabular-nums" style={{ color: GOLD_LIGHT }}>
        {value.toLocaleString()}
      </span>
    </div>
  )
}

function TunnelArch({ dim }: { dim: boolean }) {
  return (
    <svg
      viewBox="0 0 360 300"
      preserveAspectRatio="xMidYMax slice"
      className={`absolute inset-0 h-full w-full ${dim ? 'opacity-35' : 'opacity-90'}`}
      aria-hidden
    >
      <defs>
        <radialGradient id="tunnel-mouth" cx="50%" cy="60%" r="60%">
          <stop offset="0" stopColor="#000" />
          <stop offset="1" stopColor="#1A120C" />
        </radialGradient>
      </defs>
      <path d="M70 300 V170 C70 95 130 52 180 52 C230 52 290 95 290 170 V300 Z" fill="#3A2A20" />
      <path d="M90 300 V172 C90 108 136 74 180 74 C224 74 270 108 270 172 V300 Z" fill="url(#tunnel-mouth)" />
      <g stroke="#5A4232" strokeWidth="2" fill="none" opacity="0.8">
        {Array.from({ length: 9 }, (_, i) => {
          const a = Math.PI * (1 - i / 8)
          return (
            <line
              key={i}
              x1={180 + Math.cos(a) * 100}
              y1={172 - Math.sin(a) * 108}
              x2={180 + Math.cos(a) * 112}
              y2={172 - Math.sin(a) * 120}
            />
          )
        })}
      </g>
      <path d="M120 300 L160 200 M240 300 L200 200" stroke="#6B5A4C" strokeWidth="3" />
    </svg>
  )
}

function HpBar({ hp, ghost, flash, frozen }: { hp: number; ghost: number; flash: boolean; frozen: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between font-fantasy font-black">
        <span className="text-[12px] tracking-[0.12em] text-[#E8D3A4]">BOSS HP</span>
        <span className="text-[17px] tabular-nums text-[#FFF1D0]">
          {hp} <span className="text-[13px] text-[#C9B28A]">/ {MAX_HP}</span>
        </span>
      </div>
      <div
        className="relative h-[24px] overflow-hidden rounded-[9px] border-2 bg-[#120B06] shadow-[inset_0_2px_5px_rgba(0,0,0,0.8),0_2px_0_#000]"
        style={{ borderColor: GOLD_LIGHT }}
        role="progressbar"
        aria-label="Boss health"
        aria-valuemin={0}
        aria-valuemax={MAX_HP}
        aria-valuenow={hp}
      >
        <div
          className="absolute inset-y-0 left-0 bg-[#FFE08A] transition-[width] duration-500 ease-out"
          style={{ width: `${(ghost / MAX_HP) * 100}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-200"
          style={{
            width: `${(hp / MAX_HP) * 100}%`,
            background: 'linear-gradient(180deg,#FF7A63 0%,#DA291C 45%,#9E150C 100%)',
          }}
        />
        <div className="absolute inset-x-0 top-0 h-[40%] bg-white/20" />
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="absolute inset-y-0 w-[2px] bg-black/40" style={{ left: `${(i + 1) * 10}%` }} />
        ))}
        {flash && <div className={`absolute inset-0 bg-white ${frozen ? 'opacity-25' : 'animate-flash'}`} />}
      </div>
    </div>
  )
}

function FightPanel({
  Q,
  qNum,
  state,
  picked,
  frozen,
  dmg,
  onPick,
  onNext,
}: {
  Q: (typeof QUESTIONS)[number]
  qNum: number
  state: BossState
  picked: number | null
  frozen: boolean
  dmg: number
  onPick: (i: number) => void
  onNext: () => void
}) {
  const revealed = state === 'hit' || state === 'miss'
  return (
    <>
      <div className="relative shrink-0 rounded-[16px] px-4 py-2.5 tex-parchment shadow-[inset_0_0_0_2px_#C99A3B,0_6px_14px_rgba(0,0,0,0.45)]">
        <OrnateCorners inset={4} />
        <p className="relative flex items-center gap-1.5 font-fantasy text-[11px] font-black tracking-[0.1em] text-[#8E1710]">
          <Swords size={13} strokeWidth={2.6} /> STRIKE {qNum}
        </p>
        <p className="relative mt-0.5 text-[17px] font-bold leading-snug text-[#2B1D10]">{Q.q}</p>
      </div>

      <div className="flex shrink-0 flex-col gap-2.5">
        {Q.answers.map((a, i) => {
          const st: AnswerState = !revealed
            ? 'idle'
            : i === Q.correct && picked === i
              ? 'hit'
              : i === picked
                ? 'miss'
                : i === Q.correct
                  ? 'answer'
                  : 'dim'
          return (
            <AnswerCard
              key={`${qNum}-${i}`}
              letter={'ABC'[i]}
              text={a}
              state={st}
              frozen={frozen}
              damage={dmg}
              disabled={revealed}
              onClick={() => onPick(i)}
            />
          )
        })}
      </div>

      <div className="h-[56px] shrink-0">
        {revealed ? (
          <button
            type="button"
            onClick={onNext}
            className="flex h-[56px] w-full animate-pop items-center justify-between rounded-[18px] border-2 px-5 text-white shadow-[0_5px_0_#6E120B,0_10px_20px_rgba(0,0,0,0.45)] transition-transform active:translate-y-[4px] active:shadow-[0_1px_0_#6E120B]"
            style={{
              borderColor: GOLD_LIGHT,
              background: 'linear-gradient(180deg,#EC4A36 0%,#DA291C 45%,#B71F14 100%)',
            }}
          >
            <span className="text-[14px] font-semibold text-[#FFE9D6]">
              {state === 'hit' ? `Direct hit · −${dmg} HP` : 'Ouch! −1 heart'}
            </span>
            <span className="flex items-center gap-2 font-fantasy text-[18px] font-black">
              Strike Again <ArrowRight size={20} strokeWidth={3} />
            </span>
          </button>
        ) : (
          <p className="flex h-full items-center justify-center gap-2 font-fantasy text-[14px] font-bold tracking-[0.06em] text-[#E8D3A4]">
            <Twinkle size={10} className="text-[#F6D47E]" />
            Tap the right answer to strike
            <Twinkle size={10} className="text-[#F6D47E]" />
          </p>
        )}
      </div>
    </>
  )
}

export type AnswerState = 'idle' | 'hit' | 'miss' | 'answer' | 'dim' | 'blocked'

export function AnswerCard({
  letter,
  text,
  state,
  frozen,
  disabled,
  onClick,
  damage = 0,
  compact = false,
}: {
  letter: string
  text: string
  state: AnswerState
  frozen: boolean
  disabled: boolean
  onClick: () => void
  damage?: number
  compact?: boolean
}) {
  const shadow =
    state === 'hit'
      ? '0 0 0 3px #F6D47E, 0 0 26px rgba(246,212,126,0.85), 0 5px 0 #5E3D14'
      : state === 'answer'
        ? '0 0 0 3px #F6D47E, 0 5px 0 #5E3D14'
        : state === 'miss'
          ? '0 0 0 3px #DA291C, 0 2px 0 #5E3D14'
          : state === 'blocked'
            ? '0 0 0 3px #B9C6D3, 0 0 22px rgba(200,220,240,0.7), 0 2px 0 #5E3D14'
            : state === 'dim'
              ? '0 2px 0 #5E3D14'
              : '0 5px 0 #5E3D14, 0 10px 18px rgba(0,0,0,0.45)'
  const seal =
    state === 'hit'
      ? {
          bg: 'radial-gradient(circle at 35% 30%, #FFF0B3, #E2A93A 55%, #9A6A1C)',
          fg: '#3A2108',
          icon: <Check size={22} strokeWidth={3.6} />,
        }
      : state === 'miss'
        ? {
            bg: 'radial-gradient(circle at 35% 30%, #8E2A1C, #4A120B)',
            fg: '#FFD9CF',
            icon: <X size={22} strokeWidth={3.6} />,
          }
        : state === 'blocked'
          ? {
              bg: 'radial-gradient(circle at 35% 30%, #F2F5F8, #9AA8B6 55%, #4F5A66)',
              fg: '#1E252C',
              icon: <Shield size={20} strokeWidth={3} />,
            }
          : state === 'answer'
            ? {
                bg: 'radial-gradient(circle at 35% 30%, #FFF0B3, #E2A93A 55%, #9A6A1C)',
                fg: '#3A2108',
                icon: <Search size={19} strokeWidth={3} />,
              }
            : {
                bg: 'radial-gradient(circle at 35% 30%, #F0503F, #DA291C 50%, #8E1710)',
                fg: '#FFE9C2',
                icon: <span className="font-fantasy text-[19px] font-black">{letter}</span>,
              }
  const badge: ReactNode =
    state === 'hit' ? (
      <Badge className="bg-[#F6D47E] text-[#2B1D10]">Hit! −{damage}</Badge>
    ) : state === 'miss' ? (
      <Badge className="bg-[#8E1710] text-white">Miss</Badge>
    ) : state === 'blocked' ? (
      <Badge className="bg-[#2E3842] text-[#E6EEF5]">Blocked</Badge>
    ) : state === 'answer' ? (
      <Badge className="bg-[#2B1D10] text-[#F6D47E]">Answer</Badge>
    ) : null

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative w-full rounded-[16px] text-left transition-[transform,opacity] duration-150 enabled:active:translate-y-[4px] ${
        state === 'dim' ? 'opacity-70' : ''
      } ${state === 'miss' && !frozen ? 'animate-shake' : ''} ${state === 'hit' && !frozen ? 'animate-pop' : ''}`}
      style={{ boxShadow: shadow }}
    >
      <span className="absolute inset-0 rounded-[16px] tex-parchment shadow-[inset_0_0_0_2px_#C99A3B,inset_0_0_0_4px_#F4E7C9,inset_0_0_0_5px_rgba(150,105,40,0.55)]" />
      <OrnateCorners inset={4} />
      {state === 'miss' && <Crack />}
      <span
        className={`relative flex items-center gap-3 pl-3.5 pr-3.5 ${compact ? 'min-h-[56px] py-2' : 'min-h-[64px] py-2.5'}`}
      >
        <span
          className={`flex shrink-0 ${compact ? 'h-[38px] w-[38px]' : 'h-[42px] w-[42px]'} items-center justify-center rounded-full shadow-[0_2px_3px_rgba(0,0,0,0.35),inset_0_-2px_3px_rgba(0,0,0,0.3)]`}
          style={{ background: seal.bg, color: seal.fg }}
        >
          {seal.icon}
        </span>
        <span className={`flex-1 font-bold leading-snug text-[#2B1D10] ${compact ? 'text-[16px]' : 'text-[17px]'}`}>
          {text}
        </span>
        {badge}
      </span>
    </button>
  )
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 font-fantasy text-[11px] font-black ${className}`}
    >
      {children}
    </span>
  )
}

function Outcome({
  win,
  icon = <TrainFront size={17} strokeWidth={2.6} />,
  title,
  subtitle,
  gold,
  goldNote,
  primary,
  onPrimary,
  onSecondary,
}: {
  win?: boolean
  icon?: ReactNode
  title: string
  subtitle: string
  gold: number
  goldNote: string
  primary: string
  onPrimary: () => void
  onSecondary: () => void
}) {
  return (
    <>
      <div className="flex shrink-0 animate-banner-drop flex-col items-center text-center">
        {win ? (
          <div className="scale-125">
            <Ribbon>VICTORY!</Ribbon>
          </div>
        ) : (
          <span className="flex h-9 items-center gap-2 rounded-full border-2 border-[#C99A3B] bg-[#160D07] px-4 font-fantasy text-[15px] font-black tracking-[0.08em] text-[#F6D47E]">
            {icon}
            {title.toUpperCase()}
          </span>
        )}
        <p className="mt-2 font-fantasy text-[15px] font-bold text-[#F3E3BF]">{subtitle}</p>
      </div>

      <div className="flex shrink-0 flex-col gap-2.5">
        <div className="relative flex items-center gap-3 rounded-[16px] px-4 py-3 tex-parchment shadow-[inset_0_0_0_2px_#C99A3B,0_6px_14px_rgba(0,0,0,0.45)]">
          <OrnateCorners inset={4} />
          <span className="relative flex w-[44px] shrink-0" aria-hidden>
            <Coin size={30} />
            <Coin size={30} className="-ml-4 mt-2" />
          </span>
          <span className="relative flex-1">
            <span className="block font-fantasy text-[24px] font-black leading-none text-[#7A4A0E]">+{gold} gold</span>
            <span className="text-[13px] font-medium text-[#5A4020]">{goldNote}</span>
          </span>
        </div>

        {win && (
          <div className="relative flex items-center gap-3 rounded-[16px] px-4 py-3 tex-parchment shadow-[inset_0_0_0_2px_#C99A3B,0_0_0_3px_#B07CF0,0_0_22px_rgba(190,140,255,0.6)]">
            <OrnateCorners inset={4} />
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1A0F08]">
              <Gem level={2} size={32} />
            </span>
            <span className="relative flex-1">
              <span className="font-fantasy text-[10.5px] font-black tracking-[0.12em] text-[#5B2B9A]">NEW BUFF</span>
              <span className="block font-fantasy text-[18px] font-black leading-tight text-[#2B1D10]">
                Signal Shard
              </span>
              <span className="text-[13px] font-semibold leading-snug text-[#3A2A16]">
                +10% damage against the End-of-Line Boss
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2.5">
        <button
          type="button"
          onClick={onPrimary}
          className="flex h-[56px] items-center justify-center gap-2 rounded-[18px] border-2 font-fantasy text-[19px] font-black tracking-[0.04em] text-white shadow-[0_5px_0_#6E120B,0_10px_20px_rgba(0,0,0,0.45)] transition-transform active:translate-y-[4px] active:shadow-[0_1px_0_#6E120B]"
          style={{ borderColor: GOLD_LIGHT, background: 'linear-gradient(180deg,#EC4A36 0%,#DA291C 45%,#B71F14 100%)' }}
        >
          {primary} <ArrowRight size={20} strokeWidth={3} />
        </button>
        {!win && (
          <button
            type="button"
            onClick={onSecondary}
            className="flex h-12 items-center justify-center gap-2 rounded-[16px] border-2 border-[#6B5434] font-fantasy text-[15px] font-bold text-[#E8D3A4]"
          >
            <MapIcon size={17} /> Back to Map
          </button>
        )}
      </div>
    </>
  )
}

function Takeover({
  boss,
  frozen,
  played,
  streak,
  gold,
  onFight,
  onExit,
}: {
  boss: (typeof BOSSES)[number]
  frozen: boolean
  played: Set<string>
  streak: number
  gold: number
  onFight: () => void
  onExit: () => void
}) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* The screen the rider was on, dimmed beneath the takeover */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <MapScreen played={played} streak={streak} gold={gold} onSelect={() => {}} chrome={false} />
      </div>
      <div className={`absolute inset-0 bg-[#0B0705]/80 ${frozen ? '' : 'animate-fade-in'}`} />
      <div
        className={`pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_40px_rgba(218,41,28,0.7)] ${frozen ? '' : 'animate-vignette'}`}
      />
      <StatusBar tone="light" />

      {/* Warning banner */}
      <div className={`absolute inset-x-0 top-[70px] ${frozen ? '' : 'animate-banner-drop'}`} role="alert">
        <div
          className={`h-2.5 ${frozen ? '' : 'animate-hazard'}`}
          style={{
            background: 'repeating-linear-gradient(-45deg,#DA291C 0 10px,#1A0F08 10px 20px)',
            backgroundSize: '28px 100%',
          }}
        />
        <div className="flex flex-col items-center bg-[#DA291C] py-2.5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
          <p className="flex items-center gap-2 font-fantasy text-[24px] font-black tracking-[0.08em]">
            <TriangleAlert size={24} strokeWidth={2.8} />
            DELAY DETECTED
          </p>
          <p className="font-fantasy text-[14px] font-bold tracking-[0.06em] text-[#FFE9D6]">
            {LINE.name} · {LINE.delay}
          </p>
        </div>
        <div
          className={`h-2.5 ${frozen ? '' : 'animate-hazard'}`}
          style={{
            background: 'repeating-linear-gradient(-45deg,#DA291C 0 10px,#1A0F08 10px 20px)',
            backgroundSize: '28px 100%',
          }}
        />
      </div>

      {/* Boss slides in */}
      <div
        className={`absolute inset-x-0 top-[180px] flex flex-col items-center px-6 ${frozen ? '' : 'animate-slide-in-right [animation-delay:350ms]'}`}
      >
        <div className="relative">
          <div className="absolute inset-0 -z-0 scale-125 rounded-full bg-[radial-gradient(circle,rgba(218,41,28,0.55),transparent_65%)]" />
          <div className="relative">
            <BossArt mood="idle" frozen={frozen} size={190} />
          </div>
        </div>
        <h2
          className="mt-1 max-w-[320px] text-center font-fantasy text-[24px] font-black leading-[1.1] tracking-[0.02em] [text-shadow:0_2px_0_#000]"
          style={{ color: GOLD_LIGHT }}
        >
          {boss.name}
        </h2>
        <div className="relative mt-3 w-full max-w-[320px] rounded-[16px] px-4 py-3 tex-parchment shadow-[inset_0_0_0_2px_#C99A3B,0_8px_18px_rgba(0,0,0,0.5)]">
          <span
            className="absolute -top-[7px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 tex-parchment shadow-[inset_1.5px_1.5px_0_#C99A3B]"
            aria-hidden
          />
          <OrnateCorners inset={4} />
          <p className="relative text-center font-fell text-[22px] italic leading-snug text-[#2B1D10]">{boss.taunt}</p>
        </div>
      </div>

      {/* Actions in thumb zone */}
      <div
        className={`absolute inset-x-4 bottom-[34px] flex flex-col gap-2.5 ${frozen ? '' : 'animate-fade-in [animation-delay:800ms]'}`}
      >
        <p className="flex items-center justify-center gap-1.5 text-[13.5px] font-semibold text-[#F3E3BF]">
          <TrainFront size={16} strokeWidth={2.4} /> Beat it before your train arrives
        </p>
        <button
          type="button"
          onClick={onFight}
          className="flex h-16 items-center justify-center gap-2.5 rounded-[18px] border-2 font-fantasy text-[24px] font-black tracking-[0.08em] text-white shadow-[0_5px_0_#6E120B,0_10px_20px_rgba(0,0,0,0.5)] transition-transform active:translate-y-[4px] active:shadow-[0_1px_0_#6E120B]"
          style={{ borderColor: GOLD_LIGHT, background: 'linear-gradient(180deg,#EC4A36 0%,#DA291C 45%,#B71F14 100%)' }}
        >
          <Swords size={24} strokeWidth={2.6} />
          FIGHT!
        </button>
        <button
          type="button"
          onClick={onExit}
          className="h-11 font-fantasy text-[14px] font-bold text-[#E8D3A4] underline-offset-4 hover:underline"
        >
          Sit this one out
        </button>
      </div>
    </div>
  )
}
