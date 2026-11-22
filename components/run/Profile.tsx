'use client'

// The Profile tab: the rider's level, gold, streak, stamps, CO2 saved, realm progress and
// badges. Name, team, CO2 and badges come from GET /api/me; gold, streak and stamps from
// the run state (which the map also reads), so the two screens always agree.

import { useEffect, useState } from 'react'
import { Award, Coins, Flame, Leaf, Lock, MapPin, Swords, Trophy } from 'lucide-react'
import { levelFor } from '@/lib/scoring'
import type { Badge, Me } from '@/types'
import { Coin } from './fantasy'
import { PixelSprite } from './MatchGame'
import { NUM, PANEL, PixelScreen, SectionLabel } from './pixel'
import { RIDER } from './pixelSprites'
import { LINES, ROUTES, type LineId } from './stations'
import { RealmIcon, StatusBar } from './ui'

const REALMS: LineId[] = ['red', 'green', 'orange']
/** Points needed to reach a level (inverse of levelFor in lib/scoring). */
const pointsFor = (level: number) => 50 * (level - 1) ** 2

type Profile = Pick<Me, 'name' | 'team' | 'co2SavedKg' | 'badges'>

export function ProfileScreen({ gold, streak, played }: { gold: number; streak: number; played: Set<string> }) {
  const [me, setMe] = useState<Profile | null>(null)
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    let live = true
    fetch('/api/me')
      .then((r) => r.json())
      .then((res) => {
        if (!live) return
        if (res?.ok) setMe(res.data)
        else setOffline(true)
      })
      .catch(() => live && setOffline(true))
    return () => {
      live = false
    }
  }, [])

  const level = levelFor(gold)
  const from = pointsFor(level)
  const to = pointsFor(level + 1)
  const stamped = new Set(Object.values(ROUTES).flat().filter((id) => played.has(id))).size
  const allStations = new Set(Object.values(ROUTES).flat()).size
  const team = me?.team
  const teamLine = team ? (team.toLowerCase() as LineId) : null

  return (
    <PixelScreen>
      <StatusBar tone="light" />
      <div className="absolute inset-x-0 bottom-[90px] top-[56px] overflow-y-auto px-4 pb-4">
        {/* Rider card */}
        <section className={`flex items-center gap-3 p-3 ${PANEL}`} aria-label="Rider">
          <span className="flex h-[64px] w-[64px] shrink-0 items-center justify-center border-[3px] border-ink bg-[#CFE7F5]">
            <PixelSprite sprite={RIDER} scale={6} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-pixel text-[20px] font-bold leading-tight">{me?.name ?? 'Rider'}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
              {teamLine && teamLine in LINES ? (
                <>
                  <span className="h-2.5 w-2.5 border border-ink" style={{ backgroundColor: LINES[teamLine].color }} />
                  Team {team} Line
                </>
              ) : team ? (
                <>Team {team} Line</>
              ) : (
                'T rider'
              )}
            </p>
            {/* Level bar */}
            <div className="mt-1.5 flex items-center gap-2">
              <span className={`border-2 border-ink bg-[#F2B233] px-1.5 text-[12px] leading-[18px] ${NUM}`}>Lv {level}</span>
              <div className="h-2.5 flex-1 border-2 border-ink bg-[#E8DFC8]">
                <div className="h-full bg-[#2F7A4A]" style={{ width: `${Math.min(100, ((gold - from) / (to - from)) * 100)}%` }} />
              </div>
            </div>
            <p className="mt-0.5 text-right text-[10.5px] text-muted">
              <span className={NUM}>{(to - gold).toLocaleString()}</span> gold to level {level + 1}
            </p>
          </div>
        </section>

        {offline && (
          <p className="mt-2 border-2 border-dashed border-[#8C99A8] px-3 py-1.5 text-center font-pixel text-[11.5px] text-[#B9C3CE]">
            Can&apos;t reach the server, so name and badges aren&apos;t loaded.
          </p>
        )}

        {/* Stats */}
        <div className="mt-3 grid grid-cols-2 gap-2.5" aria-label="Stats">
          <Stat icon={<Coin size={22} />} label="Gold" value={gold.toLocaleString()} />
          <Stat icon={<Flame size={20} strokeWidth={2.6} className="fill-[#F97316] text-[#C2410C]" />} label="Day streak" value={streak} />
          <Stat icon={<MapPin size={20} strokeWidth={2.6} className="text-[#DA291C]" />} label="Stations stamped" value={`${stamped}/${allStations}`} />
          <Stat
            icon={<Leaf size={20} strokeWidth={2.6} className="fill-[#7CB652] text-[#2F7A4A]" />}
            label="CO₂ saved"
            value={me ? `${me.co2SavedKg.toFixed(1)} kg` : '–'}
          />
        </div>

        {/* Realms */}
        <SectionLabel className="mb-2 mt-4">Realms</SectionLabel>
        <ul className={`divide-y-2 divide-[#E1D6BC] px-3 ${PANEL}`}>
          {REALMS.map((id) => {
            const l = LINES[id]
            const n = ROUTES[id].filter((s) => played.has(s)).length
            const all = ROUTES[id].length
            return (
              <li key={id} className="flex items-center gap-2.5 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink text-white" style={{ backgroundColor: l.color }}>
                  <RealmIcon line={id} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline justify-between">
                    <span className="font-pixel text-[14px] font-bold">{l.realm}</span>
                    <span className={`text-[12px] text-muted ${NUM}`}>
                      {n}/{all}
                    </span>
                  </p>
                  <div className="mt-1 h-2 border border-ink bg-[#E8DFC8]">
                    <div className="h-full" style={{ width: `${(n / all) * 100}%`, backgroundColor: l.color }} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        {/* Badges */}
        <SectionLabel className="mb-2 mt-4">Badges</SectionLabel>
        <Badges badges={me?.badges ?? []} gold={gold} stamped={stamped} streak={streak} played={played} />
      </div>
    </PixelScreen>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 border-[3px] border-ink bg-[#FBF3DF] px-3 py-2.5 shadow-[3px_3px_0_rgba(15,19,24,0.7)]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center">{icon}</span>
      <div className="min-w-0">
        <p className={`text-[19px] leading-none ${NUM}`}>{value}</p>
        <p className="mt-1 truncate font-pixel text-[11px] leading-none text-muted">{label}</p>
      </div>
    </div>
  )
}

/** Goals everyone works toward; earned ones light up. Server badges are listed after them. */
function Badges({
  badges,
  gold,
  stamped,
  streak,
  played,
}: {
  badges: Badge[]
  gold: number
  stamped: number
  streak: number
  played: Set<string>
}) {
  const lineDone = REALMS.some((id) => ROUTES[id].every((s) => played.has(s)))
  const has = (type: Badge['type']) => badges.some((b) => b.type === type)
  const goals = [
    { key: 'first', label: 'First stamp', hint: 'Stamp any station', icon: <MapPin size={20} strokeWidth={2.6} />, earned: stamped >= 1, color: '#DA291C' },
    { key: 'ten', label: 'Explorer', hint: 'Stamp 10 stations', icon: <Award size={20} strokeWidth={2.6} />, earned: stamped >= 10, color: '#2F6FD1' },
    { key: 'streak', label: 'On a roll', hint: '3-day streak', icon: <Flame size={20} strokeWidth={2.6} />, earned: streak >= 3, color: '#F97316' },
    { key: 'line', label: 'Line master', hint: 'Finish a whole line', icon: <Trophy size={20} strokeWidth={2.6} />, earned: lineDone || has('line'), color: '#C99A3B' },
    { key: 'boss', label: 'Boss slayer', hint: 'Beat a boss', icon: <Swords size={20} strokeWidth={2.6} />, earned: has('boss'), color: '#7B3FC4' },
    { key: 'rich', label: 'Gold hoard', hint: 'Earn 1,000 gold', icon: <Coins size={20} strokeWidth={2.6} />, earned: gold >= 1000, color: '#B8862B' },
  ]
  return (
    <>
      <ul className="grid grid-cols-3 gap-2.5">
        {goals.map((g) => (
          <li
            key={g.key}
            className="flex flex-col items-center border-[3px] border-ink px-1 py-2 text-center shadow-[3px_3px_0_rgba(15,19,24,0.7)]"
            style={{ backgroundColor: g.earned ? '#FBF3DF' : '#222C37' }}
            aria-label={`${g.label}: ${g.earned ? 'earned' : `locked, ${g.hint}`}`}
          >
            <span
              className="flex h-10 w-10 items-center justify-center border-2 border-ink"
              style={{ backgroundColor: g.earned ? g.color : '#3A4756', color: g.earned ? '#fff' : '#8C99A8' }}
            >
              {g.earned ? g.icon : <Lock size={16} strokeWidth={2.8} />}
            </span>
            <span className={`mt-1.5 font-pixel text-[11.5px] font-bold leading-tight ${g.earned ? 'text-ink' : 'text-[#B9C3CE]'}`}>{g.label}</span>
            <span className={`text-[10px] leading-tight ${g.earned ? 'text-muted' : 'text-[#6E7B8A]'}`}>{g.hint}</span>
          </li>
        ))}
      </ul>
      {badges.length > 0 && (
        <ul className={`mt-2.5 divide-y-2 divide-[#E1D6BC] px-3 ${PANEL}`}>
          {badges.map((b) => (
            <li key={`${b.type}-${b.label}-${b.earnedAt}`} className="flex items-center justify-between py-2 text-[13px]">
              <span className="font-semibold">{b.label}</span>
              <span className="text-[11px] text-muted">{new Date(b.earnedAt).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
