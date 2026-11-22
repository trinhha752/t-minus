'use client'

// The Collection tab: one fact card per station, in three albums (one per line, called
// realms in the game). A card is collected once the station is stamped (checked in or its
// game cleared). Collected cards show the landmark photo; tap one for its fact and legend.

import { useState } from 'react'
import { Lock, X } from 'lucide-react'
import { LANDMARK_INFO } from './landmarks'
import { PixelSprite } from './MatchGame'
import { NUM, PANEL, PixelScreen, SectionLabel } from './pixel'
import { LANDMARKS, STATION, type Sprite } from './pixelSprites'
import { LINES, ROUTES, stationById, type LineId, type Station } from './stations'
import { StatusBar } from './ui'

const REALMS: LineId[] = ['red', 'green', 'orange']

/** The sprite drawn all in one dark color: a locked card's silhouette. */
const silhouette = (sp: Sprite): Sprite => {
  const chars = new Set(sp.rows.join('').replace(/\./g, ''))
  return { rows: sp.rows, pal: Object.fromEntries([...chars].map((c) => [c, '#3A4756'])) }
}

export function Collection({ played }: { played: Set<string> }) {
  const [realm, setRealm] = useState<LineId>('red')
  const [open, setOpen] = useState<{ station: Station; no: number } | null>(null)
  const total = new Set(Object.values(ROUTES).flat()).size
  const got = new Set(Object.values(ROUTES).flat().filter((id) => played.has(id))).size
  const ids = ROUTES[realm]
  const line = LINES[realm]
  const have = ids.filter((id) => played.has(id)).length

  return (
    <PixelScreen>
      <StatusBar tone="light" />

      <header className={`absolute inset-x-4 top-[56px] flex h-[52px] items-center justify-between px-3 ${PANEL}`}>
        <h1 className="font-pixel text-[22px] font-bold leading-none">Collection</h1>
        <p className="text-[13px] font-semibold text-ink-soft">
          <span className={`${NUM} text-[16px] text-ink`}>{got}</span> / <span className={NUM}>{total}</span> cards
        </p>
      </header>

      {/* Realm switch */}
      <div className="absolute inset-x-4 top-[120px] grid grid-cols-3 gap-2" role="tablist" aria-label="Realm">
        {REALMS.map((id) => {
          const l = LINES[id]
          const n = ROUTES[id].filter((s) => played.has(s)).length
          const on = id === realm
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setRealm(id)}
              className="flex h-[50px] flex-col items-center justify-center border-[3px] border-ink leading-none shadow-[3px_3px_0_rgba(15,19,24,0.7)]"
              style={{ backgroundColor: on ? l.color : '#FBF3DF', color: on ? '#fff' : '#1B1F24' }}
            >
              <span className="font-pixel text-[12.5px] font-bold">{l.realm}</span>
              <span className={`mt-1 text-[12px] ${NUM}`}>
                {n}/{ROUTES[id].length}
              </span>
            </button>
          )
        })}
      </div>

      {/* Album progress */}
      <div className="absolute inset-x-4 top-[182px] flex items-center gap-2.5">
        <div className="h-3 flex-1 border-2 border-ink bg-[#222C37]">
          <div className="h-full transition-[width] duration-500" style={{ width: `${(have / ids.length) * 100}%`, backgroundColor: line.color }} />
        </div>
        <span className={`text-[12px] text-[#FBF3DF] ${NUM}`}>{Math.round((have / ids.length) * 100)}%</span>
      </div>

      <div className="absolute inset-x-0 bottom-[90px] top-[206px] overflow-y-auto px-4 pb-4">
        <SectionLabel className="mb-2">{line.name} · fact cards</SectionLabel>
        <ul className="grid grid-cols-3 gap-2.5">
          {ids.map((id, i) => {
            const s = stationById(id)
            return (
              <li key={id}>
                <Card station={s} no={i + 1} line={realm} collected={played.has(id)} onOpen={() => setOpen({ station: s, no: i + 1 })} />
              </li>
            )
          })}
        </ul>
      </div>

      {open && (
        <CardDetail
          station={open.station}
          no={open.no}
          line={realm}
          collected={played.has(open.station.id)}
          onClose={() => setOpen(null)}
        />
      )}
    </PixelScreen>
  )
}

function Card({
  station,
  no,
  line,
  collected,
  onOpen,
}: {
  station: Station
  no: number
  line: LineId
  collected: boolean
  onOpen: () => void
}) {
  const l = LINES[line]
  const photo = LANDMARK_INFO[station.id]?.photo
  const sprite = LANDMARKS[station.id] ?? STATION
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={collected ? `${station.fact.title}, ${station.name}, card ${no}` : `Locked card ${no}, ${station.name}`}
      className="flex w-full flex-col border-[3px] border-ink text-left shadow-[3px_3px_0_rgba(15,19,24,0.7)] active:translate-x-[1px] active:translate-y-[1px]"
      style={{ backgroundColor: collected ? '#FBF3DF' : '#222C37' }}
    >
      <span className="flex h-[18px] items-center justify-between px-1" style={{ backgroundColor: collected ? l.color : '#3A4756' }}>
        <span className={`text-[10px] text-white ${NUM}`}>No. {String(no).padStart(2, '0')}</span>
        {!collected && <Lock size={10} strokeWidth={3} className="text-[#B9C3CE]" />}
      </span>
      <span className="relative flex h-[74px] items-center justify-center overflow-hidden border-y-2 border-ink">
        {collected && photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- small local photos, no optimizer needed
          <img src={photo.src} alt="" className="h-full w-full object-cover" />
        ) : collected ? (
          <span className="flex h-full w-full items-end justify-center bg-[#CFE7F5] pb-1">
            <PixelSprite sprite={sprite} scale={3} extra={{ R: l.color, r: l.dark }} />
          </span>
        ) : (
          <PixelSprite sprite={silhouette(sprite)} scale={3} />
        )}
      </span>
      <span className="flex min-h-[40px] flex-col justify-center px-1.5 py-1">
        <span className={`truncate font-pixel text-[11.5px] font-bold leading-tight ${collected ? 'text-ink' : 'text-[#8C99A8]'}`}>
          {collected ? station.fact.title : '???'}
        </span>
        <span className={`truncate text-[10px] leading-tight ${collected ? 'text-muted' : 'text-[#5E6B7A]'}`}>{station.name}</span>
      </span>
    </button>
  )
}

function CardDetail({
  station,
  no,
  line,
  collected,
  onClose,
}: {
  station: Station
  no: number
  line: LineId
  collected: boolean
  onClose: () => void
}) {
  const l = LINES[line]
  const info = LANDMARK_INFO[station.id]
  const sprite = LANDMARKS[station.id] ?? STATION
  return (
    <div className="absolute inset-0 z-40 flex animate-fade-in items-center justify-center bg-[#0F1318]/75 px-5" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-title"
        className={`relative w-full animate-pop ${PANEL}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-[30px] items-center justify-between pl-3 pr-10" style={{ backgroundColor: collected ? l.color : '#3A4756' }}>
          <span className="font-pixel text-[13px] font-bold text-white">{l.realm}</span>
          <span className={`text-[12px] text-white ${NUM}`}>No. {String(no).padStart(2, '0')}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center border-[3px] border-ink bg-[#FBF3DF]"
        >
          <X size={18} strokeWidth={3} />
        </button>

        <div className="p-3.5">
          {collected ? (
            <>
              {info ? (
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element -- small local photos, no optimizer needed */}
                  <img src={info.photo.src} alt={info.name} className="h-[150px] w-full border-[3px] border-ink object-cover" />
                  <figcaption className="mt-0.5 truncate text-right text-[9.5px] text-muted">{info.photo.credit}</figcaption>
                </figure>
              ) : (
                <div className="flex h-[150px] items-end justify-center border-[3px] border-ink bg-[#CFE7F5] pb-2">
                  <PixelSprite sprite={sprite} scale={6} extra={{ R: l.color, r: l.dark }} />
                </div>
              )}
              <h2 id="card-title" className="mt-2 font-pixel text-[22px] font-bold leading-tight">
                {station.fact.title}
              </h2>
              <p className="text-[12.5px] font-semibold text-muted">{station.name}</p>
              {info && (
                <div className="mt-2.5">
                  <p className="font-pixel text-[13px] font-bold">{info.name}</p>
                  <p className="mt-0.5 text-[13.5px] leading-snug text-ink-soft">{info.fact}</p>
                </div>
              )}
              <div className="mt-2.5 border-l-4 bg-[#F1E7CF] px-2.5 py-2" style={{ borderColor: l.color }}>
                <p className="font-pixel text-[11px] font-bold tracking-[0.08em] text-muted">LOCAL LEGEND</p>
                <p className="mt-0.5 text-[13px] leading-snug">{station.story}</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-[150px] items-center justify-center border-[3px] border-ink bg-[#222C37]">
                <PixelSprite sprite={silhouette(sprite)} scale={6} />
              </div>
              <h2 id="card-title" className="mt-2 font-pixel text-[22px] font-bold leading-tight">
                ???
              </h2>
              <p className="text-[12.5px] font-semibold text-muted">{station.name}</p>
              <p className="mt-2.5 flex items-center gap-2 border-[3px] border-dashed border-[#8C99A8] px-3 py-2.5 text-[13.5px] leading-snug">
                <Lock size={16} strokeWidth={2.6} className="shrink-0 text-muted" />
                Ride to {station.name} and play its game to collect this card.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
