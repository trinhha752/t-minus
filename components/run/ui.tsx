'use client'

import type { ReactNode } from 'react'
import {
  BatteryFull,
  BookOpen,
  Lock,
  Map as MapIcon,
  Pickaxe,
  Signal,
  Sparkles,
  User,
  Wifi,
  Layers,
  Backpack,
} from 'lucide-react'
import { LINES, type LineId, type Station } from './stations'
import { HARVARD_PHOTOS } from './harvardPhotos'

export function StatusBar({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const color = tone === 'dark' ? 'text-ink' : 'text-white'
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 z-50 flex h-[54px] items-center justify-between px-8 pt-1 ${color}`}
      aria-hidden
    >
      <span className="w-14 text-[16px] font-semibold tracking-tight">9:41</span>
      <span className="h-[34px] w-[124px] rounded-full bg-black" />
      <span className="flex w-14 items-center justify-end gap-1">
        <Signal size={16} strokeWidth={2.6} />
        <Wifi size={16} strokeWidth={2.6} />
        <BatteryFull size={22} strokeWidth={2} />
      </span>
    </div>
  )
}

export function HomeIndicator({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-2 z-50 flex justify-center" aria-hidden>
      <span className={`h-[5px] w-[134px] rounded-full ${tone === 'dark' ? 'bg-ink' : 'bg-white'}`} />
    </div>
  )
}

export function RealmIcon({ line, size = 16 }: { line: LineId; size?: number }) {
  return line === 'red' ? (
    <BookOpen size={size} strokeWidth={2.4} aria-hidden />
  ) : (
    <Pickaxe size={size} strokeWidth={2.4} aria-hidden />
  )
}

/** Line badge: color is always paired with a text label and route stripe. */
export function LineBadge({ line, size = 'md' }: { line: LineId; size?: 'sm' | 'md' }) {
  const l = LINES[line]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold text-white ${
        size === 'sm' ? 'h-6 px-2.5 text-[12px]' : 'h-8 px-3 text-[13px]'
      }`}
      style={{ backgroundColor: l.color }}
    >
      <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full border-2 border-white">
        <span className="h-1 w-1 rounded-full bg-white" />
      </span>
      {l.name}
    </span>
  )
}

export function FactArt({ station, className = '' }: { station: Station; className?: string }) {
  if (station.id === 'harvard') {
    return <img src={HARVARD_PHOTOS.statue.src} alt="" className={`h-full w-full object-cover object-top ${className}`} />
  }
  const l = LINES[station.lines[0]]
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={{
        background: `radial-gradient(circle at 30% 20%, ${l.color}55, transparent 60%), linear-gradient(160deg, ${l.dark}, #1b1f24)`,
      }}
    >
      <span className="text-white/90">
        <RealmIcon line={station.lines[0]} size={28} />
      </span>
    </div>
  )
}

/** Small collectible preview — locked shows a lock over blurred art. */
export function MiniFactCard({
  station,
  locked,
  className = '',
}: {
  station: Station
  locked?: boolean
  className?: string
}) {
  const l = LINES[station.lines[0]]
  return (
    <div
      className={`relative h-[92px] w-[68px] shrink-0 overflow-hidden rounded-[12px] border-[3px] bg-white shadow-[0_6px_16px_rgba(27,31,36,0.22)] ${className}`}
      style={{ borderColor: '#F2B233' }}
      aria-hidden
    >
      <div className="h-[62px] overflow-hidden">
        <FactArt station={station} className={locked ? 'scale-110 blur-[3px] brightness-75' : ''} />
      </div>
      <div className="flex h-[24px] items-center justify-center gap-1 text-[10px] font-bold" style={{ color: l.dark }}>
        <Sparkles size={10} strokeWidth={2.6} />
        No. {String(station.fact.no).padStart(2, '0')}
      </div>
      {locked && (
        <div className="absolute inset-x-0 top-0 flex h-[62px] items-center justify-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-ink shadow">
            <Lock size={15} strokeWidth={2.6} />
          </span>
        </div>
      )}
    </div>
  )
}

export type Tab = 'map' | 'bag' | 'collection' | 'profile'

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const items: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'map', label: 'Map', icon: <MapIcon size={22} strokeWidth={2.3} /> },
    { id: 'bag', label: 'Bag', icon: <Backpack size={22} strokeWidth={2.3} /> },
    { id: 'collection', label: 'Collection', icon: <Layers size={22} strokeWidth={2.3} /> },
    { id: 'profile', label: 'Profile', icon: <User size={22} strokeWidth={2.3} /> },
  ]
  return (
    <nav
      className="absolute inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/90 px-4 pb-[26px] pt-2 backdrop-blur-xl"
      aria-label="Main"
    >
      <ul className="flex justify-around">
        {items.map((it) => {
          const active = it.id === tab
          return (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onChange(it.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex h-[52px] min-w-[76px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-colors ${
                  active ? 'text-ink' : 'text-muted'
                }`}
              >
                <span
                  className={`flex h-7 w-14 items-center justify-center rounded-full transition-colors ${
                    active ? 'bg-ink text-white' : ''
                  }`}
                >
                  {it.icon}
                </span>
                {it.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
