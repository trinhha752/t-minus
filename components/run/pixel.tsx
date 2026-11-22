// Shared pieces of the pixel HUD look (Bag, Collection, Profile, Landmark Match).

import type { ReactNode } from 'react'

/** Cream panel with a thick ink border and a hard drop shadow. */
export const PANEL = 'border-[3px] border-ink bg-[#FBF3DF] shadow-[4px_4px_0_rgba(27,31,36,0.85)]'

/** Numbers use the plain bold font: in the pixel font, 2 and 5 read like 8 and S. */
export const NUM = 'font-sans font-extrabold tabular-nums'

/** Full-screen dark checkerboard background. */
export function PixelScreen({ children }: { children: ReactNode }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#2A3644]"
      style={{
        backgroundImage:
          'linear-gradient(45deg, #26313E 25%, transparent 25%, transparent 75%, #26313E 75%), linear-gradient(45deg, #26313E 25%, transparent 25%, transparent 75%, #26313E 75%)',
        backgroundSize: '24px 24px',
        backgroundPosition: '0 0, 12px 12px',
      }}
    >
      {children}
    </div>
  )
}

/** Small light heading on the dark background. */
export function SectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`font-pixel text-[14px] font-bold tracking-[0.06em] text-[#FBF3DF] ${className}`}>{children}</p>
}
