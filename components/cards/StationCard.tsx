'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, Clock, Gamepad2, Layers, MapPin, Play, RotateCcw, ScrollText, Swords, X } from 'lucide-react'
import { LINES, NEXT_STATION, type Station } from '@/components/run/stations'
import { LineBadge, MiniFactCard, RealmIcon } from '@/components/run/ui'

export function StationCard({
  station,
  played,
  isCurrent,
  onClose,
  onPlay,
  onViewCollection,
  onBoss,
}: {
  station: Station
  played: boolean
  isCurrent: boolean
  onClose: () => void
  onPlay: () => void
  onViewCollection: () => void
  /** Set for end-of-line stations: opens the End-of-Line Boss fight. */
  onBoss?: () => void
}) {
  const [closing, setClosing] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const line = LINES[station.lines[0]]

  // Next keeps visited routes alive (hidden) with cacheComponents, so reset the
  // close animation when this card is hidden; otherwise it reappears mid-close.
  useLayoutEffect(() => () => setClosing(false), [])

  const close = (then?: () => void) => {
    setClosing(true)
    window.setTimeout(() => (then ?? onClose)(), 220)
  }

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="absolute inset-0 z-40">
      <button
        type="button"
        aria-label="Close station card"
        tabIndex={-1}
        onClick={() => close()}
        className={`absolute inset-0 bg-[#0F1318]/40 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="station-title"
        className={`absolute inset-x-0 bottom-0 rounded-t-[32px] bg-white px-5 pb-[38px] pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] ${
          closing ? 'animate-sheet-down' : 'animate-sheet-up'
        }`}
      >
        <div className="mx-auto mb-2 h-[5px] w-10 rounded-full bg-[#D5D2CC]" aria-hidden />

        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {station.lines.map((l) => (
              <LineBadge key={l} line={l} />
            ))}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => close()}
            aria-label="Close"
            className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#F1EFEA] text-ink active:scale-90"
          >
            <X size={20} strokeWidth={2.6} />
          </button>
        </div>

        <h2 id="station-title" className="mt-1 font-display text-[38px] font-extrabold leading-[1] tracking-[-0.03em]">
          {station.name}
        </h2>
        <p className="mt-1.5 flex items-center gap-1.5 text-[15px] font-semibold" style={{ color: line.dark }}>
          <RealmIcon line={station.lines[0]} size={16} />
          {line.realm}
        </p>

        {/* Story */}
        <div className="mt-4 rounded-[20px] bg-parchment p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7A5A1E]">
            <ScrollText size={14} strokeWidth={2.4} />
            Local legend
          </p>
          <p className="mt-1.5 text-[17px] font-semibold leading-snug text-ink">“{station.story}”</p>
        </div>

        {/* Game */}
        <div className="mt-3 flex items-center gap-3 rounded-[20px] border border-[#E7E4DE] p-3">
          <span
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl text-white"
            style={{ backgroundColor: line.color }}
          >
            <Gamepad2 size={26} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Mini-game</p>
            <p className="font-display text-[21px] font-bold leading-tight">{station.game.title}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className="rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ backgroundColor: line.tint, color: line.dark }}>
                {station.game.genre}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-[#F1EFEA] px-2 py-0.5 text-[12px] font-semibold text-ink-soft">
                <Clock size={12} strokeWidth={2.6} />
                {station.game.time}
              </span>
            </div>
          </div>
        </div>

        {/* Reward */}
        <div className="mt-3 flex items-center gap-4 px-1 py-2">
          <MiniFactCard station={station} locked={!played} className="-rotate-6" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
              {played ? 'Collected' : 'You can earn'}
            </p>
            <p className="font-display text-[18px] font-bold leading-tight">{station.fact.title}</p>
            <p className="mt-0.5 text-[13px] text-muted">
              Fact card · {line.realm} No. {String(station.fact.no).padStart(2, '0')}
            </p>
          </div>
        </div>

        {/* End of the line: the boss waits here */}
        {onBoss && (
          <button
            type="button"
            onClick={() => close(onBoss)}
            className="mt-3 flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] border-2 border-[#F6D47E] bg-[#1B1F24] font-display text-[17px] font-extrabold text-[#F6D47E] shadow-[0_6px_16px_rgba(0,0,0,0.25)] active:scale-[0.98]"
          >
            <Swords size={19} strokeWidth={2.6} />
            Challenge the End-of-Line Boss
          </button>
        )}

        {/* Primary action */}
        <div className="mt-3">
          {isCurrent ? (
            <button
              type="button"
              onClick={() => close(onPlay)}
              className="flex h-[60px] w-full items-center justify-between rounded-[20px] px-5 text-white shadow-[0_8px_20px_rgba(0,0,0,0.18)] transition-transform active:scale-[0.98]"
              style={{ backgroundColor: line.color }}
            >
              <span className="flex items-center gap-2.5 font-display text-[22px] font-extrabold">
                {played ? <RotateCcw size={22} strokeWidth={2.8} /> : <Play size={22} strokeWidth={3} className="fill-white" />}
                {played ? 'Play again' : 'Play'}
              </span>
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-[13px] font-bold">{station.game.time}</span>
            </button>
          ) : played ? (
            <button
              type="button"
              onClick={() => close(onViewCollection)}
              className="flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] bg-[#F1EFEA] text-[16px] font-bold text-ink active:scale-[0.98]"
            >
              <Check size={18} strokeWidth={3} />
              Card collected · View in collection
              <Layers size={16} strokeWidth={2.6} className="text-muted" />
            </button>
          ) : (
            <>
              <button
                type="button"
                aria-disabled="true"
                className="flex h-[56px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-[#CFCBC3] text-[16px] font-bold text-muted"
              >
                <MapPin size={18} strokeWidth={2.6} />
                Ride here to play
              </button>
              <p className="mt-2 text-center text-[13px] text-muted">
                {station.id === NEXT_STATION
                  ? 'Arriving in ~3 min. Check-in unlocks on the platform.'
                  : 'Check-in unlocks when you reach this station.'}
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
