'use client'

// Two Lies and a Truth: a quick pixel trivia game. Each round shows three statements about the
// station. Two are lies; tap the one that is true before the timer runs out. Faster answers
// earn more gold. Three rounds, then the station's fact card unlocks.

import { useEffect, useRef, useState } from 'react'
import { Check, Map as MapIcon, RotateCcw, Timer, X } from 'lucide-react'
import { LINES, type Station } from './stations'
import { LANDMARKS, STATION } from './pixelSprites'
import { Coin } from './fantasy'
import { LANDMARK_INFO } from './landmarks'
import type { GameResult } from './GameFrame'
import { PixelSprite, rng, shuffle } from './MatchGame'
import { NUM, PANEL, PixelScreen } from './pixel'
import { TRUTH_ROUNDS } from './truths'
import { StatusBar } from './ui'

export const TRUTH_GAME = { title: 'Two Lies and a Truth', genre: 'Trivia', time: '~1 min' }

const ROUND_SECONDS = 20
/** Gold for a right answer: a base amount plus one per second left. Max 240 over 3 rounds. */
const goldFor = (secondsLeft: number) => 60 + secondsLeft

type Phase = 'ask' | 'reveal' | 'done'
type Statement = { text: string; truth: boolean }

export function TruthGame({
  station,
  seed,
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
  const line = LINES[station.lines[0]]
  const [rounds] = useState(() => {
    const rand = rng(`${station.id}:${seed}`)
    return (TRUTH_ROUNDS[station.id] ?? []).map((r) => ({
      topic: r.topic,
      statements: shuffle<Statement>([{ text: r.truth, truth: true }, ...r.lies.map((text) => ({ text, truth: false }))], rand),
    }))
  })
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState<Phase>('ask')
  const [picked, setPicked] = useState<number | null>(null) // null on reveal = time ran out
  const [left, setLeft] = useState(ROUND_SECONDS)
  const [right, setRight] = useState(0)
  const [gold, setGold] = useState(0)
  const [lastGold, setLastGold] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const finished = useRef(false)

  const R = rounds[round]
  const isLast = round === rounds.length - 1

  // Round timer
  useEffect(() => {
    if (phase !== 'ask') return
    const t = window.setTimeout(() => {
      setSeconds((n) => n + 1)
      if (left > 1) return setLeft(left - 1)
      setLeft(0)
      setPicked(null)
      setLastGold(0)
      setPhase('reveal')
    }, 1000)
    return () => window.clearTimeout(t)
  }, [phase, left])

  const choose = (i: number) => {
    if (phase !== 'ask') return
    setPicked(i)
    setPhase('reveal')
    if (R.statements[i].truth) {
      const g = goldFor(left)
      setRight((n) => n + 1)
      setGold((n) => n + g)
      setLastGold(g)
    } else {
      setLastGold(0)
    }
  }

  const next = () => {
    if (!isLast) {
      setRound(round + 1)
      setPicked(null)
      setLeft(ROUND_SECONDS)
      setPhase('ask')
      return
    }
    if (finished.current) return
    finished.current = true
    onFinish({ correctCount: right, rounds: rounds.length, points: gold, score: gold, secondsUsed: seconds })
    setPhase('done')
  }

  if (!R) return null
  const gotIt = picked !== null && R.statements[picked].truth
  const info = LANDMARK_INFO[station.id]

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
          <p className="truncate font-pixel text-[12px] leading-none text-muted">{station.name}</p>
          <h1 className="truncate font-pixel text-[19px] font-bold leading-tight">Two Lies and a Truth</h1>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink font-pixel text-[15px] font-bold text-white" style={{ backgroundColor: line.color }} aria-hidden>
          ?
        </span>
      </header>

      {/* Stats */}
      <div className="absolute inset-x-4 top-[126px] z-10 flex gap-2 font-pixel text-[15px] font-bold">
        <span className="flex h-9 flex-1 items-center justify-center gap-1.5 border-2 border-ink bg-[#FBF3DF] shadow-[3px_3px_0_rgba(27,31,36,0.85)]">
          Round <span className={NUM}>{round + 1}/{rounds.length}</span>
        </span>
        <span className="flex h-9 flex-1 items-center justify-center gap-1.5 border-2 border-ink bg-[#FBF3DF] shadow-[3px_3px_0_rgba(27,31,36,0.85)]">
          <Coin size={17} />
          <span className={NUM}>{gold}</span>
        </span>
        <span
          className="flex h-9 flex-1 items-center justify-center gap-1.5 border-2 border-ink shadow-[3px_3px_0_rgba(27,31,36,0.85)]"
          style={{ backgroundColor: phase === 'ask' && left <= 5 ? '#F6B3AA' : '#FBF3DF' }}
        >
          <Timer size={15} strokeWidth={2.8} />
          <span className={NUM}>{left}s</span>
        </span>
      </div>

      {/* Time bar */}
      <div className="absolute inset-x-4 top-[172px] h-3 border-2 border-ink bg-[#222C37]" aria-hidden>
        <div
          className="h-full transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
          style={{ width: `${(left / ROUND_SECONDS) * 100}%`, backgroundColor: left <= 5 ? '#DA291C' : line.color }}
        />
      </div>

      {/* Topic: the landmark photo (or its pixel icon) */}
      <div key={round} className={`absolute inset-x-4 top-[198px] flex animate-pop items-center gap-3 p-2 ${PANEL}`}>
        {info ? (
          // eslint-disable-next-line @next/next/no-img-element -- small local photos, no optimizer needed
          <img src={info.photo.src} alt={info.name} className="h-[76px] w-[104px] shrink-0 border-2 border-ink object-cover" />
        ) : (
          <span className="flex h-[76px] w-[104px] shrink-0 items-end justify-center border-2 border-ink bg-[#CFE7F5] pb-1">
            <PixelSprite sprite={LANDMARKS[station.id] ?? STATION} scale={3} extra={{ R: line.color, r: line.dark }} />
          </span>
        )}
        <div className="min-w-0">
          <p className="font-pixel text-[11px] font-bold tracking-[0.08em] text-muted">ROUND {round + 1}</p>
          <p className="font-pixel text-[19px] font-bold leading-tight">{R.topic}</p>
          {info && <p className="mt-0.5 truncate text-[9.5px] text-muted">{info.photo.credit}</p>}
        </div>
      </div>

      {/* Prompt */}
      <p className="absolute inset-x-4 top-[302px] text-center font-pixel text-[15px] font-bold text-[#FBF3DF]">
        {phase === 'ask' ? (
          <>
            Two are lies. Tap the <span className="text-[#7CD992]">TRUTH</span>!
          </>
        ) : gotIt ? (
          <span className="text-[#7CD992]">You found the truth!</span>
        ) : picked === null ? (
          <span className="text-[#F2B233]">Time&apos;s up!</span>
        ) : (
          <span className="text-[#FF8A7A]">That one is a lie!</span>
        )}
      </p>

      {/* Statements */}
      <ul className="absolute inset-x-4 top-[336px] flex flex-col gap-3">
        {R.statements.map((s, i) => {
          const shown = phase === 'reveal'
          const bg = !shown ? '#FBF3DF' : s.truth ? '#BDEBC6' : i === picked ? '#F6B3AA' : '#D9D1BE'
          return (
            <li key={`${round}-${i}`}>
              <button
                type="button"
                onClick={() => choose(i)}
                disabled={phase !== 'ask'}
                aria-label={`${'ABC'[i]}: ${s.text}${shown ? (s.truth ? ' (truth)' : ' (lie)') : ''}`}
                className={`relative flex min-h-[78px] w-full items-center gap-3 border-[3px] border-ink px-3 py-2.5 text-left shadow-[4px_4px_0_rgba(15,19,24,0.7)] transition-colors enabled:active:translate-x-[2px] enabled:active:translate-y-[2px] enabled:active:shadow-none ${
                  shown && i === picked && !s.truth ? 'animate-shake' : ''
                }`}
                style={{ backgroundColor: bg, opacity: shown && !s.truth && i !== picked ? 0.75 : 1 }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink font-pixel text-[17px] font-bold text-white"
                  style={{ backgroundColor: shown ? (s.truth ? '#2F7A4A' : '#8C3A30') : line.color }}
                >
                  {shown ? s.truth ? <Check size={18} strokeWidth={3.5} /> : <X size={18} strokeWidth={3.5} /> : 'ABC'[i]}
                </span>
                <span className="text-[15px] font-semibold leading-snug text-ink">{s.text}</span>
                {shown && (
                  <span
                    className="absolute -right-1.5 -top-3 rotate-6 border-2 border-ink px-1.5 font-pixel text-[11px] font-bold leading-[18px] text-white"
                    style={{ backgroundColor: s.truth ? '#2F7A4A' : '#8C3A30' }}
                  >
                    {s.truth ? 'TRUTH' : 'LIE'}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {/* After answering: gold earned and Next */}
      {phase === 'reveal' && (
        <div className="absolute inset-x-4 top-[640px] flex animate-pop items-center gap-3">
          <span className="flex h-12 flex-1 items-center justify-center gap-2 border-2 border-ink bg-[#FFE7A3]">
            <Coin size={20} />
            <span className={`text-[20px] text-[#7A4D0E] ${NUM}`}>+{lastGold}</span>
          </span>
          <button
            type="button"
            onClick={next}
            autoFocus
            className="flex h-12 flex-[1.4] items-center justify-center border-[3px] border-ink font-pixel text-[17px] font-bold text-white shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            style={{ backgroundColor: line.color }}
          >
            {isLast ? 'See results' : 'Next round'}
          </button>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {phase === 'reveal'
          ? `${gotIt ? 'Correct.' : picked === null ? "Time's up." : 'That was a lie.'} The truth: ${R.statements.find((s) => s.truth)?.text}`
          : ''}
      </p>

      {phase === 'done' && (
        <Results station={station} right={right} total={rounds.length} gold={gold} seconds={seconds} onPlayAgain={onPlayAgain} onMap={onMap} />
      )}
    </PixelScreen>
  )
}

function Results({
  station,
  right,
  total,
  gold,
  seconds,
  onPlayAgain,
  onMap,
}: {
  station: Station
  right: number
  total: number
  gold: number
  seconds: number
  onPlayAgain: () => void
  onMap: () => void
}) {
  const line = LINES[station.lines[0]]
  const info = LANDMARK_INFO[station.id]
  const verdict = right === total ? 'Lie detector!' : right >= total - 1 ? 'Sharp mind!' : right > 0 ? 'Not fooled twice!' : 'Totally tricked!'
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  return (
    <div className="absolute inset-0 z-30 flex animate-fade-in items-center justify-center bg-[#0F1318]/70 px-5">
      <div role="dialog" aria-modal="true" aria-labelledby="truth-done" className={`w-full animate-pop p-4 ${PANEL}`}>
        {info ? (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element -- small local photos, no optimizer needed */}
            <img src={info.photo.src} alt={info.name} className="h-[120px] w-full border-[3px] border-ink object-cover" />
            <figcaption className="mt-0.5 truncate text-right text-[9.5px] text-muted">{info.photo.credit}</figcaption>
          </figure>
        ) : (
          <div className="flex justify-center">
            <PixelSprite sprite={LANDMARKS[station.id] ?? STATION} scale={5} extra={{ R: line.color, r: line.dark }} />
          </div>
        )}
        <h2 id="truth-done" className="mt-3 text-center font-pixel text-[28px] font-bold leading-none">
          {verdict}
        </h2>
        <p className="mt-1.5 text-center text-[14px] font-semibold text-muted">
          <span className={NUM}>
            {right}/{total}
          </span>{' '}
          truths found · <span className={NUM}>{time}</span>
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 border-2 border-ink bg-[#FFE7A3] py-2">
          <Coin size={24} />
          <span className={`text-[24px] text-[#7A4D0E] ${NUM}`}>+{gold}</span>
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
            className="flex h-12 flex-1 items-center justify-center gap-1.5 border-[3px] border-ink bg-[#F1E7CF] font-pixel text-[16px] font-bold shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <RotateCcw size={17} strokeWidth={2.8} />
            Play again
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
