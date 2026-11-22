'use client'

// The Figma design is laid out on a fixed 393×852 phone screen.
// On desktop (sm+), this frame scales it to fit the window so every screen keeps its layout.
// On mobile (<640px), it renders full-screen and locked to the viewport height.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

const W = 393
const H = 852

function useFitScale(reserve = 32) {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - reserve) / H, (window.innerWidth - 32) / W))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [reserve])
  return scale
}

export function PhoneFrame({ children }: { children: ReactNode }) {
  const scale = useFitScale()

  const frameVars = {
    '--frame-w': `${W}px`,
    '--frame-h': `${H}px`,
    '--scaled-w': `${W * scale}px`,
    '--scaled-h': `${H * scale}px`,
    '--frame-scale': scale,
  } as CSSProperties

  return (
    <main
      style={frameVars}
      className="fixed inset-0 h-dvh w-full overflow-hidden overscroll-none bg-[#F3F0EA] sm:static sm:flex sm:min-h-screen sm:items-center sm:justify-center sm:bg-transparent"
    >
      <div className="h-full w-full sm:h-[var(--scaled-h)] sm:w-[var(--scaled-w)]">
        <div className="h-full origin-top-left sm:h-auto sm:[transform:scale(var(--frame-scale))]">
          <div className="relative h-full w-full overflow-hidden bg-[#F3F0EA] sm:h-[var(--frame-h)] sm:w-[var(--frame-w)] sm:rounded-[55px] sm:shadow-[0_0_0_10px_#111,0_0_0_12px_#3a3a3a,0_30px_80px_rgba(0,0,0,0.35)]">
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}