'use client'

// Isometric pixel-art city map with drag and pinch / scroll zoom.
//
// The city is drawn once at low resolution (WW x WH "map pixels") on a <canvas>, then shown
// scaled up with `image-rendering: pixelated`, so every pixel is a chunky block. At zoom 1,
// one map pixel is PX phone pixels. Station buttons and name signs are regular HTML laid over
// the canvas (positioned in screen space so they stay readable at any zoom).
//
// Station x/y in stations.ts are flat "map space" (north up). project() tilts that space:
// rotate, then squash vertically, which gives the 3/4 isometric view. Buildings and the
// elevated tracks are extruded straight up from the ground in screen space.
//
// Buildings follow each neighborhood's real character: triple-deckers with yards in
// Somerville, Cambridge and Allston; unbroken brownstone rows in Back Bay, the South End and
// Beacon Hill; towers and plazas downtown; labs at Kendall; quads on campuses; lots and
// warehouses by Alewife.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2, Minus, Plus } from 'lucide-react'
import { LINES, STATIONS, TRACKS, type LineId, type Station } from './stations'
import { ARROW, BASE_PAL, FLAG, LANDMARKS, RIDER, STATION, TREE, type Sprite } from './pixelSprites'

const PX = 2 // phone px per map pixel at zoom 1
const VW = 393 // phone frame size
const VH = 852
/** Part of the screen not covered by the header and bottom card. */
const REGION = { top: 214, bottom: 690 }
const E = 8 // height of the elevated track above the ground, in map pixels
const Z_MAX = 1.6
const LABEL_MIN_Z = 0.72 // below this zoom, only the current station keeps its sign

// ---------- Projection ----------

type Pt = [number, number]

const TILT = (35 * Math.PI) / 180
const SQUASH = 0.68
const SCALE = 1.07 // map pixels per city unit
/**
 * How far apart Boston is stretched. Station and geography coordinates in stations.ts are
 * multiplied by this to get "city units"; buildings and blocks keep their size, so a bigger
 * number puts more city (and more room for signs) between stops.
 */
const SPREAD = 1.6
const spread = (p: Pt): Pt => [p[0] * SPREAD, p[1] * SPREAD]
const at = (s: Station): Pt => [s.x * SPREAD, s.y * SPREAD]
const COS = Math.cos(TILT)
const SIN = Math.sin(TILT)
const rot = (x: number, y: number): Pt => [x * COS - y * SIN, (x * SIN + y * COS) * SQUASH]

// The world is the stations' bounding box plus a margin of city all around.
const MARGIN = { x: 52, top: 132, bottom: 110 }
const FIT = (() => {
  const pts = STATIONS.map((s) => rot(...at(s)))
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  return {
    ox: MARGIN.x - x0 * SCALE,
    oy: MARGIN.top - y0 * SCALE,
    w: Math.ceil((x1 - x0) * SCALE + MARGIN.x * 2),
    h: Math.ceil((y1 - y0) * SCALE + MARGIN.top + MARGIN.bottom),
  }
})()
const WW = FIT.w
const WH = FIT.h

const project = (x: number, y: number): Pt => {
  const [a, b] = rot(x, y)
  return [a * SCALE + FIT.ox, b * SCALE + FIT.oy]
}

const unproject = (sx: number, sy: number): Pt => {
  const a = (sx - FIT.ox) / SCALE
  const b = (sy - FIT.oy) / SCALE / SQUASH
  return [a * COS + b * SIN, -a * SIN + b * COS]
}

// Map-space bounds of the whole world (for looping over blocks)
const WORLD_BOUNDS = (() => {
  const c = [unproject(0, 0), unproject(WW, 0), unproject(0, WH), unproject(WW, WH)]
  return {
    x0: Math.min(...c.map((p) => p[0])) - 30,
    x1: Math.max(...c.map((p) => p[0])) + 30,
    y0: Math.min(...c.map((p) => p[1])) - 60,
    y1: Math.max(...c.map((p) => p[1])) + 30,
  }
})()

// ---------- Geography (map space) ----------

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n = 24): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ])
  }
  return out
}

const RIVER: Pt[] = [
  ...cubic([-420, 470], [-260, 480], [-120, 470], [-10, 466]),
  ...cubic([-10, 466], [60, 460], [140, 456], [190, 436]),
  ...cubic([190, 436], [228, 424], [246, 404], [250, 376]),
  ...cubic([250, 376], [254, 342], [250, 300], [262, 280]),
  ...cubic([262, 280], [278, 256], [330, 252], [400, 238]),
  ...cubic([400, 238], [460, 226], [520, 210], [600, 190]),
].map(spread)

// The harbor is everything east of this edge.
const HARBOR_EDGE: Pt[] = (
  [
    [620, -300],
    [440, 180],
    [376, 236],
    [354, 300],
    [360, 400],
    [368, 520],
    [374, 640],
    [372, 1200],
  ] as Pt[]
).map(spread)

const PARKS: [number, number, number][] = [
  [40, 232, 30], // Fresh Pond
  [163, 300, 10], // Harvard Yard
  [112, 262, 9], // Cambridge Common
  [262, 468, 20], // Boston Common
  [224, 474, 12], // Public Garden
  [90, 600, 24], // the Fens
  [236, 216, 8],
  [-120, 610, 18], // Brookline reservoir
].map(([x, y, r]) => [x * SPREAD, y * SPREAD, r * SPREAD])

/** Commonwealth Avenue's tree-lined mall through Back Bay. */
const MALL: Pt[] = (
  [
    [216, 482],
    [110, 506],
  ] as Pt[]
).map(spread)

// Track beyond the last station at each end, so lines run off the map.
const TRACK_ENDS: { head?: Pt[]; tail?: Pt[] }[] = (
  [
  { head: [[-160, 60], [10, 140]], tail: [[346, 600], [352, 1100]] }, // Red
  { head: [[184, -120], [196, 160]] }, // Green trunk
  { tail: [[-90, 540], [-300, 560]] }, // B
  { tail: [[-60, 628], [-260, 720]] }, // C
  { tail: [[90, 640], [60, 800]] }, // D
  { tail: [[110, 640], [90, 800]] }, // E
  ] as { head?: Pt[]; tail?: Pt[] }[]
).map((e) => ({ head: e.head?.map(spread), tail: e.tail?.map(spread) }))

const byId = new Map(STATIONS.map((s) => [s.id, s]))

type Polyline = {
  pts: Pt[]
  x0: number
  x1: number
  y0: number
  y1: number
  /** Per segment: ax, ay, dx, dy, minX, maxX, minY, maxY, 1/len^2 */
  seg: Float64Array
}
const polyline = (pts: Pt[]): Polyline => {
  const seg = new Float64Array((pts.length - 1) * 9)
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    const dx = bx - ax
    const dy = by - ay
    seg.set([ax, ay, dx, dy, Math.min(ax, bx), Math.max(ax, bx), Math.min(ay, by), Math.max(ay, by), 1 / (dx * dx + dy * dy || 1)], (i - 1) * 9)
  }
  return {
    pts,
    seg,
    x0: Math.min(...pts.map((p) => p[0])),
    x1: Math.max(...pts.map((p) => p[0])),
    y0: Math.min(...pts.map((p) => p[1])),
    y1: Math.max(...pts.map((p) => p[1])),
  }
}

const TRACK_LINES: { line: LineId; path: Polyline }[] = TRACKS.map((t, i) => ({
  line: t.line,
  path: polyline([
    ...(TRACK_ENDS[i]?.head ?? []),
    ...t.ids.map((id) => at(byId.get(id)!)),
    ...(TRACK_ENDS[i]?.tail ?? []),
  ]),
}))
const RIVER_LINE = polyline(RIVER)
const MALL_LINE = polyline(MALL)

/** Distance to a polyline, or Infinity when the point is clearly farther than `max`. */
function dist(x: number, y: number, l: Polyline, max: number) {
  if (x < l.x0 - max || x > l.x1 + max || y < l.y0 - max || y > l.y1 + max) return Infinity
  const g = l.seg
  let best = Infinity
  for (let o = 0; o < g.length; o += 9) {
    if (x < g[o + 4] - max || x > g[o + 5] + max || y < g[o + 6] - max || y > g[o + 7] + max) continue
    const ax = g[o]
    const ay = g[o + 1]
    const dx = g[o + 2]
    const dy = g[o + 3]
    let t = ((x - ax) * dx + (y - ay) * dy) * g[o + 8]
    t = t < 0 ? 0 : t > 1 ? 1 : t
    const ex = x - ax - t * dx
    const ey = y - ay - t * dy
    const d2 = ex * ex + ey * ey
    if (d2 < best) best = d2
  }
  return Math.sqrt(best)
}

function harborX(y: number) {
  for (let i = 1; i < HARBOR_EDGE.length; i++) {
    const [ax, ay] = HARBOR_EDGE[i - 1]
    const [bx, by] = HARBOR_EDGE[i]
    if (y <= by) return ax + ((y - ay) / (by - ay || 1)) * (bx - ax)
  }
  return HARBOR_EDGE[HARBOR_EDGE.length - 1][0]
}

const BLOCK = 24 // city block size, map units
const ROAD = 3.5

const enum Ground {
  Lot,
  Road,
  Park,
  Water,
  Deep,
  Sand,
  Plaza,
}

function classify(x: number, y: number): Ground {
  if (x > harborX(y)) return Ground.Deep
  const gx = x / SPREAD
  const gy = y / SPREAD
  if (((gx - 40) / 18) ** 2 + ((gy - 232) / 12) ** 2 < 1) return Ground.Water // Fresh Pond
  if (((gx + 120) / 12) ** 2 + ((gy - 610) / 8) ** 2 < 1) return Ground.Water // reservoir
  const river = dist(x, y, RIVER_LINE, 20)
  if (river < 11) return Ground.Water
  if (river < 13) return Ground.Sand
  for (const [px, py, r] of PARKS) {
    const dx = x - px
    const dy = y - py
    if (dx * dx + dy * dy < r * r) return Ground.Park
  }
  if (river < 19 && gx > 110 && gx < 250 && gy > 400) return Ground.Park // the Esplanade
  if (dist(x, y, MALL_LINE, 3) < 2.6) return Ground.Park
  for (const t of TRACK_LINES) if (dist(x, y, t.path, 6) < 5.5) return Ground.Plaza
  const mx = ((x % BLOCK) + BLOCK) % BLOCK
  const my = ((y % BLOCK) + BLOCK) % BLOCK
  if (mx < ROAD || my < ROAD) return Ground.Road
  return Ground.Lot
}

const enum Zone {
  Houses, // triple-deckers and houses with yards
  Rows, // unbroken rowhouses
  Downtown, // towers and plazas
  Midrise, // offices, labs, apartment blocks
  Campus, // halls around green quads
  Industrial, // warehouses and parking
}

/** Rough neighborhoods of the stylized map (in stations.ts units). */
function zoneAt(cityX: number, cityY: number): Zone {
  const x = cityX / SPREAD
  const y = cityY / SPREAD
  const near = (cx: number, cy: number, r: number) => (x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r
  if (near(310, 425, 72)) return Zone.Downtown
  if (near(275, 446, 24)) return Zone.Rows // Beacon Hill
  if (near(232, 360, 42)) return Zone.Midrise // Kendall
  if (near(163, 300, 34)) return Zone.Campus // Harvard
  if (x > 185 && x < 250 && y > 380 && y < 425) return Zone.Campus // MIT
  if (x > -50 && x < 92 && y > 484 && y < 520) return Zone.Campus // BU, along Comm Ave
  if (x > 120 && x < 165 && y > 556 && y < 596) return Zone.Campus // Northeastern
  if (near(98, 526, 20)) return Zone.Midrise // Kenmore Square
  if (near(310, 425, 112)) return Zone.Midrise // edge of downtown
  if (x > 120 && x < 270 && y > 468 && y < 545) return Zone.Rows // Back Bay
  if (x > 185 && x < 340 && y >= 545 && y < 650) return Zone.Rows // South End
  if (x < 70 && y < 196 && x > -40) return Zone.Industrial // Alewife
  if (x > 196 && x < 276 && y > 212 && y < 302) return Zone.Midrise // East Cambridge
  if (x > 270 && y < 290) return Zone.Rows // Charlestown
  if (x > 60 && x < 175 && y > 540 && y < 660) return Zone.Midrise // Fenway and Longwood
  return Zone.Houses
}

// Two shades per ground type, alternated in a checkerboard for texture.
const GROUND_COLORS: Record<Ground, [string, string]> = {
  [Ground.Lot]: ['#B9A889', '#B3A283'],
  [Ground.Road]: ['#8E857B', '#898076'],
  [Ground.Park]: ['#7CB652', '#73AC4A'],
  [Ground.Water]: ['#4D99D7', '#4793D0'],
  [Ground.Deep]: ['#3B81C3', '#387BBC'],
  [Ground.Sand]: ['#E5D29A', '#DECA90'],
  [Ground.Plaza]: ['#D9CBAD', '#D2C3A4'],
}

/** What shows between buildings: yards, sidewalks, plazas or asphalt. */
const LOT_COLORS: Record<Zone, [string, string]> = {
  [Zone.Houses]: ['#94BE64', '#8CB65C'],
  [Zone.Rows]: ['#B9A889', '#B3A283'],
  [Zone.Downtown]: ['#CBC3B5', '#C5BDAE'],
  [Zone.Midrise]: ['#BFB5A3', '#B9AF9D'],
  [Zone.Campus]: ['#86BC5A', '#7FB353'],
  [Zone.Industrial]: ['#8A857D', '#857F78'],
}

// ---------- Drawing helpers ----------

const hex = (c: string): [number, number, number] => [
  parseInt(c.slice(1, 3), 16),
  parseInt(c.slice(3, 5), 16),
  parseInt(c.slice(5, 7), 16),
]
const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
const shade = (c: string, f: number) => {
  const [r, g, b] = hex(c)
  return f >= 0
    ? toHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f)
    : toHex(r * (1 + f), g * (1 + f), b * (1 + f))
}

/** Deterministic 0..1 noise so the city looks the same on every load. */
const hash = (x: number, y: number, k = 0) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453
  return s - Math.floor(s)
}
const pick = <T,>(list: T[], r: number) => list[Math.floor(r * list.length) % list.length]

const spriteFor = (s: Station) => LANDMARKS[s.id] ?? STATION
const spriteSize = (s: Station) => ({ w: spriteFor(s).rows[0].length, h: spriteFor(s).rows.length })

function drawSprite(
  ctx: CanvasRenderingContext2D,
  sp: Sprite,
  cx: number,
  bottom: number,
  extra?: Record<string, string>,
) {
  const pal = { ...BASE_PAL, ...sp.pal, ...extra }
  const x0 = Math.round(cx - sp.rows[0].length / 2)
  const y0 = Math.round(bottom - sp.rows.length)
  sp.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = pal[row[i]]
      if (!c) continue
      ctx.fillStyle = c
      ctx.fillRect(x0 + i, y0 + j, 1, 1)
    }
  })
}

function fillPoly(ctx: CanvasRenderingContext2D, pts: Pt[], color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
  ctx.fill()
}

/** Screen position (map pixels) of a station's ground point, under the track. */
const stationPoint = (s: Station): Pt => {
  const [x, y] = project(...at(s))
  return [Math.round(x), Math.round(y)]
}

const sampleCache = new Map<number, Pt[]>()
function trackSamples(i: number): Pt[] {
  const hit = sampleCache.get(i)
  if (hit) return hit
  const pts = TRACK_LINES[i].path.pts
  const out: Pt[] = []
  for (let k = 1; k < pts.length; k++) {
    const [ax, ay] = pts[k - 1]
    const [bx, by] = pts[k]
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.6))
    for (let j = 0; j < n; j++) {
      const [x, y] = project(ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n)
      const p: Pt = [Math.round(x), Math.round(y)]
      const last = out[out.length - 1]
      if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p)
    }
  }
  sampleCache.set(i, out)
  return out
}

// ---------- Scene ----------

type Drawable = { depth: number; draw: (ctx: CanvasRenderingContext2D) => void }

const PALETTES: Record<Zone, string[]> = {
  [Zone.Houses]: ['#E8DCC4', '#C9D3D6', '#B9C9A8', '#E6D28F', '#D9B8A0', '#A9B8C8', '#D6C6B0', '#C98F7A'],
  [Zone.Rows]: ['#8B5E45', '#9C6B4E', '#B65A3F', '#A9533A', '#C9A27A', '#7E5640', '#B07B57'],
  [Zone.Downtown]: ['#B8C4CF', '#9FB2C2', '#C9BFAF', '#8FA6BA', '#D6D0C4', '#7F96AB', '#5F7A93'],
  [Zone.Midrise]: ['#C9BFAF', '#B8C4CF', '#D8C4A0', '#A9A091', '#B65A3F', '#9FB2C2', '#C46A47'],
  [Zone.Campus]: ['#A64B32', '#B65A3F', '#C9B28A', '#D6D0C4', '#9E4B34'],
  [Zone.Industrial]: ['#9A958C', '#A8A296', '#8C8A84', '#B7AE9C'],
}
const HOUSE_ROOFS = ['#6B6560', '#7A5A4A', '#5E6670', '#6F5E52']
const CARS = ['#C0392B', '#2F6FD1', '#E8E4DA', '#3A3A3A', '#F2C03A', '#7F8C8D']

/** True when a footprint sits entirely on buildable ground. */
const buildable = (x0: number, y0: number, x1: number, y1: number) =>
  [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].every(([x, y]) => classify(x, y) === Ground.Lot)

function corners(x0: number, y0: number, x1: number, y1: number): Pt[] {
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => {
    const [px, py] = project(x, y)
    return [Math.round(px), Math.round(py)] as Pt
  })
}

/** A box building: lit front, shaded east side, roof, and rows of windows. */
function building(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  h: number,
  wall: string,
  roof = shade(wall, 0.28),
  windowEvery = 3,
): Drawable {
  const [a, b, c, d] = corners(x0, y0, x1, y1)
  const up = (p: Pt): Pt => [p[0], p[1] - h]
  const seed = x0 * 3.1 + y0
  const windows = (ctx: CanvasRenderingContext2D, from: Pt, to: Pt, dark: string) => {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1])
    for (let row = 2; row < h - 1; row += windowEvery) {
      for (let k = 1; k < len - 0.5; k += 2) {
        ctx.fillStyle = hash(seed + k, row, 5) < 0.28 ? '#FFE29A' : dark
        ctx.fillRect(
          Math.round(from[0] + ((to[0] - from[0]) * k) / len),
          Math.round(from[1] + ((to[1] - from[1]) * k) / len) - row,
          1,
          1,
        )
      }
    }
  }
  return {
    depth: Math.max(a[1], b[1], c[1], d[1]),
    draw: (ctx) => {
      fillPoly(ctx, [d, c, up(c), up(d)], wall) // front (south) face
      fillPoly(ctx, [b, c, up(c), up(b)], shade(wall, -0.32)) // east face, in shade
      fillPoly(ctx, [up(a), up(b), up(c), up(d)], roof)
      if (h >= 4) {
        windows(ctx, d, c, shade(wall, -0.45))
        windows(ctx, b, c, shade(wall, -0.6))
      }
    },
  }
}

function tree(x: number, y: number): Drawable {
  const [sx, sy] = project(x, y)
  return { depth: sy, draw: (ctx) => drawSprite(ctx, TREE, Math.round(sx), Math.round(sy) + 1) }
}

function parkingLot(x0: number, y0: number, x1: number, y1: number): Drawable {
  const poly = corners(x0, y0, x1, y1)
  return {
    depth: Math.min(...poly.map((p) => p[1])),
    draw: (ctx) => {
      fillPoly(ctx, poly, '#6F6A64')
      for (const row of [y0 + 1.6, y1 - 2]) {
        for (let x = x0 + 1; x < x1 - 1; x += 1.7) {
          const [px, py] = project(x, row)
          const r = hash(x, row, 9)
          ctx.fillStyle = r < 0.55 ? pick(CARS, r * 1.8) : '#D8D2C4'
          ctx.fillRect(Math.round(px), Math.round(py), r < 0.55 ? 2 : 1, 1)
        }
      }
    },
  }
}

/** Buildings for one city block, by neighborhood. */
function block(bx: number, by: number, out: Drawable[]) {
  const x0 = bx + ROAD
  const y0 = by + ROAD
  const size = BLOCK - ROAD
  const zone = zoneAt(bx + BLOCK / 2, by + BLOCK / 2)
  const pal = PALETTES[zone]
  const r = (k: number, a = bx, b = by) => hash(a, b, k)
  const add = (fx0: number, fy0: number, fx1: number, fy1: number, h: number, wall: string, roof?: string, every?: number) => {
    if (buildable(fx0, fy0, fx1, fy1)) out.push(building(fx0, fy0, fx1, fy1, h, wall, roof, every))
  }
  const plant = (x: number, y: number) => {
    if (classify(x, y) === Ground.Lot) out.push(tree(x, y))
  }

  switch (zone) {
    case Zone.Houses: {
      // Four good-sized houses per block, each pushed toward its street corner, with yards
      // and big trees in the middle of the block, like Somerville or Cambridge from above.
      const lot = size / 2
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const lx = x0 + i * lot
          const ly = y0 + j * lot
          if (r(1, lx, ly) < 0.1) {
            plant(lx + lot / 2, ly + lot / 2)
            continue
          }
          const w = lot * (0.56 + r(2, lx, ly) * 0.16)
          const dpt = lot * (0.5 + r(3, lx, ly) * 0.16)
          // Front of the house near the street, backyard toward the middle of the block
          const ox = i === 0 ? lx + 1 : lx + lot - 1 - w
          const oy = j === 0 ? ly + 1 : ly + lot - 1 - dpt
          const wall = r(7, lx, ly) < 0.7 ? pick(pal.slice(0, 4), r(29, lx, ly)) : pick(pal, r(7, lx, ly))
          add(ox, oy, ox + w, oy + dpt, 6 + Math.floor(r(6, lx, ly) * 4), wall, pick(HOUSE_ROOFS, r(8, lx, ly)), 3)
          // A street tree out front sometimes
          if (r(9, lx, ly) < 0.35) plant(i === 0 ? lx + 0.4 : lx + lot - 0.4, ly + lot / 2)
        }
      }
      // Backyards in the middle of the block
      const cx = x0 + size / 2
      const cy = y0 + size / 2
      plant(cx - 1.5, cy)
      if (r(30) < 0.7) plant(cx + 2, cy + 1.5)
      if (r(31) < 0.4) plant(cx, cy - 2.5)
      break
    }
    case Zone.Rows: {
      // Two unbroken rows of narrow houses facing the streets, an alley between
      const depth = size * 0.38
      const houses = 5
      const w = (size - 0.8) / houses
      for (const [ry0, ry1, k] of [
        [y0 + 0.4, y0 + 0.4 + depth, 0],
        [y0 + size - 0.4 - depth, y0 + size - 0.4, 1],
      ] as const) {
        const base = 6 + Math.floor(r(11 + k) * 3)
        for (let i = 0; i < houses; i++) {
          const hx = x0 + 0.4 + i * w
          add(hx, ry0, hx + w, ry1, base + Math.floor(r(12, hx, ry0) * 2), pick(pal, r(13, hx, ry0)), '#5E5650', 3)
        }
      }
      if (r(14) < 0.5) plant(x0 + size / 2, y0 - 0.6)
      break
    }
    case Zone.Downtown: {
      // Towers filling most lots, with an occasional plaza
      const d = Math.hypot((bx + BLOCK / 2) / SPREAD - 310, (by + BLOCK / 2) / SPREAD - 425)
      const lot = size / 2
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const lx = x0 + i * lot
          const ly = y0 + j * lot
          if (r(15, lx, ly) < 0.12) {
            plant(lx + lot / 2, ly + lot / 2)
            continue
          }
          const h = 12 + Math.floor((1 - d / 72) * r(16, lx, ly) * 44)
          add(lx + 0.7, ly + 0.7, lx + lot - 0.7, ly + lot - 0.7, h, pick(pal, r(17, lx, ly)))
        }
      }
      break
    }
    case Zone.Midrise: {
      const lot = size / 2
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const lx = x0 + i * lot
          const ly = y0 + j * lot
          if (r(18, lx, ly) < 0.14) {
            plant(lx + lot / 2, ly + lot / 2)
            continue
          }
          add(lx + 0.7, ly + 0.7, lx + lot - 0.7, ly + lot - 0.7, 8 + Math.floor(r(19, lx, ly) * 11), pick(pal, r(20, lx, ly)))
        }
      }
      break
    }
    case Zone.Campus: {
      // Halls around green quads with trees
      const lot = size / 2
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const lx = x0 + i * lot
          const ly = y0 + j * lot
          if (r(21, lx, ly) < 0.45) {
            plant(lx + lot * 0.3, ly + lot * 0.35)
            if (r(22, lx, ly) < 0.6) plant(lx + lot * 0.7, ly + lot * 0.7)
            continue
          }
          add(lx + 1.5, ly + 1.5, lx + lot - 1.5, ly + lot - 1.5, 5 + Math.floor(r(23, lx, ly) * 5), pick(pal, r(24, lx, ly)), undefined, 3)
        }
      }
      break
    }
    case Zone.Industrial: {
      if (r(25) < 0.45) {
        if (buildable(x0 + 0.5, y0 + 0.5, x0 + size - 0.5, y0 + size - 0.5))
          out.push(parkingLot(x0 + 0.5, y0 + 0.5, x0 + size - 0.5, y0 + size - 0.5))
      } else {
        add(x0 + 1.5, y0 + 1.5, x0 + size - 1.5, y0 + size - 1.5, 3 + Math.floor(r(26) * 3), pick(pal, r(27)), '#BDB8AE', 9)
      }
      break
    }
  }
}

function buildings(): Drawable[] {
  const out: Drawable[] = []
  const bx0 = Math.floor(WORLD_BOUNDS.x0 / BLOCK) * BLOCK
  const by0 = Math.floor(WORLD_BOUNDS.y0 / BLOCK) * BLOCK
  for (let bx = bx0; bx < WORLD_BOUNDS.x1; bx += BLOCK) {
    for (let by = by0; by < WORLD_BOUNDS.y1; by += BLOCK) {
      const [sx, sy] = project(bx + BLOCK / 2, by + BLOCK / 2)
      if (sx < -30 || sx > WW + 30 || sy < -20 || sy > WH + 70) continue
      block(bx, by, out)
    }
  }
  return out
}

function parkTrees(): Drawable[] {
  const out: Drawable[] = []
  for (let x = WORLD_BOUNDS.x0; x < WORLD_BOUNDS.x1; x += 6) {
    for (let y = WORLD_BOUNDS.y0; y < WORLD_BOUNDS.y1; y += 6) {
      const jx = x + hash(x, y, 6) * 4
      const jy = y + hash(x, y, 7) * 4
      if (hash(x, y, 8) > 0.55) continue
      const [sx, sy] = project(jx, jy)
      if (sx < -4 || sx > WW + 4 || sy < 0 || sy > WH + 6) continue
      if (classify(jx, jy) !== Ground.Park) continue
      out.push(tree(jx, jy))
    }
  }
  // A row of trees down the Comm Ave mall
  const [[ax, ay], [bx, by]] = MALL
  for (let t = 0; t <= 1; t += 0.04) out.push(tree(ax + (bx - ax) * t, ay + (by - ay) * t))
  return out
}

function tracks(): Drawable[] {
  const out: Drawable[] = []
  TRACK_LINES.forEach(({ line }, ti) => {
    const { color, dark } = LINES[line]
    trackSamples(ti).forEach(([x, y], i) => {
      out.push({
        depth: y,
        draw: (ctx) => {
          if (i % 16 === 0) {
            ctx.fillStyle = '#5B5550' // support pillar
            ctx.fillRect(x - 1, y - E + 1, 2, E)
          }
          ctx.fillStyle = dark
          ctx.fillRect(x - 3, y - E, 7, 2)
          ctx.fillStyle = color
          ctx.fillRect(x - 3, y - E - 2, 7, 2)
        },
      })
    })
  })
  return out
}

/**
 * Ground drawn per pixel (no seams between tiles), with a warm haze along the top edge.
 * To keep it fast, the ground type is sampled every other pixel; a 2x2 cell is only worked
 * out pixel by pixel where its samples disagree (shorelines, park edges, roads).
 */
function drawGround(ctx: CanvasRenderingContext2D): Pt[] {
  const img = ctx.createImageData(WW, WH)
  const haze = hex('#F3E2C6')
  const water: Pt[] = []
  // Ground type, or 100 + zone for buildable lots (their color depends on the neighborhood)
  const LOT = 100
  const typeAt = (sx: number, sy: number) => {
    const [x, y] = unproject(sx + 0.5, sy + 0.5)
    const g = classify(x, y)
    return g === Ground.Lot ? LOT + zoneAt(x, y) : g
  }
  const rgb = new Map<number, [number, number, number][]>()
  const colorsOf = (t: number) => {
    let c = rgb.get(t)
    if (!c) rgb.set(t, (c = (t >= LOT ? LOT_COLORS[(t - LOT) as Zone] : GROUND_COLORS[t as Ground]).map(hex)))
    return c
  }
  const gw = Math.ceil(WW / 2) + 1
  const gh = Math.ceil(WH / 2) + 1
  const types = new Int16Array(gw * gh)
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) types[j * gw + i] = typeAt(i * 2, j * 2)

  for (let sy = 0; sy < WH; sy++) {
    const fog = Math.max(0, Math.min(1, (90 - sy) / 90)) * 0.55
    const j = sy >> 1
    for (let sx = 0; sx < WW; sx++) {
      const i = sx >> 1
      let t = types[j * gw + i]
      if ((sx & 1) || (sy & 1)) {
        const same = types[j * gw + i + 1] === t && types[(j + 1) * gw + i] === t && types[(j + 1) * gw + i + 1] === t
        if (!same) t = typeAt(sx, sy)
      }
      if (t === Ground.Water || t === Ground.Deep) water.push([sx, sy])
      const [x, y] = unproject(sx + 0.5, sy + 0.5)
      const c = colorsOf(t)[(Math.floor(x / 6) + Math.floor(y / 6)) & 1]
      const o = (sy * WW + sx) * 4
      img.data[o] = c[0] + (haze[0] - c[0]) * fog
      img.data[o + 1] = c[1] + (haze[1] - c[1]) * fog
      img.data[o + 2] = c[2] + (haze[2] - c[2]) * fog
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  // Shadows of the elevated tracks
  ctx.fillStyle = 'rgba(40,30,20,0.18)'
  TRACK_LINES.forEach((_, i) => {
    for (const [x, y] of trackSamples(i)) ctx.fillRect(x - 3, y, 7, 1)
  })
  return water
}

// The city (ground, buildings, trees, track) never changes, so draw it once per page load.
let CITY: { canvas: HTMLCanvasElement; water: Pt[] } | null = null
function city() {
  if (CITY) return CITY
  const canvas = document.createElement('canvas')
  canvas.width = WW
  canvas.height = WH
  const ctx = canvas.getContext('2d')!
  const water = drawGround(ctx)
  const scene = [...buildings(), ...parkTrees(), ...tracks()]
  scene.sort((a, b) => a.depth - b.depth)
  for (const d of scene) d.draw(ctx)
  CITY = { canvas, water }
  return CITY
}

/** The city plus every station's landmark, with flags on played stations. */
function withStations(played: Set<string>, current: string) {
  const { canvas: base, water } = city()
  const canvas = document.createElement('canvas')
  canvas.width = WW
  canvas.height = WH
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(base, 0, 0)
  const order = [...STATIONS].sort((a, b) => stationPoint(a)[1] - stationPoint(b)[1])
  for (const s of order) {
    const [x, y] = stationPoint(s)
    const line = LINES[s.lines[0]]
    const { w, h } = spriteSize(s)
    // Platform under the landmark
    ctx.fillStyle = '#6F675E'
    ctx.fillRect(x - Math.ceil(w / 2) - 1, y - E, w + 3, 3)
    ctx.fillStyle = '#D9CFBD'
    ctx.fillRect(x - Math.ceil(w / 2) - 1, y - E - 1, w + 3, 2)
    drawSprite(ctx, spriteFor(s), x, y - E, { R: line.color, r: line.dark })
    if (played.has(s.id) && s.id !== current) drawSprite(ctx, FLAG, x + w / 2 + 3, y - E - h + 4)
  }
  return { canvas, water }
}

// ---------- Pan and zoom ----------

type View = { z: number; tx: number; ty: number }

const Z_MIN = VW / (WW * PX) // zoomed all the way out, the map fills the screen width
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Keep the world covering the screen; once it's smaller than the screen, center it. */
function clampView({ z, tx, ty }: View): View {
  z = clamp(z, Z_MIN, Z_MAX)
  const axis = (t: number, size: number, full: number, r0: number, r1: number) => {
    if (size >= full) return clamp(t, full - size, 0)
    if (size <= r1 - r0) return r0 + (r1 - r0 - size) / 2
    return clamp(t, r1 - size, r0)
  }
  return {
    z,
    tx: axis(tx, WW * PX * z, VW, 0, VW),
    ty: axis(ty, WH * PX * z, VH, REGION.top, REGION.bottom),
  }
}

/** Zoom 1, with the given station in the middle of the visible area. */
function viewOn(s: Station): View {
  const [x, y] = stationPoint(s)
  return clampView({ z: 1, tx: VW / 2 - x * PX, ty: (REGION.top + REGION.bottom) / 2 - (y - E) * PX })
}

/** Zoomed all the way out, centered on the middle of the stations. */
function wholeView(): View {
  const ys = STATIONS.map((s) => stationPoint(s)[1])
  const mid = (Math.min(...ys) + Math.max(...ys)) / 2
  return clampView({ z: Z_MIN, tx: 0, ty: (REGION.top + REGION.bottom) / 2 - mid * PX * Z_MIN })
}

const zoomAround = (v: View, factor: number, px: number, py: number): View => {
  const z = clamp(v.z * factor, Z_MIN, Z_MAX)
  const k = z / v.z
  return clampView({ z, tx: px - (px - v.tx) * k, ty: py - (py - v.ty) * k })
}

// ---------- Component ----------

export function PixelMap({
  played,
  current,
  onSelect,
  interactive = true,
}: {
  played: Set<string>
  current: string
  onSelect: (id: string) => void
  /** Off when the map is only a backdrop (e.g. behind a boss fight): no signs, taps or zoom. */
  interactive?: boolean
}) {
  const here = byId.get(current)!
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [view, setView] = useState<View>(() => viewOn(here))
  const viewRef = useRef(view)
  const dragged = useRef(false)
  const playedKey = [...played].sort().join(',')

  const apply = useCallback((v: View) => {
    viewRef.current = v
    setView(v)
  }, [])

  /** Smoothly move to a view (zoom buttons). */
  const animateTo = useCallback(
    (target: View) => {
      const from = viewRef.current
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 260)
        const e = 1 - (1 - t) ** 3
        apply({
          z: from.z + (target.z - from.z) * e,
          tx: from.tx + (target.tx - from.tx) * e,
          ty: from.ty + (target.ty - from.ty) * e,
        })
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    },
    [apply],
  )

  // When the player's real station arrives (location is async) or changes, glide the camera there.
  const lastCurrent = useRef(current)
  useEffect(() => {
    if (lastCurrent.current === current) return
    lastCurrent.current = current
    animateTo(viewOn(byId.get(current)!))
  }, [current, animateTo])

  // ---- Draw the city, then animate the water and the rider in retro steps.
  // (No trains yet: they'll come from live MBTA positions, not a simulation.)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const base = withStations(new Set(playedKey.split(',')), current)
    const [hx, hy] = stationPoint(here)
    const hereTop = hy - E - spriteSize(here).h

    const frame = (step: number) => {
      ctx.drawImage(base.canvas, 0, 0)
      ctx.fillStyle = '#BFE3FF'
      for (let k = 0; k < 160 && base.water.length; k++) {
        const [x, y] = base.water[Math.floor(hash(k, Math.floor(step / 3)) * base.water.length)]
        ctx.fillRect(x, y, 2, 1)
      }
      const bob = step % 6 < 3 ? 0 : 1
      drawSprite(ctx, RIDER, hx + spriteSize(here).w / 2 + 5, hy - E - bob)
      drawSprite(ctx, ARROW, hx, hereTop - 3 - (step % 8 < 4 ? 0 : 2))
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      frame(0)
      return
    }
    let raf = 0
    let last = -1
    const loop = (ms: number) => {
      const step = Math.floor(ms / 140)
      if (step !== last) frame((last = step))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [playedKey, current, here])

  // ---- Drag to pan, pinch or scroll to zoom
  const pointers = useRef(new Map<number, Pt>())

  const onPointerDown = (e: React.PointerEvent) => {
    const root = rootRef.current
    if (!root || !interactive) return
    const k = root.getBoundingClientRect().width / VW // the phone frame may be scaled
    const local = (ev: PointerEvent | React.PointerEvent): Pt => {
      const r = root.getBoundingClientRect()
      return [(ev.clientX - r.left) / k, (ev.clientY - r.top) / k]
    }
    pointers.current.set(e.pointerId, local(e))
    if (pointers.current.size > 1) return // the first pointer's listeners handle the gesture
    dragged.current = false
    let moved = 0

    const move = (ev: PointerEvent) => {
      const ps = pointers.current
      if (!ps.has(ev.pointerId)) return
      const before = [...ps.values()]
      ps.set(ev.pointerId, local(ev))
      const after = [...ps.values()]
      let v = viewRef.current
      if (after.length === 1) {
        const [dx, dy] = [after[0][0] - before[0][0], after[0][1] - before[0][1]]
        moved += Math.abs(dx) + Math.abs(dy)
        v = clampView({ ...v, tx: v.tx + dx, ty: v.ty + dy })
      } else {
        const mid = (p: Pt[]): Pt => [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2]
        const span = (p: Pt[]) => Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]) || 1
        const [m0, m1] = [mid(before), mid(after)]
        moved += 99
        v = zoomAround(
          { ...v, tx: v.tx + m1[0] - m0[0], ty: v.ty + m1[1] - m0[1] },
          span(after) / span(before),
          m1[0],
          m1[1],
        )
      }
      if (moved > 6) dragged.current = true
      apply(v)
    }
    const up = (ev: PointerEvent) => {
      pointers.current.delete(ev.pointerId)
      if (pointers.current.size) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  useEffect(() => {
    const root = rootRef.current
    if (!root || !interactive) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = root.getBoundingClientRect()
      const k = r.width / VW
      apply(zoomAround(viewRef.current, Math.exp(-e.deltaY * 0.0015), (e.clientX - r.left) / k, (e.clientY - r.top) / k))
    }
    root.addEventListener('wheel', onWheel, { passive: false })
    return () => root.removeEventListener('wheel', onWheel)
  }, [apply, interactive])

  const zoomBy = (f: number) => animateTo(zoomAround(view, f, VW / 2, (REGION.top + REGION.bottom) / 2))
  const zoomedOut = view.z < Z_MIN + 0.02
  const toggleWhole = () => animateTo(zoomedOut ? viewOn(here) : wholeView())

  const { z, tx, ty } = view
  const toScreen = (x: number, y: number): Pt => [tx + x * PX * z, ty + y * PX * z]

  return (
    <div
      ref={rootRef}
      onPointerDown={onPointerDown}
      className={`absolute inset-0 select-none overflow-hidden bg-[#E9DCC0] ${interactive ? 'touch-none' : 'pointer-events-none'}`}
    >
      <canvas
        ref={canvasRef}
        width={WW}
        height={WH}
        aria-hidden
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: WW * PX,
          height: WH * PX,
          imageRendering: 'pixelated',
          transform: `translate(${tx}px, ${ty}px) scale(${z})`,
        }}
      />

      {interactive && (
        <>
          {STATIONS.map((s) => (
            <StationPin
              key={s.id}
              s={s}
              z={z}
              toScreen={toScreen}
              played={played.has(s.id)}
              current={s.id === current}
              onTap={() => {
                if (!dragged.current) onSelect(s.id)
              }}
            />
          ))}
          <div className="absolute right-4 top-[520px] z-10 flex flex-col gap-2">
            <ZoomButton label="Zoom in" disabled={z >= Z_MAX - 0.01} onClick={() => zoomBy(1.4)}>
              <Plus size={20} strokeWidth={3} />
            </ZoomButton>
            <ZoomButton label="Zoom out" disabled={zoomedOut} onClick={() => zoomBy(1 / 1.4)}>
              <Minus size={20} strokeWidth={3} />
            </ZoomButton>
            <ZoomButton label={zoomedOut ? 'Zoom back to your station' : 'Show the whole map'} onClick={toggleWhole}>
              {zoomedOut ? <Minimize2 size={18} strokeWidth={2.6} /> : <Maximize2 size={18} strokeWidth={2.6} />}
            </ZoomButton>
          </div>
        </>
      )}
    </div>
  )
}

function ZoomButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center border-[3px] border-ink bg-[#FBF3DF] text-ink shadow-[3px_3px_0_rgba(27,31,36,0.85)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40"
    >
      {children}
    </button>
  )
}

// ---------- Station signs and tap targets ----------

type Side = 'left' | 'right' | 'below' | 'above'

/** Force a sign's side where the automatic choice collides with a neighbor. */
const LABEL_SIDE: Partial<Record<string, Side>> = {
  downtown: 'right',
  south: 'right',
  boylston: 'right',
  kenmore: 'right',
  fenway: 'left',
}

/** The track a station belongs to (a branch stop's own branch, not the trunk it starts from). */
const trackOf = (s: Station) => TRACKS.find((t) => t.ids.indexOf(s.id) > 0) ?? TRACKS.find((t) => t.ids.includes(s.id))!

/**
 * Signs go beside the building where the track runs up/down the screen. Where it runs across,
 * they alternate above and below so close stops (like the B branch) don't overlap.
 */
function labelSide(s: Station): Side {
  const forced = LABEL_SIDE[s.id]
  if (forced) return forced
  const { ids } = trackOf(s)
  const i = ids.indexOf(s.id)
  const [ax, ay] = stationPoint(byId.get(ids[Math.max(0, i - 1)])!)
  const [bx, by] = stationPoint(byId.get(ids[Math.min(ids.length - 1, i + 1)])!)
  if (Math.abs(by - ay) < Math.abs(bx - ax) * 0.7) return i % 2 ? 'below' : 'above'
  return stationPoint(s)[0] > WW / 2 ? 'left' : 'right'
}

function StationPin({
  s,
  z,
  toScreen,
  played,
  current,
  onTap,
}: {
  s: Station
  z: number
  toScreen: (x: number, y: number) => Pt
  played: boolean
  current: boolean
  onTap: () => void
}) {
  const [x, y] = stationPoint(s)
  const { w, h } = spriteSize(s)
  const side = labelSide(s)
  const lineNames = s.lines.map((l) => LINES[l].name).join(' and ')
  const branch = s.branch ? ` (${s.branch} branch)` : ''
  const status = `${current ? 'You are here. ' : ''}${played ? 'Played' : 'Not played yet'}`
  const name = (s.label.text ?? s.name).replace('\n', ' ')

  const [bx, by] = toScreen(x, y - E - h / 2) // middle of the building
  const halfW = (w / 2) * PX * z
  const halfH = (h / 2) * PX * z
  const [, groundY] = toScreen(x, y - E)
  const [, topY] = toScreen(x, y - E - h)

  const place =
    side === 'below'
      ? { left: bx, top: groundY + 6, transform: 'translateX(-50%)' }
      : side === 'above'
        ? { left: bx, top: topY - 6, transform: 'translate(-50%, -100%)' }
        : side === 'right'
          ? { left: bx + halfW + 6, top: by, transform: 'translateY(-50%)' }
          : { left: bx - halfW - 6, top: by, transform: 'translate(-100%, -50%)' }

  const showSign = current || z >= LABEL_MIN_Z
  const swatch =
    s.lines.length > 1
      ? `linear-gradient(135deg, ${LINES[s.lines[0]].color} 50%, ${LINES[s.lines[1]].color} 50%)`
      : LINES[s.lines[0]].color

  return (
    <>
      {showSign &&
        (current ? (
          <span
            className="pointer-events-none absolute z-[2] flex flex-col items-center border-[3px] border-ink bg-[#F2B233] px-2 pb-1 pt-0.5 font-pixel leading-none text-ink shadow-[3px_3px_0_rgba(27,31,36,0.85)]"
            style={place}
          >
            <span className="text-[9px] font-bold tracking-[0.12em]">YOU ARE HERE</span>
            <span className="mt-0.5 text-[15px] font-bold">{s.name}</span>
          </span>
        ) : (
          // A station sign: line-color tab (with the branch letter), the name, a check once played
          <span
            className="pointer-events-none absolute z-[1] flex items-stretch whitespace-nowrap border-2 border-ink bg-[#FBF3DF] font-pixel text-[11px] font-semibold leading-none text-ink shadow-[2px_2px_0_rgba(27,31,36,0.8)]"
            style={place}
          >
            <span
              className={`flex items-center justify-center border-r-2 border-ink text-[9px] font-bold text-white ${s.branch ? 'w-3.5' : 'w-2'}`}
              style={{ background: swatch }}
            >
              {s.branch}
            </span>
            <span className="px-1.5 py-[3px]">{name}</span>
            {played && (
              <span className="flex items-center border-l-2 border-ink bg-[#F2B233] px-1 text-[10px] font-bold">
                ✓
              </span>
            )}
          </span>
        ))}
      <button
        type="button"
        onClick={onTap}
        aria-label={`${s.name}, ${lineNames}${branch}. ${status}`}
        className="absolute z-[3] -translate-x-1/2 -translate-y-1/2 rounded-md"
        style={{
          left: bx,
          top: by,
          width: Math.max(32, halfW * 2 + 8),
          height: Math.max(32, halfH * 2 + 8),
        }}
      />
    </>
  )
}
