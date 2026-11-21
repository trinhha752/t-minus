'use client'

import { Check, Flame, Play, TrainFront, ChevronRight } from 'lucide-react'
import {
  CURRENT_STATION,
  LINES,
  NEXT_STATION,
  ROUTES,
  STATIONS,
  stationById,
  type LineId,
  type Station,
} from './stations'
import { Coin } from './fantasy'
import { RealmIcon } from './ui'

const OY = 26 // vertical offset so the map clears the floating header

const RIVER =
  'M -10 466 C 60 460 140 456 190 436 C 228 424 246 404 250 376 C 254 342 250 300 262 280 C 278 256 330 252 400 238'

function MapBackground() {
  return (
    <svg viewBox="0 0 393 852" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <pattern id="blocks" width="20" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)">
          <rect x="1" y="1" width="16" height="11" rx="2" fill="#E9E5DD" />
        </pattern>
        <path id="river-path" d={RIVER} />
      </defs>
      <rect width="393" height="852" fill="#F3F0EA" />
      <g transform={`translate(0 ${OY})`}>
        <rect x="-20" y="-40" width="440" height="900" fill="url(#blocks)" opacity="0.75" />

        {/* Parks */}
        <g fill="#CFE6BF">
          <path d="M8 212 C 20 196 60 198 74 214 C 84 232 70 258 44 262 C 18 262 0 236 8 212 Z" />
          <rect x="148" y="286" width="30" height="26" rx="4" />
          <rect x="104" y="258" width="20" height="18" rx="3" />
          <path d="M240 456 L 292 448 L 302 472 L 270 490 L 244 484 Z" />
          <path d="M206 466 L 238 460 L 242 486 L 212 492 Z" />
          <path d="M-10 486 C 80 480 160 472 214 452 L 238 440 L 242 448 C 220 464 160 484 -10 498 Z" />
          <path d="M60 572 C 90 560 128 570 124 600 C 118 628 80 634 62 618 C 50 604 50 584 60 572 Z" />
          <path d="M236 216 L 262 206 L 268 222 L 244 232 Z" />
        </g>

        {/* Water */}
        <ellipse cx="40" cy="232" rx="20" ry="13" fill="#A9D4F5" />
        <path d={RIVER} fill="none" stroke="#A9D4F5" strokeWidth="26" strokeLinecap="round" />
        <path
          d="M393 222 C 360 250 345 280 352 300 C 362 330 352 370 360 400 C 372 440 362 480 370 520 C 378 560 364 590 372 640 C 380 700 368 760 372 852 L 400 852 L 400 222 Z"
          fill="#A9D4F5"
        />

        {/* Highways */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <g stroke="#E2BE5C" strokeWidth="8">
            <path d="M290 110 L 305 250 L 336 300 L 344 400 L 348 520 L 344 620 L 330 860" />
            <path d="M-10 574 L 120 558 L 260 542 L 346 560" />
            <path d="M-10 186 L 44 172 L 22 300 L 10 360" />
          </g>
          <g stroke="#F9DC86" strokeWidth="5.5">
            <path d="M290 110 L 305 250 L 336 300 L 344 400 L 348 520 L 344 620 L 330 860" />
            <path d="M-10 574 L 120 558 L 260 542 L 346 560" />
            <path d="M-10 186 L 44 172 L 22 300 L 10 360" />
          </g>
        </g>

        {/* Streets */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {(['#E0DBD1', '#FFFFFF'] as const).map((stroke, i) => (
            <g key={stroke} stroke={stroke} strokeWidth={i === 0 ? 6.5 : 4.5}>
              <path d="M60 140 L 120 238 L 136 300 L 180 340 L 200 420 L 168 500 L 150 560 L 140 700 L 130 860" />
              <path d="M-10 482 C 80 478 160 470 210 452 L 262 420" />
              <path d="M222 368 L 300 382 L 340 380" />
              <path d="M180 340 L 214 236 L 232 120" />
              <path d="M-10 262 L 120 240 L 260 200 L 400 186" />
              <path d="M184 508 L 120 600 L 60 720" />
              <path d="M290 452 L 250 560 L 220 700 L 204 860" />
              <path d="M320 484 L 302 560 L 292 700 L 286 860" />
              <path d="M228 520 L 182 640 L 156 860" />
              <path d="M-10 334 L 136 300" />
              <path d="M-10 640 L 140 650 L 300 640" />
              <path d="M-10 410 L 90 392 L 180 340" />
            </g>
          ))}
        </g>

        {/* Place labels */}
        <g fill="#5F646C" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="600" letterSpacing="1.4">
          <text x="165" y="165" textAnchor="middle">SOMERVILLE</text>
          <text x="72" y="404" textAnchor="middle">CAMBRIDGE</text>
          <text x="212" y="590" textAnchor="middle">BACK BAY</text>
          <text x="76" y="664" textAnchor="middle">FENWAY</text>
          <text x="262" y="612" textAnchor="middle">SOUTH END</text>
        </g>
        <text fill="#245E92" fontSize="10" fontStyle="italic" fontWeight="600" fontFamily="Inter, sans-serif">
          <textPath href="#river-path" startOffset="9%" dy="3">
            Charles River
          </textPath>
        </text>
        <text
          x="384"
          y="720"
          fill="#245E92"
          fontSize="10"
          fontStyle="italic"
          fontWeight="600"
          fontFamily="Inter, sans-serif"
          transform="rotate(-90 384 720)"
          textAnchor="middle"
        >
          Boston Harbor
        </text>

        {/* Transit routes — white casing then line color */}
        {(Object.keys(ROUTES) as LineId[]).map((line) => {
          const pts = ROUTES[line].map((id) => stationById(id))
          const tail =
            line === 'red' ? ' L 346 600 L 352 860' : line === 'orange' ? ' L 104 860' : ' L 60 548 L -10 590'
          const head = line === 'red' ? 'M 10 140 L ' : line === 'orange' ? 'M 312 100 L ' : 'M 196 160 L '
          const d = head + pts.map((p) => `${p.x} ${p.y}`).join(' L ') + tail
          return (
            <g key={line} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d={d} stroke="#FFFFFF" strokeWidth="13" />
              <path d={d} stroke={LINES[line].color} strokeWidth="8" />
            </g>
          )
        })}
      </g>
    </svg>
  )
}

function StationDot({
  s,
  played,
  current,
  onTap,
}: {
  s: Station
  played: boolean
  current: boolean
  onTap: () => void
}) {
  const line = LINES[s.lines[0]]
  const transfer = s.lines.length > 1
  const color = transfer ? '#1B1F24' : line.color
  const lineNames = s.lines.map((l) => LINES[l].name).join(' and ')
  const status = `${current ? 'You are here. ' : ''}${played ? 'Played' : 'Not played yet'}`

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={`${s.name}, ${lineNames}. ${status}`}
      className="group absolute flex h-11 w-11 items-center justify-center rounded-full"
      style={{ left: s.x - 22, top: s.y + OY - 22 }}
    >
      {current && (
        <>
          <span className="absolute h-7 w-7 animate-pulse-ring rounded-full" style={{ backgroundColor: color }} />
          <span
            className="absolute h-7 w-7 animate-pulse-ring rounded-full [animation-delay:1s]"
            style={{ backgroundColor: color }}
          />
        </>
      )}
      {current ? (
        <span
          className="relative flex h-[30px] w-[30px] items-center justify-center rounded-full border-[5px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-transform group-active:scale-90"
          style={{ borderColor: color }}
        >
          {played ? (
            <Check size={13} strokeWidth={4} style={{ color }} />
          ) : (
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          )}
        </span>
      ) : played ? (
        <span
          className="relative flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform group-active:scale-90"
          style={{ backgroundColor: color }}
        >
          <Check size={12} strokeWidth={4} className="text-white" />
        </span>
      ) : (
        <span
          className={`relative rounded-full border-[4px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform group-hover:scale-110 group-active:scale-90 ${
            transfer ? 'h-[22px] w-[22px]' : 'h-[18px] w-[18px]'
          }`}
          style={{ borderColor: color }}
        />
      )}
    </button>
  )
}

function StationLabel({ s, current }: { s: Station; current: boolean }) {
  const { dx, dy, align, text } = s.label
  const tx = align === 'end' ? '-100%' : align === 'center' ? '-50%' : '0'
  if (current) {
    return (
      <div
        className="pointer-events-none absolute flex flex-col items-end rounded-xl bg-ink px-2.5 py-1.5 text-white shadow-lg"
        style={{ left: s.x + dx, top: s.y + OY + dy, transform: `translate(${tx}, -50%)` }}
      >
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/80">You are here</span>
        <span className="font-display text-[15px] font-bold leading-tight">{s.name}</span>
      </div>
    )
  }
  return (
    <span
      className="pointer-events-none absolute whitespace-pre text-[11px] font-semibold leading-[1.15] text-ink-soft [text-shadow:0_0_2px_#fff,0_0_2px_#fff,0_0_3px_#fff,0_0_4px_#fff]"
      style={{
        left: s.x + dx,
        top: s.y + OY + dy,
        transform: `translate(${tx}, -50%)`,
        textAlign: align === 'end' ? 'right' : align === 'center' ? 'center' : 'left',
      }}
    >
      {text ?? s.name}
    </span>
  )
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
    <div className="absolute inset-0 overflow-hidden">
      <MapBackground />

      {STATIONS.map((s) => (
        <StationLabel key={`l-${s.id}`} s={s} current={s.id === CURRENT_STATION} />
      ))}
      {STATIONS.map((s) => (
        <StationDot
          key={s.id}
          s={s}
          played={played.has(s.id)}
          current={s.id === CURRENT_STATION}
          onTap={() => onSelect(s.id)}
        />
      ))}

      {chrome && (
        <>
      {/* Header */}
      <header className="absolute inset-x-4 top-[56px] z-10 flex h-[56px] items-center justify-between rounded-[20px] bg-white/85 pl-3 pr-2 shadow-[0_4px_18px_rgba(27,31,36,0.12)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[11px] bg-ink text-white">
            <span className="absolute inset-y-0 left-0 w-1/2 bg-line-red" />
            <span className="absolute inset-y-0 right-0 w-1/2 bg-line-green" />
            <TrainFront size={19} strokeWidth={2.4} className="relative" />
          </span>
          <h1 className="font-display text-[23px] font-extrabold tracking-[-0.02em]">
            T<span className="text-muted">–</span>Minus
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="flex h-11 items-center gap-1.5 rounded-full bg-[#FFF6DD] pl-2 pr-3"
            aria-label={`${gold.toLocaleString()} gold`}
          >
            <Coin size={20} />
            <span className="font-display text-[18px] font-extrabold tabular-nums text-[#8A5A12]">
              {gold.toLocaleString()}
            </span>
          </div>
          <div
            className="flex h-11 items-center gap-1 rounded-full bg-[#FFF1E6] pl-2 pr-3"
            aria-label={`${streak} day streak`}
          >
            <Flame size={20} strokeWidth={2.4} className="fill-[#F59E0B] text-flame" />
            <span className="font-display text-[18px] font-extrabold text-flame">{streak}</span>
          </div>
        </div>
      </header>

      {/* Realm progress chips */}
      <div className="absolute inset-x-4 top-[120px] z-10 flex gap-2">
        {(['red', 'green', 'orange'] as LineId[]).map((line) => (
          <div
            key={line}
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-white/90 pl-1 pr-3 shadow-[0_2px_8px_rgba(27,31,36,0.1)] backdrop-blur"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: LINES[line].color }}
            >
              <RealmIcon line={line} size={14} />
            </span>
            <span className="flex-1 truncate text-[12px] font-semibold leading-tight">
              {LINES[line].realm}
            </span>
            <span className="text-[12px] font-bold tabular-nums text-muted">{progress(line)}</span>
          </div>
        ))}
      </div>

      {/* Legend — shape + label, never color alone */}
      <div className="absolute left-4 top-[636px] z-10 flex h-9 items-center gap-3 rounded-full bg-white/90 px-3 text-[11px] font-semibold text-ink-soft shadow-[0_2px_8px_rgba(27,31,36,0.1)] backdrop-blur">
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-full border-[3px] border-ink bg-white" />
          To play
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ink">
            <Check size={10} strokeWidth={4} className="text-white" />
          </span>
          Played
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full border-[3px] border-ink bg-white">
            <span className="h-1.5 w-1.5 rounded-full bg-ink" />
          </span>
          You are here
        </span>
      </div>

      {/* Check-in card — primary action in thumb zone */}
      <div className="absolute inset-x-4 bottom-[96px] z-20 flex items-center gap-3 rounded-[22px] bg-white p-2.5 pl-3 shadow-[0_8px_28px_rgba(27,31,36,0.18)]">
        {currentPlayed ? (
          <>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FDECEA] text-line-red-dark">
              <TrainFront size={24} strokeWidth={2.3} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-muted">Next stop · arriving ~3 min</p>
              <p className="font-display text-[20px] font-bold leading-tight">{next.name}</p>
            </div>
            <button
              type="button"
              onClick={() => onSelect(NEXT_STATION)}
              className="flex h-12 items-center gap-1 rounded-full bg-[#F1EFEA] pl-4 pr-3 text-[15px] font-bold text-ink active:scale-95"
            >
              Preview
              <ChevronRight size={18} strokeWidth={2.6} />
            </button>
          </>
        ) : (
          <>
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FDECEA] text-line-red-dark">
              <RealmIcon line="red" size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-muted">You&apos;re at · {LINES.red.realm}</p>
              <p className="font-display text-[20px] font-bold leading-tight">{current.name}</p>
            </div>
            <button
              type="button"
              onClick={() => onSelect(CURRENT_STATION)}
              className="flex h-12 items-center gap-1.5 rounded-full bg-line-red pl-4 pr-5 text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(218,41,28,0.35)] active:scale-95"
            >
              <Play size={16} strokeWidth={3} className="fill-white" />
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
