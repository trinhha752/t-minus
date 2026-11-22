'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, Check, Flame, Map as MapIcon, RotateCcw, Sparkles } from 'lucide-react'
import { HARVARD_GALLERY } from './harvardPhotos'
import { stationById, NEXT_STATION } from './stations'
import type { GameResult } from './GameFrame'
import { Coin } from './fantasy'
import { StatusBar } from './ui'

export function ResultsScreen({
  result,
  streak,
  gold,
  cardCount,
  onPlayAgain,
  onNext,
  onMap,
  nextId,
}: {
  result: GameResult
  streak: number
  gold: number
  cardCount: number
  onPlayAgain: () => void
  onNext: () => void
  onMap: () => void
  /** Where to ride next; defaults to the demo's next station. */
  nextId?: string | null
}) {
  const perfect = result.correctCount === result.rounds
  const next = stationById(nextId === undefined ? NEXT_STATION : (nextId ?? NEXT_STATION))
  const [photo, setPhoto] = useState(0)

  // Slowly cycle through Harvard photos on the fact card.
  useEffect(() => {
    const t = window.setInterval(() => setPhoto((p) => (p + 1) % HARVARD_GALLERY.length), 3500)
    return () => window.clearInterval(t)
  }, [photo])

  return (
    <div className="absolute inset-0 animate-screen-in overflow-hidden bg-parchment">
      <div
        className="absolute inset-x-0 top-0 h-[330px]"
        style={{
          background: perfect
            ? 'radial-gradient(circle at 50% 0%, #F05A3F 0%, transparent 60%), linear-gradient(180deg, #B4231A 0%, #8E1B13 100%)'
            : 'linear-gradient(180deg, #2E343C 0%, #1B1F24 100%)',
        }}
        aria-hidden
      >
        {perfect &&
          [
            [40, 90, 10],
            [350, 80, 14],
            [70, 200, 8],
            [330, 190, 10],
            [300, 120, 6],
            [100, 140, 6],
          ].map(([x, y, s], i) => (
            <Sparkles
              key={i}
              size={s * 2}
              className="absolute animate-pop fill-gold text-gold"
              style={{ left: x, top: y, animationDelay: `${i * 80}ms` }}
            />
          ))}
      </div>
      <StatusBar tone="light" />

      <div className="relative flex h-full flex-col px-4 pb-[40px] pt-[66px]">
        {/* Banner */}
        <div className="flex flex-col items-center text-center text-white">
          <h1 className="mt-1 animate-pop font-display text-[52px] font-extrabold leading-none tracking-[-0.03em] [animation-delay:120ms]">
            {perfect ? 'Perfect!' : 'Nice try'}
          </h1>
          <p className="mt-1.5 text-[15px] font-medium text-white/90">
            {perfect
              ? `You caught every lie in ${result.secondsUsed}s.`
              : result.correctCount > 0
                ? `You caught ${result.correctCount} of ${result.rounds} lies. The truth is yours anyway.`
                : 'The bronze scholar fooled you this time.'}
          </p>
        </div>

        {/* Stats */}
        <dl className="mt-4 grid grid-cols-3 gap-2">
          <Stat icon={<Coin size={15} />} label="Gold">
            +{result.points.toLocaleString()}
            <span className="block text-[11px] font-bold text-white/80">{gold.toLocaleString()} total</span>
          </Stat>
          <Stat icon={<Check size={15} strokeWidth={3} />} label="Lies">
            {result.correctCount}/{result.rounds}
            <span className="block text-[11px] font-bold text-white/80">{perfect ? '×3 combo' : 'caught'}</span>
          </Stat>
          <Stat icon={<Flame size={15} strokeWidth={2.6} className="fill-[#F59E0B] text-[#FDBA74]" />} label="Streak">
            {streak} days
            <span className="block text-[11px] font-bold text-white/80">Day saved</span>
          </Stat>
        </dl>

        {/* Fact card */}
        <article className="mt-4 flex min-h-0 flex-1 animate-pop flex-col overflow-hidden rounded-[26px] border-[3px] border-gold bg-white shadow-[0_14px_36px_rgba(27,31,36,0.25)] [animation-delay:200ms]">
          <div className="relative min-h-[132px] flex-1">
            <button
              type="button"
              onClick={() => setPhoto((p) => (p + 1) % HARVARD_GALLERY.length)}
              aria-label={`Photo ${photo + 1} of ${HARVARD_GALLERY.length}: ${HARVARD_GALLERY[photo].alt}. Tap for next photo`}
              className="absolute inset-0 overflow-hidden"
            >
              {HARVARD_GALLERY.map((ph, i) => (
                <img
                  key={ph.src}
                  src={ph.src}
                  alt=""
                  className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-1000 ease-out ${
                    i === photo ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
                  }`}
                  style={{ objectPosition: ph.position }}
                />
              ))}
              <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent" />
            </button>
            <span className="pointer-events-none absolute bottom-2.5 left-3 flex gap-1" aria-hidden>
              {HARVARD_GALLERY.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full bg-white transition-all ${i === photo ? 'w-4' : 'w-1.5 opacity-60'}`}
                />
              ))}
            </span>
            <span className="pointer-events-none absolute bottom-2 right-2.5 text-[9px] font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
              {HARVARD_GALLERY[photo].credit}
            </span>
            <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[12px] font-extrabold text-ink">
              <Sparkles size={13} strokeWidth={2.8} />
              New card
            </span>
          </div>
          <div className="shrink-0 p-4 pt-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-line-red-dark">
              The truth <span className="text-muted">· Scholars&apos; Realm No. 04</span>
            </p>
            <h2 className="mt-1 font-display text-[23px] font-extrabold leading-[1.1] tracking-[-0.01em]">
              Harvard was actually founded in 1636.
            </h2>
            <p className="mt-1.5 text-[14px] leading-snug text-muted">
              The 1884 statue reads “John Harvard, Founder, 1638.” Wrong year, he was a donor, not the founder, and a
              student posed in his place.
            </p>
            <p className="mt-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-line-green-dark">
              <Check size={15} strokeWidth={3} />
              Added to your collection · {cardCount} cards
            </p>
          </div>
        </article>

        {/* Actions */}
        <div className="mt-4 flex shrink-0 flex-col gap-2.5">
          <button
            type="button"
            onClick={onNext}
            className="flex h-14 items-center justify-between rounded-[20px] bg-line-red px-5 text-white shadow-[0_8px_20px_rgba(218,41,28,0.3)] active:scale-[0.98]"
          >
            <span className="font-display text-[19px] font-bold">Next station</span>
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-white/90">
              {next.name}
              <ArrowRight size={19} strokeWidth={2.8} />
            </span>
          </button>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onPlayAgain}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[18px] border border-[#E2DCCF] bg-white text-[15px] font-bold active:scale-[0.98]"
            >
              <RotateCcw size={17} strokeWidth={2.6} />
              Play again
            </button>
            <button
              type="button"
              onClick={onMap}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[18px] border border-[#E2DCCF] bg-white text-[15px] font-bold active:scale-[0.98]"
            >
              <MapIcon size={17} strokeWidth={2.6} />
              Back to map
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="rounded-[18px] bg-white/12 px-3 py-2.5 text-white ring-1 ring-white/20 backdrop-blur">
      <dt className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white/85">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 font-display text-[20px] font-extrabold leading-tight tabular-nums">{children}</dd>
    </div>
  )
}
