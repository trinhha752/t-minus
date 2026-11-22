'use client'

// The Figma design is laid out on a fixed 393×852 phone screen, and every screen
// places its buttons at fixed spots on it. So we never stretch it: we scale it.
// - Desktop (sm+): the canvas sits in a phone bezel, scaled down to fit the window.
// - Phone (<640px): no bezel, no scrolling. The canvas is scaled to fill as much of the
//   real screen as it can (a phone browser is often shorter than 852, so it scales
//   down a little rather than cutting off the bottom buttons). Any spare space is
//   the same cream as the game, so it reads as margin, not a frame.

import { useEffect, useState, type ReactNode } from 'react'

const W = 393
const H = 852
const MOBILE = 640 // Tailwind's sm breakpoint

function useFitScale() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      setScale(
        w < MOBILE
          ? Math.min(w / W, h / H) // fill the phone; may go slightly above 1 on big phones
          : Math.min(1, (h - 32) / H, (w - 32) / W),
      )
    }
    fit()
    window.addEventListener('resize', fit)
    // Phone browsers resize the visible area when their toolbars show or hide.
    window.visualViewport?.addEventListener('resize', fit)
    return () => {
      window.removeEventListener('resize', fit)
      window.visualViewport?.removeEventListener('resize', fit)
    }
  }, [])
  return scale
}

export function PhoneFrame({ children }: { children: ReactNode }) {
  const scale = useFitScale()
  return (
    <main className="fixed inset-0 flex h-dvh w-full items-center justify-center overflow-hidden overscroll-none bg-[#F3F0EA] sm:static sm:min-h-screen sm:bg-transparent">
      <div style={{ width: W * scale, height: H * scale }}>
        <div className="origin-top-left" style={{ transform: `scale(${scale})` }}>
          <div
            className="relative overflow-hidden bg-[#F3F0EA] sm:rounded-[55px] sm:shadow-[0_0_0_10px_#111,0_0_0_12px_#3a3a3a,0_30px_80px_rgba(0,0,0,0.35)]"
            style={{ width: W, height: H }}
          >
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}
