import type { CSSProperties, ReactNode } from 'react'

export type BossMood = 'idle' | 'recoil' | 'laugh' | 'shatter' | 'retreat'

/** Scatter vectors for each body part when the golem shatters. */
const SHARDS: Record<string, { dx: number; dy: number; r: number }> = {
  head: { dx: 10, dy: -70, r: -40 },
  torso: { dx: 0, dy: 30, r: 12 },
  armL: { dx: -80, dy: -10, r: -70 },
  armR: { dx: 85, dy: -20, r: 80 },
  legs: { dx: 0, dy: 60, r: -8 },
}

function Part({
  id,
  mood,
  frozen,
  children,
}: {
  id: keyof typeof SHARDS
  mood: BossMood
  frozen: boolean
  children: ReactNode
}) {
  if (mood !== 'shatter') return <g>{children}</g>
  const s = SHARDS[id]
  const style: CSSProperties = frozen
    ? {
        transform: `translate(${s.dx * 0.55}px, ${s.dy * 0.55}px) rotate(${s.r * 0.55}deg)`,
        opacity: 0.85,
        transformBox: 'fill-box',
        transformOrigin: 'center',
      }
    : ({
        '--dx': `${s.dx}px`,
        '--dy': `${s.dy}px`,
        '--r': `${s.r}deg`,
        transformBox: 'fill-box',
        transformOrigin: 'center',
      } as CSSProperties)
  return (
    <g className={frozen ? '' : 'animate-shard'} style={style}>
      {children}
    </g>
  )
}

/**
 * Signal golem: a rusted signal mast come alive, with lamp eyes, a crossbuck
 * on its chest, a semaphore-blade arm and a fistful of sparking overhead wire.
 */
export function BossArt({ mood, frozen = false, size = 190 }: { mood: BossMood; frozen?: boolean; size?: number }) {
  const motion = frozen
    ? ''
    : mood === 'idle'
      ? 'animate-boss-idle'
      : mood === 'recoil'
        ? 'animate-recoil'
        : mood === 'laugh'
          ? 'animate-laugh'
          : mood === 'retreat'
            ? 'animate-retreat'
            : ''
  const frozenStyle: CSSProperties | undefined =
    frozen && mood === 'retreat'
      ? { transform: 'translate(-6px,-18px) scale(0.42)', opacity: 0.5 }
      : frozen && mood === 'recoil'
        ? { transform: 'translateX(12px) rotate(6deg)', filter: 'brightness(1.7)' }
        : frozen && mood === 'laugh'
          ? { transform: 'rotate(-4deg) translateY(-3px)' }
          : undefined
  const eyeColor = mood === 'recoil' ? '#FFF6D0' : '#FF3B2E'

  return (
    <svg
      viewBox="0 0 200 210"
      width={size}
      height={size * 1.05}
      className={motion}
      style={{ overflow: 'visible', ...frozenStyle }}
      aria-hidden
    >
      <defs>
        <linearGradient id="rust" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A9542A" />
          <stop offset="0.55" stopColor="#7A3A1A" />
          <stop offset="1" stopColor="#4A220F" />
        </linearGradient>
        <linearGradient id="iron" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A332E" />
          <stop offset="1" stopColor="#15110E" />
        </linearGradient>
        <filter id="lamp-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="fog" x="-30%" y="-100%" width="160%" height="300%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* Tunnel fog */}
      {mood !== 'shatter' && (
        <g filter="url(#fog)" opacity="0.55">
          <ellipse cx="100" cy="198" rx="92" ry="14" fill="#8FA8A3" />
          <ellipse cx="60" cy="188" rx="40" ry="10" fill="#B7C9C4" />
          <ellipse cx="146" cy="190" rx="38" ry="9" fill="#B7C9C4" />
        </g>
      )}

      <Part id="legs" mood={mood} frozen={frozen}>
        <rect x="64" y="148" width="26" height="44" rx="4" fill="url(#rust)" stroke="#2A140A" strokeWidth="2" />
        <rect x="110" y="148" width="26" height="44" rx="4" fill="url(#rust)" stroke="#2A140A" strokeWidth="2" />
        <rect x="54" y="188" width="44" height="9" rx="2" fill="#3A3430" stroke="#120E0B" strokeWidth="1.5" />
        <rect x="102" y="188" width="44" height="9" rx="2" fill="#3A3430" stroke="#120E0B" strokeWidth="1.5" />
        <path d="M70 162 h14 M116 170 h14" stroke="#C2662E" strokeWidth="3" opacity="0.7" />
      </Part>

      <Part id="armL" mood={mood} frozen={frozen}>
        <path d="M60 88 C42 100 34 120 36 146" fill="none" stroke="#2A140A" strokeWidth="20" strokeLinecap="round" />
        <path d="M60 88 C42 100 34 120 36 146" fill="none" stroke="url(#rust)" strokeWidth="15" strokeLinecap="round" />
        {/* Semaphore blade */}
        <g transform="translate(36 146) rotate(18)">
          <rect x="-8" y="-2" width="16" height="48" rx="3" fill="#F2EDE2" stroke="#1A1411" strokeWidth="2" />
          <rect x="-8" y="8" width="16" height="9" fill="#DA291C" />
          <rect x="-8" y="27" width="16" height="9" fill="#DA291C" />
        </g>
      </Part>

      <Part id="armR" mood={mood} frozen={frozen}>
        <path d="M140 88 C160 98 168 118 164 142" fill="none" stroke="#2A140A" strokeWidth="20" strokeLinecap="round" />
        <path
          d="M140 88 C160 98 168 118 164 142"
          fill="none"
          stroke="url(#rust)"
          strokeWidth="15"
          strokeLinecap="round"
        />
        <circle cx="164" cy="146" r="10" fill="#4A220F" stroke="#2A140A" strokeWidth="2" />
        {/* Sparking overhead wires */}
        <g fill="none" strokeLinecap="round">
          <path d="M160 152 C150 166 172 172 160 188" stroke="#1A1411" strokeWidth="3" />
          <path d="M166 153 C180 166 166 178 182 192" stroke="#1A1411" strokeWidth="3" />
          <path d="M170 150 C190 156 186 170 196 176" stroke="#1A1411" strokeWidth="3" />
        </g>
        <g
          fill="#FFE15A"
          className={frozen ? '' : 'animate-twinkle'}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <path d="M160 188 l4 -9 2 6 5 -8 -2 12 -3 -5z" />
          <path d="M196 176 l-3 -8 6 3 1 -7 3 11 -5 -3z" />
        </g>
        <g
          fill="#FFF6B0"
          className={frozen ? '' : 'animate-twinkle [animation-delay:700ms]'}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <path d="M182 192 l3 -7 2 4 4 -6 -1 10 -3 -3z" />
        </g>
      </Part>

      <Part id="torso" mood={mood} frozen={frozen}>
        <path d="M58 82 L142 82 L134 156 L66 156 Z" fill="url(#rust)" stroke="#2A140A" strokeWidth="2.5" />
        <path d="M70 92 C76 104 66 112 74 120" stroke="#C2662E" strokeWidth="5" opacity="0.5" fill="none" />
        <path d="M128 126 C122 134 132 142 124 150" stroke="#C2662E" strokeWidth="5" opacity="0.5" fill="none" />
        <rect x="78" y="96" width="44" height="44" rx="5" fill="#3A1C0E" stroke="#1E0E06" strokeWidth="2" />
        {/* Crossbuck */}
        <g transform="translate(100 118)">
          <g transform="rotate(35)">
            <rect x="-20" y="-4.5" width="40" height="9" rx="1.5" fill="#F2EDE2" stroke="#1A1411" strokeWidth="1.2" />
          </g>
          <g transform="rotate(-35)">
            <rect x="-20" y="-4.5" width="40" height="9" rx="1.5" fill="#F2EDE2" stroke="#1A1411" strokeWidth="1.2" />
          </g>
          <circle r="3.5" fill="#DA291C" filter="url(#lamp-glow)" />
        </g>
        {[
          [64, 88],
          [136, 88],
          [70, 150],
          [130, 150],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.4" fill="#E0A465" stroke="#5A2A12" strokeWidth="0.8" />
        ))}
        {/* Insulator shoulders */}
        <circle cx="58" cy="86" r="11" fill="#4E9C88" stroke="#1E3E36" strokeWidth="2" />
        <circle cx="142" cy="86" r="11" fill="#4E9C88" stroke="#1E3E36" strokeWidth="2" />
        <circle cx="55" cy="83" r="3" fill="#BFF0E2" opacity="0.7" />
        <circle cx="139" cy="83" r="3" fill="#BFF0E2" opacity="0.7" />
      </Part>

      <Part id="head" mood={mood} frozen={frozen}>
        <rect x="92" y="70" width="16" height="14" fill="#1E1A17" />
        <rect x="98" y="8" width="4" height="20" fill="#2B2622" />
        <circle cx="100" cy="8" r="5" fill="#FFB020" filter="url(#lamp-glow)" />
        <rect x="68" y="24" width="64" height="52" rx="11" fill="url(#iron)" stroke="#0A0807" strokeWidth="2.5" />
        {/* Angry visor hoods */}
        <path d="M72 33 L99 41 L99 35 L75 27 Z" fill="#0A0807" />
        <path d="M128 33 L101 41 L101 35 L125 27 Z" fill="#0A0807" />
        {mood === 'recoil' ? (
          <g stroke={eyeColor} strokeWidth="3.5" strokeLinecap="round" fill="none" filter="url(#lamp-glow)">
            <path d="M80 42 l9 5 -9 5" />
            <path d="M120 42 l-9 5 9 5" />
          </g>
        ) : (
          <g>
            <circle cx="86" cy="48" r="10" fill="#2E2925" />
            <circle cx="114" cy="48" r="10" fill="#2E2925" />
            <circle cx="86" cy="48" r="6.5" fill={eyeColor} filter="url(#lamp-glow)" />
            <circle cx="114" cy="48" r="6.5" fill={eyeColor} filter="url(#lamp-glow)" />
            <circle cx="84" cy="46" r="1.8" fill="#FFD9D2" />
            <circle cx="112" cy="46" r="1.8" fill="#FFD9D2" />
          </g>
        )}
        {mood === 'laugh' ? (
          <g>
            <path d="M82 60 L118 60 L113 72 L107 66 L100 74 L93 66 L87 72 Z" fill="#FFB020" filter="url(#lamp-glow)" />
            <path d="M86 60 l3 5 3 -5 M96 60 l4 6 4 -6 M108 60 l3 5 3 -5" fill="#0A0807" />
          </g>
        ) : mood === 'recoil' ? (
          <ellipse cx="100" cy="65" rx="7" ry="5" fill="#FFB020" />
        ) : (
          <rect x="86" y="61" width="28" height="6" rx="3" fill="#FFB020" opacity="0.85" filter="url(#lamp-glow)" />
        )}
      </Part>
    </svg>
  )
}
