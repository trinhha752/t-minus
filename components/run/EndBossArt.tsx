import type { CSSProperties, ReactNode } from 'react'

export type EndMood = 'idle' | 'rise' | 'recoil' | 'roar' | 'strike' | 'shatter' | 'loom'
export type Phase = 1 | 2 | 3

const EYE: Record<Phase, string> = { 1: '#FFB020', 2: '#FF6A28', 3: '#FFF4E0' }

const SHARDS: Record<string, [number, number, number]> = {
  head: [0, -90, -30],
  torso: [0, 40, 10],
  armL: [-100, 0, -80],
  armR: [100, -10, 80],
  legs: [0, 80, -6],
}

function Part({ id, mood, frozen, children }: { id: string; mood: EndMood; frozen: boolean; children: ReactNode }) {
  if (mood !== 'shatter') return <g>{children}</g>
  const [dx, dy, r] = SHARDS[id]
  const base: CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' }
  const style: CSSProperties = frozen
    ? { ...base, transform: `translate(${dx * 0.55}px, ${dy * 0.55}px) rotate(${r * 0.55}deg)`, opacity: 0.85 }
    : ({ ...base, '--dx': `${dx}px`, '--dy': `${dy}px`, '--r': `${r}deg` } as CSSProperties)
  return (
    <g className={frozen ? '' : 'animate-shard'} style={style}>
      {children}
    </g>
  )
}

function Flame({
  x,
  y,
  s = 1,
  frozen,
  delay = 0,
}: {
  x: number
  y: number
  s?: number
  frozen: boolean
  delay?: number
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g
        className={frozen ? '' : 'animate-flicker'}
        style={{ transformBox: 'fill-box', transformOrigin: '50% 100%', animationDelay: `${delay}ms` }}
      >
        <path
          d="M0 0 C-9 -6 -8 -18 -2 -28 C-1 -20 4 -18 3 -12 C7 -16 8 -22 6 -28 C14 -18 12 -4 0 0Z"
          fill="url(#eb-fire)"
        />
        <path d="M0 -2 C-4 -5 -4 -11 -1 -16 C0 -11 3 -10 2 -6 C4 -8 5 -11 4 -14 C8 -9 6 -3 0 -2Z" fill="#FFF3B0" />
      </g>
    </g>
  )
}

function Page({ x, y, r, frozen, delay }: { x: number; y: number; r: number; frozen: boolean; delay: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <g
        className={frozen ? '' : 'animate-float'}
        style={{ animationDelay: `${delay}ms`, transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        <rect x="-9" y="-12" width="18" height="24" rx="1.5" fill="#F4E7C9" stroke="#8A5A1E" strokeWidth="0.8" />
        <path d="M-6 -7 h12 M-6 -3 h12 M-6 1 h9 M-6 5 h11" stroke="#8A6A3A" strokeWidth="1" />
        <path d="M9 12 l-4 -3 -2 3 -3 -2 -3 2 -6 0" fill="none" stroke="#FF6A28" strokeWidth="2" />
      </g>
    </g>
  )
}

const BOOKS = ['#7A1E14', '#2F4A6B', '#5A6B2F', '#8A6A2F', '#4A2A5A', '#9A3A1A', '#2F5A4A']

function Shelf({ y, seed }: { y: number; seed: number }) {
  const out: ReactNode[] = []
  let x = 74
  let i = 0
  while (x < 164) {
    const w = 5 + ((seed + i * 7) % 5)
    const h = 20 + ((seed * 3 + i * 5) % 6)
    const c = BOOKS[(seed + i) % BOOKS.length]
    out.push(
      <g key={i}>
        <rect x={x} y={y - h} width={w} height={h} fill={c} stroke="#140A05" strokeWidth="0.6" />
        <rect x={x} y={y - h + 4} width={w} height="1.4" fill="#D9A93A" opacity="0.8" />
      </g>,
    )
    x += w + 0.6
    i++
  }
  return <>{out}</>
}

/** The Iron Archivist: a library golem of rusted rails and burning books. */
export function EndBossArt({
  mood,
  phase,
  frozen = false,
  size = 200,
}: {
  mood: EndMood
  phase: Phase
  frozen?: boolean
  size?: number
}) {
  const anim: Record<EndMood, string> = {
    idle: 'animate-boss-idle',
    rise: 'animate-rise-up',
    recoil: 'animate-recoil',
    roar: 'animate-roar',
    strike: 'animate-lunge',
    shatter: '',
    loom: 'animate-boss-idle',
  }
  const frozenStyle: CSSProperties | undefined = !frozen
    ? undefined
    : mood === 'recoil'
      ? { transform: 'translateX(12px) rotate(5deg)', filter: 'brightness(1.6)' }
      : mood === 'roar'
        ? { transform: 'scale(1.06)' }
        : mood === 'strike'
          ? { transform: 'translateY(10px) scale(1.08)' }
          : undefined
  const eye = mood === 'recoil' ? '#FFFFFF' : EYE[phase]
  const open = mood === 'roar' || mood === 'strike' || mood === 'loom'

  return (
    <svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      className={frozen ? '' : anim[mood]}
      style={{ overflow: 'visible', ...frozenStyle }}
      aria-hidden
    >
      <defs>
        <linearGradient id="eb-rust" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A9542A" />
          <stop offset="0.55" stopColor="#7A3A1A" />
          <stop offset="1" stopColor="#4A220F" />
        </linearGradient>
        <linearGradient id="eb-iron" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3E3630" />
          <stop offset="1" stopColor="#15110E" />
        </linearGradient>
        <linearGradient id="eb-fire" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#C2210C" />
          <stop offset="0.5" stopColor="#FF7A1A" />
          <stop offset="1" stopColor="#FFD24A" />
        </linearGradient>
        <radialGradient id="eb-core">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.35" stopColor="#FFD24A" />
          <stop offset="0.7" stopColor="#FF3B1A" />
          <stop offset="1" stopColor="#7A0A05" />
        </radialGradient>
        <filter id="eb-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Floating burning pages from phase 2 */}
      {phase >= 2 && mood !== 'shatter' && (
        <g>
          <Page x={30} y={70} r={-18} frozen={frozen} delay={0} />
          <Page x={212} y={60} r={14} frozen={frozen} delay={600} />
          {phase === 3 && (
            <>
              <Page x={18} y={150} r={22} frozen={frozen} delay={300} />
              <Page x={224} y={140} r={-12} frozen={frozen} delay={900} />
              <Page x={120} y={8} r={6} frozen={frozen} delay={1200} />
            </>
          )}
        </g>
      )}

      <Part id="legs" mood={mood} frozen={frozen}>
        <rect x="82" y="182" width="30" height="44" rx="4" fill="url(#eb-rust)" stroke="#2A140A" strokeWidth="2" />
        <rect x="128" y="182" width="30" height="44" rx="4" fill="url(#eb-rust)" stroke="#2A140A" strokeWidth="2" />
        {[70, 118].map((x) => (
          <g key={x}>
            <rect x={x} y="222" width="52" height="11" rx="2" fill="#3A3430" stroke="#120E0B" strokeWidth="1.5" />
            <rect x={x} y="222" width="52" height="3" fill="#8A7F76" />
          </g>
        ))}
      </Part>

      <Part id="armL" mood={mood} frozen={frozen}>
        <path d="M66 100 C44 116 34 140 36 170" fill="none" stroke="#2A140A" strokeWidth="22" strokeLinecap="round" />
        <path
          d="M66 100 C44 116 34 140 36 170"
          fill="none"
          stroke="url(#eb-rust)"
          strokeWidth="17"
          strokeLinecap="round"
        />
        <path d="M66 100 C44 116 34 140 36 170" fill="none" stroke="#3A1C0E" strokeWidth="4" />
        {/* Fist of chained books */}
        <g transform="translate(36 178)">
          <rect x="-16" y="-8" width="32" height="10" rx="1.5" fill="#7A1E14" stroke="#140A05" />
          <rect x="-14" y="2" width="28" height="10" rx="1.5" fill="#2F4A6B" stroke="#140A05" />
          <rect x="-17" y="12" width="34" height="10" rx="1.5" fill="#8A6A2F" stroke="#140A05" />
          <path d="M-18 -2 h36 M-18 16 h36" stroke="#9A9088" strokeWidth="2.4" strokeDasharray="4 2" />
        </g>
        {phase >= 2 && <Flame x={36} y={170} s={0.8} frozen={frozen} delay={200} />}
      </Part>

      <Part id="armR" mood={mood} frozen={frozen}>
        <path
          d="M174 100 C196 116 206 140 204 170"
          fill="none"
          stroke="#2A140A"
          strokeWidth="22"
          strokeLinecap="round"
        />
        <path
          d="M174 100 C196 116 206 140 204 170"
          fill="none"
          stroke="url(#eb-rust)"
          strokeWidth="17"
          strokeLinecap="round"
        />
        <path d="M174 100 C196 116 206 140 204 170" fill="none" stroke="#3A1C0E" strokeWidth="4" />
        {/* Burning tome */}
        <g transform="translate(204 180) rotate(-12)">
          <path d="M-20 -6 L0 -2 L20 -6 L20 12 L0 16 L-20 12 Z" fill="#F4E7C9" stroke="#5A3A1A" strokeWidth="1.5" />
          <path d="M0 -2 V16" stroke="#5A3A1A" strokeWidth="1.5" />
          <path d="M-16 2 h12 M-16 6 h12 M4 2 h12 M4 6 h12" stroke="#8A6A3A" strokeWidth="1" />
        </g>
        <Flame x={204} y={172} s={phase === 1 ? 0.7 : 1.1} frozen={frozen} delay={0} />
      </Part>

      <Part id="torso" mood={mood} frozen={frozen}>
        <rect x="66" y="92" width="108" height="96" rx="6" fill="#2A170C" stroke="#120804" strokeWidth="2" />
        <Shelf y={118} seed={1} />
        <Shelf y={146} seed={4} />
        <Shelf y={174} seed={6} />
        {[118, 146, 174].map((y) => (
          <rect key={y} x="68" y={y} width="104" height="4" fill="#5A3A22" />
        ))}
        {/* Rail frame */}
        {[58, 170].map((x) => (
          <g key={x}>
            <rect x={x} y="86" width="12" height="106" rx="2" fill="url(#eb-rust)" stroke="#2A140A" strokeWidth="1.5" />
            <rect x={x + 1} y="86" width="3" height="106" fill="#D08A55" opacity="0.6" />
            {[96, 130, 164].map((y) => (
              <circle key={y} cx={x + 6} cy={y} r="2" fill="#E0A465" />
            ))}
          </g>
        ))}
        <rect x="58" y="84" width="124" height="10" rx="2" fill="url(#eb-rust)" stroke="#2A140A" strokeWidth="1.5" />
        {phase === 3 && (
          <g>
            <path
              d="M120 112 L108 128 L114 136 L104 152 L120 146 L132 160 L128 140 L138 132 L126 124 Z"
              fill="url(#eb-core)"
              filter="url(#eb-glow)"
            />
            <path
              d="M120 112 L108 128 L114 136 L104 152 M132 160 L128 140 L138 132"
              fill="none"
              stroke="#140A05"
              strokeWidth="1.5"
            />
          </g>
        )}
        {phase >= 2 && (
          <>
            <Flame x={64} y={88} s={phase === 3 ? 1.1 : 0.8} frozen={frozen} delay={300} />
            <Flame x={176} y={88} s={phase === 3 ? 1.1 : 0.8} frozen={frozen} delay={500} />
          </>
        )}
        {phase === 3 && (
          <>
            <Flame x={92} y={118} s={0.7} frozen={frozen} delay={150} />
            <Flame x={152} y={146} s={0.7} frozen={frozen} delay={450} />
          </>
        )}
      </Part>

      <Part id="head" mood={mood} frozen={frozen}>
        <rect x="110" y="78" width="20" height="10" fill="#1E1A17" />
        {/* Crown of bent rails */}
        <g fill="url(#eb-rust)" stroke="#2A140A" strokeWidth="1.5">
          {(phase === 3 ? [-34, -17, 0, 17, 34] : [-26, 0, 26]).map((dx, i) => (
            <path
              key={dx}
              d={`M${120 + dx - 4} 42 L${120 + dx * 1.15} ${phase === 3 ? (i % 2 ? 14 : 6) : 18} L${120 + dx + 4} 42 Z`}
            />
          ))}
        </g>
        {phase === 3 && <Flame x={120} y={12} s={0.9} frozen={frozen} delay={100} />}
        <rect x="84" y="38" width="72" height="46" rx="9" fill="url(#eb-iron)" stroke="#0A0807" strokeWidth="2.5" />
        {/* Open-book visor */}
        <path
          d="M88 44 Q104 38 119 46 L119 52 Q104 45 88 50 Z M152 44 Q136 38 121 46 L121 52 Q136 45 152 50 Z"
          fill="#F4E7C9"
          opacity="0.9"
        />
        <path d="M90 52 L116 58 L116 54 L92 48 Z M150 52 L124 58 L124 54 L148 48 Z" fill="#0A0807" />
        <circle cx="104" cy="62" r="7.5" fill="#2E2925" />
        <circle cx="136" cy="62" r="7.5" fill="#2E2925" />
        <circle cx="104" cy="62" r="5" fill={eye} filter="url(#eb-glow)" />
        <circle cx="136" cy="62" r="5" fill={eye} filter="url(#eb-glow)" />
        {open ? (
          <g>
            <path
              d="M98 70 L142 70 L136 84 L128 77 L120 86 L112 77 L104 84 Z"
              fill="url(#eb-fire)"
              filter="url(#eb-glow)"
            />
            <path d="M102 70 l3 5 3 -5 M116 70 l4 6 4 -6 M132 70 l3 5 3 -5" fill="#0A0807" />
          </g>
        ) : (
          <rect x="104" y="73" width="32" height="6" rx="3" fill={EYE[phase]} opacity="0.9" filter="url(#eb-glow)" />
        )}
      </Part>
    </svg>
  )
}
