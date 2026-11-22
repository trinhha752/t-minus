'use client'

// The Bag tab, pixel style. Two views behind a Bag / Shop switch:
//   Bag:  fight stats, three battle-loadout slots, the rider's items, and a detail panel to
//         equip or unequip the selected item.
//   Shop: the Station Shop's stock with gold prices; buy from the detail panel.
// Equipped items will power the boss fights once the bosses read the loadout (see items.ts).
//
// Numbers use the plain bold font: in the pixel font, 2 and 5 read like 8 and S.

import { useState } from 'react'
import { Backpack, Coins, Heart, Lock, Store, Swords, Zap } from 'lucide-react'
import { Coin } from './fantasy'
import { LOADOUT_SLOTS, RARITY, SHOP, itemById, loadoutStats, type Item } from './items'
import { PixelSprite } from './MatchGame'
import { StatusBar } from './ui'

// Same pixel HUD look as the map and Landmark Match.
const PANEL = 'border-[3px] border-ink bg-[#FBF3DF] shadow-[4px_4px_0_rgba(27,31,36,0.85)]'
const NUM = 'font-sans font-extrabold tabular-nums'
const ROMAN = ['I', 'II', 'III']
const BAG_CELLS = 15 // 5 x 3

type View = 'bag' | 'shop'

export function Inventory({
  gold,
  owned,
  equipped,
  onEquip,
  onUnequip,
  onBuy,
}: {
  gold: number
  owned: string[]
  equipped: (string | null)[]
  onEquip: (id: string) => boolean
  onUnequip: (id: string) => void
  onBuy: (id: string) => boolean
}) {
  const [view, setView] = useState<View>('bag')
  const [selected, setSelected] = useState<Record<View, string | null>>(() => ({
    bag: equipped.find(Boolean) ?? owned[0] ?? null,
    shop: SHOP[0]?.id ?? null,
  }))
  const [note, setNote] = useState<{ text: string; good?: boolean } | null>(null)
  const pick = (id: string) => {
    setSelected((s) => ({ ...s, [view]: id }))
    setNote(null)
  }
  const current = selected[view] ? itemById(selected[view]!) : undefined

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
      <StatusBar tone="light" />

      {/* Header: Bag / Shop switch and gold */}
      <header className={`absolute inset-x-4 top-[56px] flex h-[52px] items-center justify-between pl-1.5 pr-2 ${PANEL}`}>
        <div className="flex gap-1.5" role="tablist" aria-label="Bag or shop">
          {(
            [
              ['bag', 'Bag', <Backpack key="b" size={16} strokeWidth={2.6} />],
              ['shop', 'Shop', <Store key="s" size={16} strokeWidth={2.6} />],
            ] as const
          ).map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => {
                setView(id)
                setNote(null)
              }}
              className={`flex h-9 items-center gap-1.5 border-2 border-ink px-3 font-pixel text-[17px] font-bold ${
                view === id ? 'bg-ink text-[#FBF3DF]' : 'bg-[#F1E7CF] text-ink'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
        <div
          className="flex h-9 items-center gap-1.5 border-2 border-ink bg-[#FFE7A3] pl-1.5 pr-2.5"
          aria-label={`${gold.toLocaleString()} gold`}
          aria-live="polite"
        >
          <Coin size={18} />
          <span className={`${NUM} text-[16px] text-[#7A4D0E]`}>{gold.toLocaleString()}</span>
        </div>
      </header>

      {view === 'bag' ? (
        <BagView owned={owned} equipped={equipped} selected={selected.bag} onPick={pick} />
      ) : (
        <ShopView gold={gold} owned={owned} selected={selected.shop} onPick={pick} />
      )}

      {current && (
        <Detail
          key={`${view}-${current.id}`}
          item={current}
          view={view}
          gold={gold}
          owned={owned.includes(current.id)}
          equipped={equipped.includes(current.id)}
          note={note}
          onEquip={() => {
            if (!onEquip(current.id)) setNote({ text: 'Loadout is full. Unequip an item first.' })
            else setNote(null)
          }}
          onUnequip={() => onUnequip(current.id)}
          onBuy={() => {
            if (onBuy(current.id)) setNote({ text: 'Added to your Bag!', good: true })
          }}
        />
      )}
    </div>
  )
}

// ---------- Bag ----------

function BagView({
  owned,
  equipped,
  selected,
  onPick,
}: {
  owned: string[]
  equipped: (string | null)[]
  selected: string | null
  onPick: (id: string) => void
}) {
  const stats = loadoutStats(equipped, owned)
  const items = owned.map(itemById).filter((i): i is Item => !!i)
  return (
    <>
      {/* Fight stats from the loadout */}
      <div className="absolute inset-x-4 top-[120px] grid grid-cols-4 gap-2" aria-label="Boss fight stats">
        <Stat icon={<Heart size={14} strokeWidth={3} className="fill-[#E5484D] text-[#E5484D]" />} label="Hearts" value={stats.hearts} />
        <Stat icon={<Swords size={14} strokeWidth={2.8} />} label="Damage" value={stats.damage} />
        <Stat icon={<Zap size={14} strokeWidth={2.8} className="fill-[#F2B233] text-[#B8862B]" />} label="Combo" value={`×${stats.combo}`} />
        <Stat icon={<Coins size={14} strokeWidth={2.8} className="text-[#B8862B]" />} label="Gold" value={`+${stats.goldPct}%`} />
      </div>

      <SectionLabel top={178}>Battle loadout</SectionLabel>
      <div className="absolute inset-x-4 top-[200px] grid grid-cols-3 gap-3">
        {Array.from({ length: LOADOUT_SLOTS }, (_, i) => {
          const item = equipped[i] ? itemById(equipped[i]!) : undefined
          return item ? (
            <ItemTile key={i} item={item} size="lg" selected={selected === item.id} onClick={() => onPick(item.id)} />
          ) : (
            <div
              key={i}
              className="flex h-[84px] flex-col items-center justify-center border-[3px] border-dashed border-[#8C99A8] font-pixel text-[13px] text-[#B9C3CE]"
            >
              Empty slot
            </div>
          )
        })}
      </div>

      <SectionLabel top={300}>Items · {items.length}</SectionLabel>
      <div className="absolute inset-x-4 top-[322px] grid grid-cols-5 gap-2">
        {Array.from({ length: BAG_CELLS }, (_, i) => {
          const item = items[i]
          if (!item)
            return (
              <div
                key={i}
                aria-label="Empty bag space"
                className="flex aspect-square items-center justify-center border-[3px] border-[#3A4756] bg-[#222C37] text-[#4B5868]"
              >
                <Lock size={15} strokeWidth={2.6} />
              </div>
            )
          return (
            <ItemTile
              key={item.id}
              item={item}
              selected={selected === item.id}
              equipped={equipped.includes(item.id)}
              onClick={() => onPick(item.id)}
            />
          )
        })}
      </div>
    </>
  )
}

// ---------- Shop ----------

function ShopView({
  gold,
  owned,
  selected,
  onPick,
}: {
  gold: number
  owned: string[]
  selected: string | null
  onPick: (id: string) => void
}) {
  return (
    <>
      {/* Shopkeeper sign */}
      <div className={`absolute inset-x-4 top-[120px] flex items-center gap-3 p-2.5 ${PANEL}`}>
        <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center border-2 border-ink bg-[#CFE7F5]">
          <PixelSprite sprite={KEEPER} scale={4} />
        </span>
        <div className="min-w-0">
          <p className="font-pixel text-[18px] font-bold leading-tight">Station Shop</p>
          <p className="text-[12.5px] leading-snug text-ink-soft">“Gear for the long ride. Gold only, no fare cards.”</p>
        </div>
      </div>

      <SectionLabel top={206}>For sale</SectionLabel>
      <div className="absolute inset-x-4 top-[228px] grid grid-cols-4 gap-2.5">
        {SHOP.map((item) => {
          const have = owned.includes(item.id)
          const afford = gold >= (item.price ?? 0)
          return (
            <div key={item.id} className="flex flex-col gap-1.5">
              <ItemTile item={item} selected={selected === item.id} owned={have} onClick={() => onPick(item.id)} />
              <span
                className={`flex h-[24px] items-center justify-center gap-1 border-2 border-ink text-[13px] ${
                  have ? 'bg-[#D9D2C2] text-muted' : afford ? 'bg-[#FFE7A3] text-[#7A4D0E]' : 'bg-[#F1E7CF] text-[#B4231A]'
                }`}
              >
                {have ? (
                  <span className="font-pixel font-bold">Owned</span>
                ) : (
                  <>
                    <Coin size={13} />
                    <span className={NUM}>{item.price}</span>
                  </>
                )}
              </span>
            </div>
          )
        })}
      </div>
      <p className="absolute inset-x-4 top-[350px] text-center font-pixel text-[12.5px] text-[#B9C3CE]">
        New stock arrives as you ride further down the line
      </p>
    </>
  )
}

// A shopkeeper in a conductor's cap
const KEEPER = {
  rows: ['..kkkkk..', '.kBBBBBk.', 'kkkgkkkkk', '.kssssk..', '.ksksks..', '.kssssk..', '..kssk...', '.kBBBBk..', 'kBBgBBBk.'],
  pal: { B: '#2F4A73', s: '#E8B98F' },
}

// ---------- Shared pieces ----------

function SectionLabel({ top, children }: { top: number; children: React.ReactNode }) {
  return (
    <p className="absolute inset-x-4 font-pixel text-[14px] font-bold tracking-[0.06em] text-[#FBF3DF]" style={{ top }}>
      {children}
    </p>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex h-[48px] flex-col items-center justify-center border-2 border-ink bg-[#FBF3DF] shadow-[3px_3px_0_rgba(27,31,36,0.85)]">
      <span className={`flex items-center gap-1 text-[17px] leading-none ${NUM}`}>
        {icon}
        {value}
      </span>
      <span className="mt-1 font-pixel text-[11px] leading-none text-muted">{label}</span>
    </div>
  )
}

/** A small corner tag on an item tile. */
function Tag({ side, className, children }: { side: 'left' | 'right'; className: string; children: React.ReactNode }) {
  return (
    <span
      className={`absolute top-0.5 border border-ink px-[3px] font-sans text-[10px] font-extrabold leading-[13px] ${
        side === 'left' ? 'left-0.5' : 'right-0.5'
      } ${className}`}
    >
      {children}
    </span>
  )
}

function ItemTile({
  item,
  size = 'sm',
  selected,
  equipped = false,
  owned = false,
  onClick,
}: {
  item: Item
  size?: 'sm' | 'lg'
  selected: boolean
  equipped?: boolean
  /** In the shop: already bought. */
  owned?: boolean
  onClick: () => void
}) {
  const r = RARITY[item.rarity]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${item.name}, ${r.label}, level ${ROMAN[item.level - 1]}${equipped ? ', equipped' : ''}${
        item.price && !owned ? `, ${item.price} gold` : ''
      }${owned ? ', owned' : ''}`}
      className={`relative flex items-center justify-center border-[3px] transition-transform active:translate-x-[1px] active:translate-y-[1px] ${
        size === 'lg' ? 'h-[84px]' : 'aspect-square'
      } ${selected ? 'border-[#F2B233]' : 'border-ink'} ${owned ? 'opacity-60' : ''}`}
      style={{
        background: `radial-gradient(circle at 50% 40%, ${r.glow} 0%, #FBF3DF 70%)`,
        boxShadow: selected ? '0 0 0 3px #F2B233, 3px 3px 0 rgba(15,19,24,0.7)' : '3px 3px 0 rgba(15,19,24,0.7)',
      }}
    >
      <PixelSprite sprite={item.sprite} scale={size === 'lg' ? 5 : 4} />
      {/* rarity stripe */}
      <span className="absolute inset-x-0 bottom-0 h-[4px]" style={{ backgroundColor: r.color }} />
      <Tag side="left" className="bg-[#F2B233] text-ink">
        {ROMAN[item.level - 1]}
      </Tag>
      {equipped && (
        <Tag side="right" className="bg-ink text-white">
          E
        </Tag>
      )}
      {item.kind === 'buff' && (
        <Tag side="right" className="bg-[#9B5DE5] text-white">
          ON
        </Tag>
      )}
    </button>
  )
}

function Detail({
  item,
  view,
  gold,
  owned,
  equipped,
  note,
  onEquip,
  onUnequip,
  onBuy,
}: {
  item: Item
  view: View
  gold: number
  owned: boolean
  equipped: boolean
  note: { text: string; good?: boolean } | null
  onEquip: () => void
  onUnequip: () => void
  onBuy: () => void
}) {
  const r = RARITY[item.rarity]
  const btn =
    'flex h-11 w-full items-center justify-center gap-1.5 border-[3px] border-ink font-pixel text-[16px] font-bold shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60 disabled:active:translate-x-0 disabled:active:translate-y-0'
  const price = item.price ?? 0
  const short = price - gold

  let action
  if (view === 'shop' && !owned) {
    action = (
      <button type="button" onClick={onBuy} disabled={short > 0} className={`${btn} bg-[#F2B233] text-ink`}>
        {short > 0 ? (
          <>
            Need <span className={NUM}>{short}</span> more gold
          </>
        ) : (
          <>
            Buy for <Coin size={16} /> <span className={NUM}>{price}</span>
          </>
        )}
      </button>
    )
  } else if (item.kind === 'buff') {
    action = (
      <p className="flex h-11 items-center justify-center border-[3px] border-dashed border-[#9B5DE5] font-pixel text-[14px] font-bold text-[#6E3BB0]">
        Always on, no slot needed
      </p>
    )
  } else if (equipped) {
    action = (
      <button type="button" onClick={onUnequip} className={`${btn} bg-[#F1E7CF] text-ink`}>
        Unequip
      </button>
    )
  } else {
    action = (
      <button type="button" onClick={onEquip} className={`${btn} bg-[#2F7A4A] text-white`}>
        Equip
      </button>
    )
  }

  return (
    <section aria-label={item.name} className={`absolute inset-x-4 top-[552px] animate-pop p-3 ${PANEL}`}>
      <div className="flex gap-3">
        <span
          className="flex h-[64px] w-[64px] shrink-0 items-center justify-center border-[3px] border-ink"
          style={{ background: `radial-gradient(circle at 50% 40%, ${r.glow} 0%, #FBF3DF 75%)` }}
        >
          <PixelSprite sprite={item.sprite} scale={5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-pixel text-[18px] font-bold leading-tight">{item.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 font-pixel text-[12px]">
            <span className="px-1.5 text-white" style={{ backgroundColor: r.color }}>
              {r.label}
            </span>
            <span className="text-muted">Level {ROMAN[item.level - 1]}</span>
            <span className="text-muted">· {item.kind === 'buff' ? 'Buff' : 'Gear'}</span>
          </p>
          <p className="mt-1 text-[14px] font-extrabold text-[#2F7A4A]">{item.effect}</p>
        </div>
      </div>
      <p className="mt-2 text-[12.5px] italic leading-snug text-ink-soft">“{item.flavor}”</p>
      <p className="mt-0.5 text-[11.5px] text-muted">{item.source}</p>
      <div className="mt-2.5">
        {action}
        {note && (
          <p className={`mt-1.5 text-center font-pixel text-[12px] ${note.good ? 'text-[#2F7A4A]' : 'text-[#B4231A]'}`} role="status">
            {note.text}
          </p>
        )}
      </div>
    </section>
  )
}
