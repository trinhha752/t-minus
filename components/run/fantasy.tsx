import type { CSSProperties, ReactNode } from 'react'

export const GOLD = '#C99A3B'
export const GOLD_LIGHT = '#F6D47E'
export const INK = '#2B1D10'
export const RED = '#DA291C'

/** One gold filigree corner, drawn for the top-left and flipped for others. */
function Corner({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={`pointer-events-none absolute h-6 w-6 ${className ?? ''}`}
      style={style}
      aria-hidden
    >
      <g fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round">
        <path d="M3 25 V10 C3 6 6 3 10 3 H25" />
        <path d="M7 21 C7 13 13 7 21 7" opacity="0.8" />
        <path d="M11 18 C11 14 14 11 18 11" opacity="0.6" />
      </g>
      <path d="M6.5 3.5 l2.5 2.5 -2.5 2.5 -2.5 -2.5 z" fill={GOLD} transform="translate(0 0)" />
    </svg>
  )
}

export function OrnateCorners({ inset = 4, color }: { inset?: number; color?: string }) {
  const s = color ? ({ filter: 'none', color } as CSSProperties) : undefined
  return (
    <>
      <Corner style={{ ...s, left: inset, top: inset }} />
      <Corner style={{ ...s, right: inset, top: inset, transform: 'scaleX(-1)' }} />
      <Corner style={{ ...s, left: inset, bottom: inset, transform: 'scaleY(-1)' }} />
      <Corner style={{ ...s, right: inset, bottom: inset, transform: 'scale(-1,-1)' }} />
    </>
  )
}

export function Coin({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <defs>
        <radialGradient id="coin-g" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#FFF0B3" />
          <stop offset="0.45" stopColor="#F2C14E" />
          <stop offset="1" stopColor="#B07A1E" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#coin-g)" stroke="#7A5216" strokeWidth="1" />
      <circle cx="12" cy="12" r="7.6" fill="none" stroke="#9A6A1C" strokeWidth="1" opacity="0.8" />
      <path d="M12 6.8 l1.5 3.4 3.6.3 -2.8 2.3.9 3.6 -3.2-2 -3.2 2 .9-3.6 -2.8-2.3 3.6-.3z" fill="#9A6A1C" />
    </svg>
  )
}

const GEMS = {
  1: { fill: '#8B8FA3', dark: '#4B4F63', glow: 'rgba(160,165,190,0.0)' },
  2: { fill: '#B07CF0', dark: '#5B2B9A', glow: 'rgba(190,140,255,0.9)' },
  3: { fill: '#FF5A47', dark: '#9E150C', glow: 'rgba(255,80,60,0.95)' },
} as const

export function Gem({ level, size = 28 }: { level: 1 | 2 | 3; size?: number }) {
  const g = GEMS[level]
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={level > 1 ? 'animate-gem-glow' : ''}
      style={{ '--glow': g.glow } as CSSProperties}
      aria-hidden
    >
      <path d="M12 1.5 L21 9 L12 22.5 L3 9 Z" fill={g.fill} stroke={g.dark} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M3 9 H21 M12 1.5 L8 9 L12 22.5 L16 9 Z" fill="none" stroke={g.dark} strokeWidth="0.9" opacity="0.7" />
      <path d="M12 1.5 L8 9 H3 Z" fill="#fff" opacity="0.45" />
      <path d="M8 9 L12 22.5 L3 9Z" fill="#000" opacity="0.12" />
    </svg>
  )
}

/** Draining hourglass: `f` is the fraction of time remaining (1 → 0). */
export function Hourglass({ f, running, low }: { f: number; running: boolean; low: boolean }) {
  const top = 20 - 12 * f // sand surface in the top bulb
  const halfTop = (9 * (20 - top)) / 14
  const pile = 34 - 11 * (1 - f)
  const sand = low ? '#FF6B57' : '#F2C14E'
  return (
    <svg viewBox="0 0 28 40" width="26" height="38" aria-hidden>
      <rect x="2" y="1" width="24" height="4" rx="1.5" fill={GOLD} stroke="#6E4A14" strokeWidth="0.8" />
      <rect x="2" y="35" width="24" height="4" rx="1.5" fill={GOLD} stroke="#6E4A14" strokeWidth="0.8" />
      <path
        d="M5 5 C5 13 12 16 12.5 20 C12 24 5 27 5 35 H23 C23 27 16 24 15.5 20 C16 16 23 13 23 5 Z"
        fill="rgba(255,255,255,0.12)"
        stroke="#E9D9B4"
        strokeWidth="1.2"
      />
      {f > 0.01 && <path d={`M${14 - halfTop} ${top} H${14 + halfTop} L14 20.5 Z`} fill={sand} />}
      {running && f > 0.01 && (
        <line
          x1="14"
          y1="20"
          x2="14"
          y2={pile}
          stroke={sand}
          strokeWidth="1.3"
          strokeDasharray="2 1"
          className="animate-sand"
        />
      )}
      <path d={`M6 34.5 C8 ${pile} 20 ${pile} 22 34.5 Z`} fill={sand} />
    </svg>
  )
}

/** Red Line ribbon banner with notched tails. */
export function Ribbon({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-9 items-center justify-center px-6">
      <svg viewBox="0 0 160 36" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d="M0 8 H14 V30 H0 L6 19 Z" fill="#8E1710" />
        <path d="M160 8 H146 V30 H160 L154 19 Z" fill="#8E1710" />
        <rect x="10" y="3" width="140" height="26" rx="2" fill={RED} stroke={GOLD_LIGHT} strokeWidth="1.4" />
        <rect
          x="14"
          y="6.5"
          width="132"
          height="19"
          rx="1"
          fill="none"
          stroke={GOLD_LIGHT}
          strokeWidth="0.6"
          opacity="0.7"
        />
      </svg>
      <span className="relative -mt-1 whitespace-nowrap font-fantasy text-[12.5px] font-extrabold tracking-[0.08em] text-white">
        {children}
      </span>
    </div>
  )
}

/** Jagged crack drawn across a card when the player is fooled. */
export function Crack() {
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1}>
        {['M58 0 L54 9 L61 15 L52 22 L57 29 L50 40', 'M54 9 L44 12 L40 8', 'M52 22 L64 25 L70 21', 'M57 29 L47 32'].map(
          (d, i) => (
            <g key={i}>
              <path
                d={d}
                stroke="#fff6dc"
                strokeWidth="1.6"
                pathLength={1}
                strokeDasharray="1"
                className="animate-crack"
                vectorEffect="non-scaling-stroke"
                transform="translate(0.6 0.6)"
              />
              <path
                d={d}
                stroke="#4A2E12"
                strokeWidth="1.6"
                pathLength={1}
                strokeDasharray="1"
                className="animate-crack"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ),
        )}
      </g>
    </svg>
  )
}

export function Twinkle({
  size = 12,
  className = '',
  style,
}: {
  size?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0Z" fill="currentColor" />
    </svg>
  )
}

/** Gold sparkles flying outward from the center of their container. */
export function SparkleBurst({ count = 16, frozen = false }: { count?: number; frozen?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2
        const r = 70 + (i % 3) * 40
        return (
          <span
            key={i}
            className={`absolute text-[#FFD86B] ${frozen ? '' : 'animate-burst'}`}
            style={
              {
                '--dx': `${Math.cos(a) * r * 1.4}px`,
                '--dy': `${Math.sin(a) * r * 0.7}px`,
                '--s': 0.6 + (i % 4) * 0.25,
                animationDelay: `${(i % 5) * 40}ms`,
                ...(frozen
                  ? {
                      transform: `translate(${Math.cos(a) * r * 0.85}px, ${Math.sin(a) * r * 0.45}px) scale(${0.6 + (i % 4) * 0.25})`,
                    }
                  : {}),
              } as CSSProperties
            }
          >
            {i % 4 === 0 ? <Coin size={14} /> : <Twinkle size={14 + (i % 3) * 4} />}
          </span>
        )
      })}
    </div>
  )
}

const LEAF = 'M0 0 C3 -4.5 9 -5 13 0 C9 5 3 4.5 0 0 Z'

/** A curling vine with leaves and a bloom, growing from the bottom-left corner. */
function VineCorner({ style, delay = 0 }: { style: CSSProperties; delay?: number }) {
  const leaves: [number, number, number][] = [
    [9, 46, -110],
    [13, 26, -60],
    [20, 9, -100],
    [26, 59, -20],
    [52, 56, 20],
    [78, 58, -30],
  ]
  return (
    <svg
      viewBox="0 0 100 64"
      width="100"
      height="64"
      className="pointer-events-none absolute"
      style={style}
      aria-hidden
    >
      <g fill="none" stroke="#3E8A2E" strokeWidth="2.2" strokeLinecap="round">
        <path
          d="M2 62 C10 50 4 36 12 26 S26 10 22 2"
          pathLength={1}
          strokeDasharray="1"
          className="animate-grow"
          style={{ animationDelay: `${delay}ms` }}
        />
        <path
          d="M2 62 C18 58 30 64 44 58 S70 56 96 60"
          pathLength={1}
          strokeDasharray="1"
          className="animate-grow"
          style={{ animationDelay: `${delay + 80}ms` }}
        />
      </g>
      {leaves.map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <path
            d={LEAF}
            fill={i % 2 ? '#5DB84A' : '#3E9B3A'}
            stroke="#24601C"
            strokeWidth="0.7"
            className="animate-leaf"
            style={{
              animationDelay: `${delay + 200 + i * 70}ms`,
              transformBox: 'fill-box',
              transformOrigin: 'left center',
            }}
          />
        </g>
      ))}
      {[
        [40, 57],
        [16, 30],
      ].map(([x, y], i) => (
        <g
          key={i}
          className="animate-leaf"
          style={{ animationDelay: `${delay + 600 + i * 120}ms`, transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse
              key={a}
              cx={x}
              cy={y - 3}
              rx="2.2"
              ry="3.4"
              fill="#FFF3C4"
              stroke="#D9A93A"
              strokeWidth="0.5"
              transform={`rotate(${a} ${x} ${y})`}
            />
          ))}
          <circle cx={x} cy={y} r="1.8" fill="#F2B233" />
        </g>
      ))}
    </svg>
  )
}

/** Correct pick: vines and blossoms climb the scroll and it glows with a living hum. */
export function LifeBloom() {
  return (
    <span className="pointer-events-none absolute inset-0 rounded-[16px]" aria-hidden>
      <span className="absolute inset-0 rounded-[16px] bg-[radial-gradient(ellipse_at_50%_50%,rgba(190,245,150,0.35),transparent_75%)]" />
      <span className="absolute inset-0 animate-hum rounded-[16px]" />
      <VineCorner style={{ left: -6, bottom: -6 }} />
      <VineCorner style={{ right: -6, top: -6, transform: 'scale(-1,-1)' }} delay={150} />
    </span>
  )
}

const DRIPS: [number, number][] = [
  [34, 16],
  [88, 24],
  [140, 11],
  [205, 20],
  [262, 13],
  [318, 22],
]

/** Wrong pick: toxic ooze drips over the scroll, it darkens and bubbles. */
export function Poison() {
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[16px]" aria-hidden>
      <span className="absolute inset-0 animate-fade-in bg-[radial-gradient(ellipse_at_50%_55%,rgba(120,200,60,0.05)_35%,rgba(74,29,92,0.5)_100%)]" />
      <svg viewBox="0 0 361 30" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-[30px] w-full">
        <g className="animate-drip" style={{ transformBox: 'fill-box', transformOrigin: 'top' }}>
          <rect x="0" y="0" width="361" height="5" fill="#7BD13A" />
          {DRIPS.map(([x, l]) => (
            <path
              key={x}
              d={`M${x - 4.5} 4 Q${x - 3} ${l * 0.55} ${x - 3.6} ${l} A3.6 3.6 0 0 0 ${x + 3.6} ${l} Q${x + 3} ${l * 0.55} ${x + 4.5} 4 Z`}
              fill="#7BD13A"
            />
          ))}
          <rect x="0" y="0" width="361" height="2" fill="#B6F27A" opacity="0.8" />
        </g>
      </svg>
      {[
        [18, 0],
        [42, 500],
        [70, 250],
        [88, 900],
      ].map(([x, d], i) => (
        <span
          key={i}
          className="absolute bottom-1 h-2.5 w-2.5 animate-bubble rounded-full border-2 border-[#7BD13A] bg-[#7BD13A]/30"
          style={{ left: `${x}%`, animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  )
}

/** Leaves and gold drifting outward from a blooming scroll. */
export function LifeBurst({ frozen = false }: { frozen?: boolean }) {
  const count = 14
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2
        const r = 70 + (i % 3) * 36
        const k = frozen ? 0.85 : 1.4
        return (
          <span
            key={i}
            className={`absolute ${frozen ? '' : 'animate-burst'}`}
            style={
              {
                '--dx': `${Math.cos(a) * r * 1.4}px`,
                '--dy': `${Math.sin(a) * r * 0.7}px`,
                '--s': 0.7 + (i % 3) * 0.2,
                animationDelay: `${(i % 5) * 50}ms`,
                ...(frozen ? { transform: `translate(${Math.cos(a) * r * k}px, ${Math.sin(a) * r * 0.45}px)` } : {}),
              } as CSSProperties
            }
          >
            {i % 5 === 0 ? (
              <Coin size={14} />
            ) : i % 2 ? (
              <svg viewBox="-1 -6 15 12" width="16" height="13">
                <path d={LEAF} fill="#5DB84A" stroke="#24601C" strokeWidth="0.8" transform={`rotate(${i * 40} 6 0)`} />
              </svg>
            ) : (
              <Twinkle size={12} className="text-[#D9F7A0]" />
            )}
          </span>
        )
      })}
    </div>
  )
}

const HEART =
  'M12 21 C12 21 2 14.5 2 8.2 C2 5 4.5 2.6 7.5 2.6 C9.5 2.6 11 3.7 12 5.3 C13 3.7 14.5 2.6 16.5 2.6 C19.5 2.6 22 5 22 8.2 C22 14.5 12 21 12 21Z'

/**
 * Shared heart row for boss fights. Base hearts are red; extra slots granted by
 * items get a gold outline. Lost hearts are empty and cracked.
 */
export function HeartRow({
  hearts,
  max,
  base = 3,
  cracking,
  refilling,
  frozen = false,
  size = 30,
}: {
  hearts: number
  max: number
  base?: number
  cracking?: number
  refilling?: number
  frozen?: boolean
  size?: number
}) {
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`${hearts} of ${max} hearts`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < hearts
        const extra = i >= base
        const isCracking = i === cracking
        const isRefill = i === refilling
        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            width={size}
            height={size}
            className={
              !frozen && isCracking ? 'animate-heart-crack' : !frozen && isRefill ? 'animate-heart-refill' : ''
            }
            style={isRefill && frozen ? { filter: 'drop-shadow(0 0 6px #9BFFB0)', transform: 'scale(1.1)' } : undefined}
            aria-hidden
          >
            <defs>
              <radialGradient id="heart-g" cx="35%" cy="30%" r="80%">
                <stop offset="0" stopColor="#FF8A78" />
                <stop offset="0.45" stopColor="#E8321F" />
                <stop offset="1" stopColor="#8E1710" />
              </radialGradient>
            </defs>
            <path
              d={HEART}
              fill={filled ? 'url(#heart-g)' : '#24150D'}
              stroke={extra ? '#F6D47E' : filled ? '#5A0E08' : '#6B5434'}
              strokeWidth={extra ? 2.2 : 1.4}
            />
            {filled && (
              <path
                d="M6.5 6 C7.5 5 9 5 9.8 6.2"
                stroke="#FFD9D2"
                strokeWidth="1.4"
                fill="none"
                strokeLinecap="round"
              />
            )}
            {!filled && (
              <path
                d="M12 5.5 L10.4 9.5 L13.2 12 L10.8 15.5 L12.4 19.5"
                fill="none"
                stroke={isCracking ? '#FF6B57' : '#8A6A44'}
                strokeWidth="1.6"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray="1"
                className={!frozen && isCracking ? 'animate-crack' : ''}
              />
            )}
          </svg>
        )
      })}
    </div>
  )
}
