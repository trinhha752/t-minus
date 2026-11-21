'use client'

// The Figma design is laid out on a fixed 393×852 phone screen.
// This frame scales it to fit the window so every screen keeps its layout.

import { useEffect, useState, type ReactNode } from 'react'

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
  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden">
      <div style={{ width: W * scale, height: H * scale }}>
        <div className="origin-top-left" style={{ transform: `scale(${scale})` }}>
          <div
            className="relative overflow-hidden rounded-[55px] bg-[#F3F0EA] shadow-[0_0_0_10px_#111,0_0_0_12px_#3a3a3a,0_30px_80px_rgba(0,0,0,0.35)]"
            style={{ width: W, height: H }}
          >
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}
