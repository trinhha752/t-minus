'use client'

import { Flame, Play, TrainFront, ChevronRight } from 'lucide-react'
import { CURRENT_STATION, LINES, NEXT_STATION, ROUTES, stationById, type LineId } from './stations'
import { Coin } from './fantasy'
import { PixelMap } from './PixelMap'
import { RealmIcon } from './ui'

// Pixel-game HUD: square corners, a dark outline and a hard drop shadow.
/** What the map card offers once your station is stamped (built in components/run/views.tsx). */
export type WhereNext = {
  stops: { id: string; name: string; dir: 1 | -1; stops: number; toward: string; train?: string }[]
  transfer: { at: string; atName: string; line: LineId; left: number } | null
  lineDone: boolean
}

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
  currentId = CURRENT_STATION,
  hereNote,
  nextId,
  onBoss,
  whereNext,
}: {
  played: Set<string>
  streak: number
  gold: number
  onSelect: (id: string) => void
  /** Header, realm chips, legend and check-in card; hidden under takeovers. */
  chrome?: boolean
  /** The station the player is at (from their real location). Defaults to the demo station. */
  currentId?: string
  /** Replaces "You're at · <line>" when the player isn't at a station, e.g. "Nearest · 0.9 km". */
  hereNote?: string
  /** Where to ride next after this station is stamped; null when the whole line is stamped. */
  nextId?: string | null
  /** The line is complete: open its End Boss. */
  onBoss?: () => void
  /** After this station is stamped: the next stop each way, where to switch lines, line complete. */
  whereNext?: WhereNext
}) {
  const current = stationById(currentId)
  const currentLine = current.lines[0]
  const nextStationId = nextId === undefined ? NEXT_STATION : nextId
  const next = nextStationId ? stationById(nextStationId) : null
  const currentPlayed = played.has(currentId)
  const progress = (line: LineId) => {
    const ids = ROUTES[line]
    return `${ids.filter((id) => played.has(id)).length}/${ids.length}`
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#F3E2C6]">
      <PixelMap played={played} current={currentId} onSelect={onSelect} interactive={chrome} />

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
            {(Object.keys(ROUTES) as LineId[]).map((line) => (
              <div
                key={line}
                // No realm name: three lines don't fit on a phone. The color and icon say which
                // line it is; the full name stays in the tooltip and for screen readers.
                title={`${LINES[line].name} · ${LINES[line].realm}: ${progress(line)} stations`}
                aria-label={`${LINES[line].name}, ${LINES[line].realm}: ${progress(line)} stations stamped`}
                className="flex h-9 min-w-0 flex-1 items-center gap-1.5 border-2 border-ink bg-[#FBF3DF] pr-2 shadow-[3px_3px_0_rgba(27,31,36,0.85)]"
              >
                <span
                  className="flex h-full w-8 items-center justify-center border-r-2 border-ink text-white"
                  style={{ backgroundColor: LINES[line].color }}
                >
                  <RealmIcon line={line} size={14} />
                </span>
                <span className="flex-1 text-center font-pixel text-[15px] font-bold tabular-nums text-ink">{progress(line)}</span>
              </div>
            ))}
          </div>

          {/* Legend: the same pixel icons as the map, with a label (never color alone).
              Hidden once the station is stamped: the taller where-next card takes its spot. */}
          <div className={`absolute left-4 top-[630px] z-10 ${currentPlayed ? 'hidden' : 'flex'} h-9 items-center gap-3 border-2 border-ink bg-[#FBF3DF] px-2.5 font-pixel text-[12px] text-ink-soft shadow-[3px_3px_0_rgba(27,31,36,0.85)]`}>
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
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink"
                  style={{ backgroundColor: LINES[currentLine].tint, color: LINES[currentLine].dark }}
                >
                  <TrainFront size={24} strokeWidth={2.3} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-pixel text-[13px] font-bold" style={{ color: LINES[currentLine].dark }}>
                    📍 {current.name} ✓ done
                  </p>
                  {whereNext && whereNext.stops.length > 0 ? (
                    whereNext.stops.map((st) => (
                      <button
                        key={st.dir}
                        type="button"
                        onClick={() => onSelect(st.id)}
                        className="flex w-full items-center gap-1 py-0.5 text-left font-pixel active:translate-x-px"
                      >
                        <span className="w-3 shrink-0 text-[14px]">{st.dir === 1 ? '▸' : '◂'}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[17px] font-bold leading-tight">{st.name}</span>
                          <span className="block truncate text-[11px] leading-tight text-muted">
                            {st.stops} stop{st.stops > 1 ? 's' : ''} toward {st.toward}
                            {st.train ? ` · ${st.train}` : ''}
                          </span>
                        </span>
                        <ChevronRight size={16} strokeWidth={2.6} className="shrink-0" />
                      </button>
                    ))
                  ) : whereNext?.lineDone ? (
                    <p className="font-pixel text-[17px] font-bold leading-tight">{LINES[currentLine].name} complete!</p>
                  ) : next ? (
                    <button type="button" onClick={() => onSelect(next.id)} className="flex w-full items-center gap-1 text-left font-pixel">
                      <span className="truncate text-[17px] font-bold">Next: {next.name}</span>
                      <ChevronRight size={16} strokeWidth={2.6} />
                    </button>
                  ) : null}
                  {whereNext?.transfer && (whereNext.lineDone || whereNext.stops.length < 2) && (
                    <button
                      type="button"
                      onClick={() => onSelect(whereNext.transfer!.at)}
                      className="mt-0.5 block w-full truncate text-left font-pixel text-[11px] text-muted underline"
                    >
                      Switch to the {LINES[whereNext.transfer.line].name} at {whereNext.transfer.atName} ({whereNext.transfer.left} left)
                    </button>
                  )}
                </div>
                {(whereNext ? whereNext.lineDone : !next) && (
                  <button
                    type="button"
                    onClick={() => onBoss?.()}
                    className="flex h-12 items-center gap-1 border-[3px] border-ink bg-[#F1E7CF] pl-3.5 pr-2.5 font-pixel text-[16px] font-bold text-ink shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    Fight
                    <ChevronRight size={18} strokeWidth={2.6} />
                  </button>
                )}
              </>
            ) : (
              <>
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink"
                  style={{ backgroundColor: LINES[currentLine].tint, color: LINES[currentLine].dark }}
                >
                  <RealmIcon line={currentLine} size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-pixel text-[13px] text-muted">{hereNote ?? `You're at · ${LINES[currentLine].name}`}</p>
                  <p className="font-pixel text-[22px] font-bold leading-tight">{current.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(currentId)}
                  style={{ backgroundColor: LINES[currentLine].color }}
                  className="flex h-12 items-center gap-1.5 border-[3px] border-ink pl-3.5 pr-4 font-pixel text-[17px] font-bold text-white shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
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
