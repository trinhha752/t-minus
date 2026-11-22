'use client'

import { Flame, Play, TrainFront, ChevronRight } from 'lucide-react'
import { CURRENT_STATION, LINES, NEXT_STATION, ROUTES, stationById, type LineId } from './stations'
import { Coin } from './fantasy'
import { PixelMap } from './PixelMap'
import { RealmIcon } from './ui'

// Pixel-game HUD: square corners, a dark outline and a hard drop shadow.
const PANEL = 'border-[3px] border-ink bg-[#FBF3DF] shadow-[4px_4px_0_rgba(27,31,36,0.85)]'

/** Tiny pixel icons for the legend, matching the sprites on the map. */
function PixelIcon({ rows, colors }: { rows: string[]; colors: Record<string, string> }) {
  return (
    <svg
      width={rows[0].length * 2}
      height={rows.length * 2}
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {rows.flatMap((row, y) =>
        [...row].map((c, x) => (colors[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={colors[c]} /> : null)),
      )}
    </svg>
  )
}

const LEGEND = {
  // A tiny station sign with a line-color tab
  toPlay: {
    rows: ['kkkkkkkkk', 'krkwwwwwk', 'krkwkkkwk', 'krkwwwwwk', 'kkkkkkkkk'],
    colors: { r: '#DA291C', w: '#FBF3DF', k: '#2A2522' },
  },
  played: {
    rows: ['kgg..', 'kggg.', 'kgg..', 'k....', 'k....', 'k....'],
    colors: { k: '#2A2522', g: '#F2B233' },
  },
  here: {
    rows: ['..kkk..', '..kgk..', 'kkkgkkk', 'kgggggk', '.kgggk.', '..kgk..', '...k...'],
    colors: { k: '#2A2522', g: '#F2B233' },
  },
}

export function MapScreen({
  played,
  streak,
  gold,
  onSelect,
  chrome = true,
}: {
  played: Set<string>
  streak: number
  gold: number
  onSelect: (id: string) => void
  /** Header, realm chips, legend and check-in card; hidden under takeovers. */
  chrome?: boolean
}) {
  const current = stationById(CURRENT_STATION)
  const next = stationById(NEXT_STATION)
  const currentPlayed = played.has(CURRENT_STATION)
  const progress = (line: LineId) => {
    const ids = ROUTES[line]
    return `${ids.filter((id) => played.has(id)).length}/${ids.length}`
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#F3E2C6]">
      <PixelMap played={played} current={CURRENT_STATION} onSelect={onSelect} interactive={chrome} />

      {chrome && (
        <>
          {/* Header */}
          <header className={`absolute inset-x-4 top-[56px] z-10 flex h-[56px] items-center justify-between pl-2.5 pr-2 ${PANEL}`}>
            <div className="flex items-center gap-2">
              <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden border-2 border-ink text-white">
                <span className="absolute inset-y-0 left-0 w-1/2 bg-line-red" />
                <span className="absolute inset-y-0 right-0 w-1/2 bg-line-green" />
                <TrainFront size={19} strokeWidth={2.4} className="relative" />
              </span>
              <h1 className="font-pixel text-[25px] font-bold leading-none tracking-[0.01em]">T-Minus</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="flex h-10 items-center gap-1.5 border-2 border-ink bg-[#FFE7A3] pl-1.5 pr-2.5"
                aria-label={`${gold.toLocaleString()} gold`}
              >
                <Coin size={20} />
                <span className="font-pixel text-[19px] font-bold tabular-nums text-[#7A4D0E]">
                  {gold.toLocaleString()}
                </span>
              </div>
              <div
                className="flex h-10 items-center gap-1 border-2 border-ink bg-[#FFD9BF] pl-1.5 pr-2.5"
                aria-label={`${streak} day streak`}
              >
                <Flame size={19} strokeWidth={2.4} className="fill-[#F59E0B] text-flame" />
                <span className="font-pixel text-[19px] font-bold text-flame">{streak}</span>
              </div>
            </div>
          </header>

          {/* Realm progress chips */}
          <div className="absolute inset-x-4 top-[124px] z-10 flex gap-2.5 pr-1">
            {(['red', 'green'] as LineId[]).map((line) => (
              <div
                key={line}
                className="flex h-9 min-w-0 flex-1 items-center gap-1.5 border-2 border-ink bg-[#FBF3DF] pr-2 shadow-[3px_3px_0_rgba(27,31,36,0.85)]"
              >
                <span
                  className="flex h-full w-8 items-center justify-center border-r-2 border-ink text-white"
                  style={{ backgroundColor: LINES[line].color }}
                >
                  <RealmIcon line={line} size={14} />
                </span>
                <span className="flex-1 truncate font-pixel text-[13px] font-medium leading-tight">
                  {LINES[line].realm}
                </span>
                <span className="font-pixel text-[13px] font-bold tabular-nums text-muted">{progress(line)}</span>
              </div>
            ))}
          </div>

          {/* Legend: the same pixel icons as the map, with a label (never color alone) */}
          <div className="absolute left-4 top-[630px] z-10 flex h-9 items-center gap-3 border-2 border-ink bg-[#FBF3DF] px-2.5 font-pixel text-[12px] text-ink-soft shadow-[3px_3px_0_rgba(27,31,36,0.85)]">
            <span className="flex items-center gap-1.5">
              <PixelIcon {...LEGEND.toPlay} />
              To play
            </span>
            <span className="flex items-center gap-1.5">
              <PixelIcon {...LEGEND.played} />
              Played
            </span>
            <span className="flex items-center gap-1.5">
              <PixelIcon {...LEGEND.here} />
              You are here
            </span>
          </div>

          {/* Check-in card: primary action in the thumb zone */}
          <div className={`absolute inset-x-4 bottom-[96px] z-20 flex items-center gap-3 p-2.5 pl-3 ${PANEL}`}>
            {currentPlayed ? (
              <>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-[#FDECEA] text-line-red-dark">
                  <TrainFront size={24} strokeWidth={2.3} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-pixel text-[13px] text-muted">Next stop · ~3 min</p>
                  <p className="font-pixel text-[22px] font-bold leading-tight">{next.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(NEXT_STATION)}
                  className="flex h-12 items-center gap-1 border-[3px] border-ink bg-[#F1E7CF] pl-3.5 pr-2.5 font-pixel text-[16px] font-bold text-ink shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  Preview
                  <ChevronRight size={18} strokeWidth={2.6} />
                </button>
              </>
            ) : (
              <>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-[#FDECEA] text-line-red-dark">
                  <RealmIcon line="red" size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-pixel text-[13px] text-muted">You&apos;re at · {LINES.red.realm}</p>
                  <p className="font-pixel text-[22px] font-bold leading-tight">{current.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(CURRENT_STATION)}
                  className="flex h-12 items-center gap-1.5 border-[3px] border-ink bg-line-red pl-3.5 pr-4 font-pixel text-[17px] font-bold text-white shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  <Play size={15} strokeWidth={3} className="fill-white" />
                  Check in
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
