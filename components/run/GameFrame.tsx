'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  Captions,
  Check,
  Map as MapIcon,
  Pause,
  Play,
  RotateCcw,
  ScrollText,
  Skull,
  Sprout,
  Search,
  Volume2,
} from 'lucide-react'
import { HARVARD_PHOTOS, type Photo } from './harvardPhotos'
import { StatusBar } from './ui'
import {
  Coin,
  GOLD,
  GOLD_LIGHT,
  Gem,
  Hourglass,
  LifeBloom,
  LifeBurst,
  OrnateCorners,
  Poison,
  Ribbon,
  Twinkle,
} from './fantasy'

export type GameResult = {
  correctCount: number
  rounds: number
  points: number
  score: number
  secondsUsed: number
}

export type GamePreview = 'choosing' | 'correct' | 'wrong' | 'timeout' | 'paused'

const ROUND_MS = 30_000
const MAX_MULTIPLIER = 3

type Round = {
  topic: string
  photo: Photo
  truth: string
  statements: { key: string; text: string; lie: boolean }[]
}

const ROUNDS: Round[] = [
  {
    topic: 'The Statue',
    photo: HARVARD_PHOTOS.statue,
    truth: 'Harvard was founded in 1636.',
    statements: [
      { key: 'A', text: 'The statue was made in 1884.', lie: false },
      { key: 'B', text: 'Harvard was founded in 1638.', lie: true },
      { key: 'C', text: "The man in the statue isn't really John Harvard.", lie: false },
    ],
  },
  {
    topic: 'The Man',
    photo: HARVARD_PHOTOS.widener,
    truth: 'He was a donor. Henry Dunster was the first president.',
    statements: [
      { key: 'A', text: "John Harvard was the college's first president.", lie: true },
      { key: 'B', text: 'He left the college his library and half his estate.', lie: false },
      { key: 'C', text: 'He died of tuberculosis in 1638.', lie: false },
    ],
  },
  {
    topic: 'The Yard',
    photo: HARVARD_PHOTOS.memorialHall,
    truth: 'It first stood by Memorial Hall and moved in 1924.',
    statements: [
      { key: 'A', text: "Visitors rub the statue's left shoe for luck.", lie: false },
      { key: 'B', text: 'It was sculpted by Daniel Chester French.', lie: false },
      { key: 'C', text: 'It has always stood in front of University Hall.', lie: true },
    ],
  },
]

const SFX = {
  taunt: '[Wind rustles through the old Yard.]',
  beaten: '[Vines unfurl with a warm, rising hum.]',
  laugh: '[Poison hisses and bubbles.]',
  smug: '[The last grains of sand fall. Silence.]',
}

/** Starting state for the static "state frames" view (Round 2, after a won Round 1). */
function previewInit(p?: GamePreview) {
  if (!p)
    return {
      round: 0,
      left: ROUND_MS,
      picked: null,
      paused: false,
      score: 0,
      gained: 0,
      combo: 0,
      correct: 0,
    }
  const base = {
    round: 1,
    score: 520,
    gained: 0,
    combo: 1,
    correct: 1,
    paused: false,
    picked: null as number | null,
  }
  switch (p) {
    case 'choosing':
      return { ...base, left: 21_000 }
    case 'correct':
      return { ...base, left: 17_000, picked: 0, gained: 540, score: 1060, combo: 2, correct: 2 }
    case 'wrong':
      return { ...base, left: 15_000, picked: 1, combo: 0 }
    case 'timeout':
      return { ...base, left: 0, combo: 0 }
    case 'paused':
      return { ...base, left: 19_000, paused: true }
  }
}

export function GameFrame({
  onFinish,
  onQuit,
  preview,
}: {
  onFinish: (r: GameResult) => void
  onQuit: () => void
  preview?: GamePreview
}) {
  const [init] = useState(() => previewInit(preview))
  const [round, setRound] = useState(init.round)
  const [left, setLeft] = useState(init.left)
  const [paused, setPaused] = useState(init.paused)
  const [bookOpening, setBookOpening] = useState(false)
  const [picked, setPicked] = useState<number | null>(init.picked)
  const [captions, setCaptions] = useState(false) // captions are opt-in via the CC button
  const [score, setScore] = useState(init.score)
  const [gained, setGained] = useState(init.gained)
  const [combo, setCombo] = useState(init.combo)
  const [correctCount, setCorrectCount] = useState(init.correct)
  const [usedMs, setUsedMs] = useState(0)

  const R = ROUNDS[round]
  const STATEMENTS = R.statements
  const isLast = round === ROUNDS.length - 1
  const multiplier = Math.min(combo + 1, MAX_MULTIPLIER) as 1 | 2 | 3

  const timedOut = left <= 0 && picked === null
  const revealed = picked !== null || timedOut
  const running = !preview && !paused && !revealed

  // Mirror of `left` for the timer tick, so the tick can react to hitting zero.
  const leftRef = useRef(left)
  useEffect(() => {
    leftRef.current = left
  })

  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => {
      const next = Math.max(0, leftRef.current - 100)
      leftRef.current = next
      setLeft(next)
      if (next === 0) {
        // Time-outs break the combo and count the full round time.
        window.clearInterval(t)
        setGained(0)
        setCombo(0)
        setUsedMs((u) => u + ROUND_MS)
      }
    }, 100)
    return () => window.clearInterval(t)
  }, [running])

  const secs = Math.ceil(left / 1000)
  const low = secs <= 10
  const correct = picked !== null && STATEMENTS[picked].lie
  const mood: 'taunt' | 'beaten' | 'laugh' | 'smug' = !revealed
    ? 'taunt'
    : correct
      ? 'beaten'
      : timedOut
        ? 'smug'
        : 'laugh'
  const sfx = SFX[mood]

  const pick = (i: number) => {
    if (revealed || paused || preview) return
    setPicked(i)
    setUsedMs((u) => u + (ROUND_MS - left))
    if (STATEMENTS[i].lie) {
      const pts = (100 + secs * 10) * multiplier
      setGained(pts)
      setScore((s) => s + pts)
      setCombo((c) => c + 1)
      setCorrectCount((c) => c + 1)
    } else {
      setGained(0)
      setCombo(0)
    }
  }

  const startRound = (n: number) => {
    setRound(n)
    setLeft(ROUND_MS)
    setPicked(null)
    setGained(0)
    setPaused(false)
    setBookOpening(false)
  }

  const restart = () => {
    setScore(0)
    setCombo(0)
    setCorrectCount(0)
    setUsedMs(0)
    startRound(0)
  }

  const resume = () => {
    setBookOpening(true)
    window.setTimeout(() => {
      setPaused(false)
      setBookOpening(false)
    }, 380)
  }

  const advance = () => {
    if (preview) return
    if (!isLast) return startRound(round + 1)
    onFinish({
      correctCount,
      rounds: ROUNDS.length,
      points: score,
      score,
      secondsUsed: Math.round(usedMs / 1000),
    })
  }

  return (
    <div className="absolute inset-0 animate-screen-in overflow-hidden tex-leather">
      <StatusBar tone="light" />

      <div className="absolute inset-0 flex flex-col gap-2.5 px-4 pb-[34px] pt-[54px]">
        {/* Top bar: pause · round ribbon · captions · gold */}
        <div className="flex h-12 shrink-0 items-center gap-2">
          <WoodButton onClick={() => setPaused(true)} disabled={revealed} label="Pause game">
            <Pause size={20} strokeWidth={2.6} className="fill-current" />
          </WoodButton>
          <div className="flex min-w-0 flex-1 justify-center">
            <Ribbon>
              Round {round + 1} of {ROUNDS.length}
            </Ribbon>
          </div>
          <WoodButton
            onClick={() => setCaptions((c) => !c)}
            pressed={captions}
            label={
              captions ? 'Sound off, captions on. Tap to turn sound on' : 'Sound on. Tap to mute and show captions'
            }
          >
            {captions ? <Captions size={21} strokeWidth={2.3} /> : <Volume2 size={21} strokeWidth={2.3} />}
          </WoodButton>
          <div
            className="relative flex h-12 shrink-0 items-center gap-1.5 rounded-full border-2 bg-[#160D07]/85 pl-1.5 pr-3 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]"
            style={{ borderColor: GOLD }}
            aria-label={`${score} gold`}
          >
            <span className="relative flex w-[30px]" aria-hidden>
              <Coin size={22} className="absolute -top-[13px] left-0" />
              <Coin size={22} className="absolute -top-[8px] left-[8px]" />
            </span>
            <span
              className="min-w-[3ch] font-fantasy text-[18px] font-extrabold tabular-nums"
              style={{ color: GOLD_LIGHT }}
            >
              {score.toLocaleString()}
            </span>
            {revealed && gained > 0 && (
              <span
                key={`g-${round}`}
                className={`absolute -top-5 right-2 ${preview ? '' : 'animate-rise'} font-fantasy text-[15px] font-black text-[#FFE08A] [text-shadow:0_1px_3px_#000]`}
              >
                +{gained}
              </span>
            )}
          </div>
        </div>

        {/* Hourglass timer + streak gem */}
        <div className="flex h-11 shrink-0 items-center gap-2.5">
          <Hourglass f={left / ROUND_MS} running={running} low={low} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between font-fantasy font-bold">
              <span className={`text-[11px] tracking-[0.08em] ${low ? 'text-[#FF9A8A]' : 'text-[#E8D3A4]'}`}>
                {left <= 0 ? 'SANDS RAN DRY' : low ? 'HURRY, TRAVELER!' : 'SANDS OF TIME'}
              </span>
              <span className={`text-[17px] tabular-nums ${low ? 'text-[#FF9A8A]' : 'text-[#FFF1D0]'}`}>
                0:{String(secs).padStart(2, '0')}
              </span>
            </div>
            <div
              className="mt-1 h-2.5 overflow-hidden rounded-full bg-[#120B06] ring-1 ring-[#C99A3B]/80"
              role="progressbar"
              aria-label="Time remaining"
              aria-valuemin={0}
              aria-valuemax={ROUND_MS / 1000}
              aria-valuenow={secs}
            >
              <div
                className="h-full rounded-full transition-[width] duration-100 ease-linear"
                style={{
                  width: `${(left / ROUND_MS) * 100}%`,
                  background: low ? 'linear-gradient(90deg,#B71F14,#FF6B57)' : 'linear-gradient(90deg,#C88A22,#F6D47E)',
                }}
              />
            </div>
          </div>
          <div
            className="flex h-11 shrink-0 items-center gap-1 rounded-full border-2 bg-[#160D07]/85 pl-1.5 pr-3"
            style={{ borderColor: multiplier > 1 ? GOLD_LIGHT : '#6B5434' }}
            aria-label={`Streak multiplier times ${multiplier}`}
          >
            <Gem level={multiplier} />
            <span className="flex flex-col leading-none">
              <span className="font-fantasy text-[17px] font-black text-[#FFF1D0]">×{multiplier}</span>
              <span className="text-[8.5px] font-bold tracking-[0.14em] text-[#E8D3A4]">STREAK</span>
            </span>
          </div>
        </div>

        {/* Round scene */}
        <section
          className="relative min-h-[236px] flex-1 overflow-hidden rounded-[22px] border-2 shadow-[0_10px_24px_rgba(0,0,0,0.5),inset_0_0_0_3px_rgba(0,0,0,0.5)]"
          style={{ borderColor: GOLD }}
        >
          {ROUNDS.map((r, i) => (
            <img
              key={r.topic}
              src={r.photo.src}
              alt={i === round ? r.photo.alt : ''}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === round ? 'opacity-100' : 'opacity-0'}`}
              style={{
                objectPosition: r.photo.position,
                filter: 'sepia(0.3) brightness(0.8) saturate(1.05)',
              }}
            />
          ))}
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(20,10,4,0.9),rgba(20,10,4,0.05)_50%)]" />
          {[
            [86, 24, 10, 0],
            [300, 150, 8, 600],
            [20, 170, 9, 1200],
            [128, 120, 7, 300],
          ].map(([x, y, s, d], i) => (
            <Twinkle
              key={i}
              size={s}
              className="absolute animate-twinkle text-[#BFF5EA]"
              style={{ left: x, top: y, animationDelay: `${d}ms` }}
            />
          ))}
          <OrnateCorners inset={5} />
          <span className="absolute bottom-6 right-2 rotate-180 text-[9px] font-medium text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)] [writing-mode:vertical-rl]">
            {R.photo.credit.replace(' / Wikimedia Commons', '')}
          </span>

          {/* Sound-effect captions (only when the player turns CC on) */}
          {captions && (
            <p
              key={sfx}
              className="absolute left-4 right-14 top-4 flex animate-fade-in items-start gap-1.5 rounded-xl bg-[#120B06]/85 px-2.5 py-2 text-[12.5px] font-medium leading-snug text-[#F3E3BF] ring-1 ring-[#C99A3B]/60"
              aria-live="polite"
            >
              <span className="mt-px shrink-0 rounded bg-[#F6D47E] px-1 text-[9px] font-black text-[#2B1D10]">CC</span>
              <span className="italic">{sfx}</span>
            </p>
          )}

          {/* Prompt */}
          <div className="absolute inset-x-4 bottom-3.5">
            <h2
              className="font-fantasy text-[30px] font-black leading-none tracking-[0.02em] [text-shadow:0_2px_0_#3A2108,0_0_18px_rgba(246,212,126,0.35)]"
              style={{ color: GOLD_LIGHT }}
            >
              Find the Lie
            </h2>
            <p className="mt-1 text-[13.5px] font-medium text-[#F3E3BF]">
              <span className="font-bold text-white">{R.topic}</span> · Two are true, one is a trick.
            </p>
          </div>
        </section>

        {/* Quest scrolls — bottom half for thumb reach */}
        <div className="flex shrink-0 flex-col gap-2.5">
          {STATEMENTS.map((s, i) => {
            const state: CardState = !revealed
              ? 'idle'
              : s.lie && picked === i
                ? 'correct'
                : s.lie
                  ? 'missedLie'
                  : picked === i
                    ? 'wrong'
                    : 'truth'
            return (
              <ScrollCard
                key={`${round}-${s.key}`}
                letter={s.key}
                text={s.text}
                truth={R.truth}
                state={state}
                gained={gained}
                disabled={revealed}
                frozen={!!preview}
                onClick={() => pick(i)}
              />
            )
          })}
        </div>

        {/* Bottom action */}
        <div className="h-[58px] shrink-0">
          {revealed ? (
            <button
              type="button"
              key={`next-${round}`}
              onClick={advance}
              className="flex h-[58px] w-full animate-pop items-center justify-between rounded-[18px] border-2 px-5 text-white shadow-[0_5px_0_#6E120B,0_10px_20px_rgba(0,0,0,0.45)] transition-transform active:translate-y-[4px] active:shadow-[0_1px_0_#6E120B]"
              style={{
                borderColor: GOLD_LIGHT,
                background: 'linear-gradient(180deg,#EC4A36 0%,#DA291C 45%,#B71F14 100%)',
              }}
            >
              <span className="flex items-center gap-1.5 text-[14px] font-semibold text-[#FFE9D6]">
                {correct ? (
                  <>
                    <Coin size={18} /> +{gained} gold
                  </>
                ) : timedOut ? (
                  'Out of time'
                ) : (
                  'No gold this round'
                )}
              </span>
              <span className="flex items-center gap-2 font-fantasy text-[18px] font-black tracking-[0.04em]">
                {isLast ? 'See Results' : 'Next Round'}
                <ArrowRight size={20} strokeWidth={3} />
              </span>
            </button>
          ) : (
            <p className="flex h-full items-center justify-center gap-2 font-fantasy text-[14px] font-bold tracking-[0.06em] text-[#E8D3A4]">
              <Twinkle size={10} className="text-[#F6D47E]" />
              Tap a scroll to choose
              <Twinkle size={10} className="text-[#F6D47E]" />
            </p>
          )}
        </div>
      </div>

      {paused && (
        <BookPause
          opening={bookOpening}
          secs={secs}
          onResume={resume}
          onRestart={restart}
          onQuit={onQuit}
          interactive={!preview}
        />
      )}
    </div>
  )
}

export function WoodButton({
  children,
  onClick,
  label,
  pressed,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  label: string
  pressed?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 shadow-[0_3px_0_#0E0804,0_6px_10px_rgba(0,0,0,0.4)] transition-transform active:translate-y-[2px] active:shadow-[0_1px_0_#0E0804] disabled:opacity-40"
      style={{
        borderColor: pressed ? GOLD_LIGHT : GOLD,
        color: GOLD_LIGHT,
        background: pressed
          ? 'radial-gradient(circle at 35% 30%, #8E2A1C, #4A120B)'
          : 'radial-gradient(circle at 35% 30%, #5E3E25, #24160C)',
      }}
    >
      {children}
    </button>
  )
}

type CardState = 'idle' | 'correct' | 'wrong' | 'missedLie' | 'truth'

function ScrollCard({
  letter,
  text,
  truth,
  state,
  gained,
  disabled,
  frozen,
  onClick,
}: {
  letter: string
  text: string
  truth: string
  state: CardState
  gained: number
  disabled: boolean
  frozen?: boolean
  onClick: () => void
}) {
  const ring =
    state === 'correct'
      ? '0 5px 0 #2F5A1E, 0 10px 18px rgba(0,0,0,0.45)'
      : state === 'missedLie'
        ? '0 0 0 3px #F6D47E, 0 5px 0 #5E3D14, 0 10px 18px rgba(0,0,0,0.45)'
        : state === 'wrong'
          ? '0 0 0 3px #7BD13A, 0 0 22px rgba(123,209,58,0.55), 0 2px 0 #2A0E36'
          : state === 'idle'
            ? '0 5px 0 #5E3D14, 0 10px 18px rgba(0,0,0,0.45)'
            : '0 2px 0 #5E3D14, 0 6px 12px rgba(0,0,0,0.35)'

  const seal =
    state === 'correct'
      ? {
          bg: 'radial-gradient(circle at 35% 30%, #B6F27A, #3E9B3A 55%, #1F5A18)',
          fg: '#F2FFE6',
          icon: <Sprout size={22} strokeWidth={2.8} />,
        }
      : state === 'wrong'
        ? {
            bg: 'radial-gradient(circle at 35% 30%, #9A4FBF, #4A1D5C 60%, #2A0E36)',
            fg: '#C8F59A',
            icon: <Skull size={21} strokeWidth={2.6} />,
          }
        : state === 'missedLie'
          ? {
              bg: 'radial-gradient(circle at 35% 30%, #F0503F, #DA291C 50%, #8E1710)',
              fg: '#FFF1D0',
              icon: <Search size={19} strokeWidth={3.2} />,
            }
          : state === 'truth'
            ? {
                bg: 'radial-gradient(circle at 35% 30%, #A8875A, #6B5032)',
                fg: '#FFF1D0',
                icon: <Check size={19} strokeWidth={3.2} />,
              }
            : {
                bg: 'radial-gradient(circle at 35% 30%, #F0503F, #DA291C 50%, #8E1710)',
                fg: '#FFE9C2',
                icon: <span className="font-fantasy text-[20px] font-black">{letter}</span>,
              }

  const badge =
    state === 'correct' ? (
      <Badge className="bg-[#2F7A32] text-white">The lie! +{gained}</Badge>
    ) : state === 'wrong' ? (
      <Badge className="bg-[#4A1D5C] text-[#D9F7A0]">Poisoned!</Badge>
    ) : state === 'missedLie' ? (
      <Badge className="bg-[#2B1D10] text-[#F6D47E]">The trick</Badge>
    ) : state === 'truth' ? (
      <Badge className="bg-[#E3D2AC] text-[#3A2A16]">True</Badge>
    ) : null

  const showTruth = state === 'correct' || state === 'missedLie'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative w-full rounded-[16px] text-left transition-[transform,box-shadow,opacity] duration-150 enabled:active:translate-y-[4px] ${
        state === 'wrong' ? 'animate-shake' : ''
      } ${state === 'truth' ? 'opacity-80' : ''} ${state === 'correct' ? 'animate-pop' : ''}`}
      style={{ boxShadow: ring }}
    >
      <span className="absolute inset-0 rounded-[16px] tex-parchment shadow-[inset_0_0_0_2px_#C99A3B,inset_0_0_0_4px_#F4E7C9,inset_0_0_0_5px_rgba(150,105,40,0.55)]" />
      <OrnateCorners inset={4} />
      {state === 'wrong' && <Poison />}
      {state === 'correct' && (
        <>
          <LifeBloom />
          <LifeBurst frozen={frozen} />
        </>
      )}
      <span className="relative flex min-h-[80px] items-center gap-3 py-3 pl-4 pr-3.5">
        <span
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full shadow-[0_2px_3px_rgba(0,0,0,0.35),inset_0_-2px_3px_rgba(0,0,0,0.3),inset_0_0_0_3px_rgba(0,0,0,0.12)]"
          style={{ background: seal.bg, color: seal.fg }}
        >
          {seal.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold leading-snug text-[#2B1D10]">{text}</span>
          {showTruth && (
            <span className="mt-1 flex items-start gap-1 text-[13px] font-medium leading-snug text-[#6B3A12]">
              <ScrollText size={14} strokeWidth={2.4} className="mt-[1px] shrink-0" />
              <span>
                <span className="font-bold">Truth:</span> {truth}
              </span>
            </span>
          )}
          {state === 'wrong' && (
            <span className="mt-1 flex items-center gap-1 text-[13px] font-bold leading-snug text-[#4A1D5C]">
              <Skull size={14} strokeWidth={2.6} className="shrink-0" />
              This one was true.
            </span>
          )}
        </span>
        {badge}
      </span>
    </button>
  )
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span
      className={`shrink-0 self-start whitespace-nowrap rounded-full px-2 py-0.5 font-fantasy text-[10.5px] font-black tracking-[0.03em] ${className}`}
    >
      {children}
    </span>
  )
}

/** Pause: two leather covers swing shut over the screen like a closing book. */
function BookPause({
  opening,
  secs,
  onResume,
  onRestart,
  onQuit,
  interactive,
}: {
  opening: boolean
  secs: number
  onResume: () => void
  onRestart: () => void
  onQuit: () => void
  interactive: boolean
}) {
  const cover = 'absolute inset-y-0 w-1/2 tex-leather [backface-visibility:hidden]'
  return (
    <div
      className="absolute inset-0 z-40 [perspective:1400px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paused-title"
    >
      <div className={`absolute inset-0 bg-black/50 ${opening ? 'animate-fade-out' : 'animate-fade-in'}`} />
      <div
        className={`${cover} left-0 origin-left border-r border-black/60 ${opening ? 'animate-book-open-left' : 'animate-book-left'}`}
        style={{
          boxShadow: `inset 0 0 0 10px #22150D, inset 0 0 0 12px ${GOLD}, inset -18px 0 30px rgba(0,0,0,0.5)`,
        }}
      />
      <div
        className={`${cover} right-0 origin-right border-l border-black/60 ${opening ? 'animate-book-open-right' : 'animate-book-right'}`}
        style={{
          boxShadow: `inset 0 0 0 10px #22150D, inset 0 0 0 12px ${GOLD}, inset 18px 0 30px rgba(0,0,0,0.5)`,
        }}
      />

      <div
        className={`absolute inset-0 flex flex-col items-center px-8 pb-[44px] pt-[70px] ${
          opening ? 'animate-fade-out' : 'animate-fade-in [animation-delay:420ms]'
        }`}
      >
        <OrnateCorners inset={18} />
        {/* Red Line bookmark ribbon */}
        <span
          className="absolute left-1/2 top-0 h-[120px] w-9 -translate-x-1/2 shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
          style={{
            background: 'linear-gradient(90deg,#B71F14,#DA291C 50%,#B71F14)',
            clipPath: 'polygon(0 0,100% 0,100% 100%,50% 84%,0 100%)',
          }}
          aria-hidden
        />
        <div
          className="mt-[96px] flex h-[92px] w-[92px] items-center justify-center rounded-full border-[3px] bg-[radial-gradient(circle_at_35%_30%,#4A2E1A,#1A0F08)] shadow-[0_0_30px_rgba(246,212,126,0.3)]"
          style={{ borderColor: GOLD_LIGHT }}
        >
          <Hourglass f={secs / 30} running={false} low={false} />
        </div>
        <h2
          id="paused-title"
          className="mt-5 font-fantasy text-[40px] font-black tracking-[0.06em] [text-shadow:0_2px_0_#000]"
          style={{ color: GOLD_LIGHT }}
        >
          Paused
        </h2>
        <p className="mt-1 text-center font-fell text-[19px] italic leading-snug text-[#F3E3BF]">
          The tale waits for you, traveler.
          <br />
          Hold fast to the pole.
        </p>
        <p
          className="mt-3 rounded-full border px-3 py-1 font-fantasy text-[12px] font-bold tracking-[0.08em] text-[#E8D3A4]"
          style={{ borderColor: '#6B5434' }}
        >
          SANDS HELD AT 0:{String(secs).padStart(2, '0')}
        </p>

        <div className="mt-auto flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            disabled={!interactive}
            className="flex h-16 items-center justify-center gap-2.5 rounded-[18px] border-2 font-fantasy text-[22px] font-black tracking-[0.05em] text-white shadow-[0_5px_0_#6E120B,0_10px_20px_rgba(0,0,0,0.5)] transition-transform active:translate-y-[4px] active:shadow-[0_1px_0_#6E120B]"
            style={{
              borderColor: GOLD_LIGHT,
              background: 'linear-gradient(180deg,#EC4A36 0%,#DA291C 45%,#B71F14 100%)',
            }}
          >
            <Play size={22} strokeWidth={3} className="fill-white" />
            Resume
          </button>
          <div className="flex gap-3">
            {[
              {
                label: 'Restart',
                icon: <RotateCcw size={18} strokeWidth={2.6} />,
                onClick: onRestart,
              },
              {
                label: 'Quit to Map',
                icon: <MapIcon size={18} strokeWidth={2.6} />,
                onClick: onQuit,
              },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={b.onClick}
                disabled={!interactive}
                className="relative flex h-14 flex-1 items-center justify-center gap-2 rounded-[16px] font-fantasy text-[15px] font-black text-[#2B1D10] shadow-[0_4px_0_#5E3D14,0_8px_14px_rgba(0,0,0,0.45)] transition-transform active:translate-y-[3px] active:shadow-[0_1px_0_#5E3D14]"
              >
                <span className="absolute inset-0 rounded-[16px] tex-parchment shadow-[inset_0_0_0_2px_#C99A3B]" />
                <span className="relative flex items-center gap-2">
                  {b.icon}
                  {b.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
