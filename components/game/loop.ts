// components/game/loop.ts
// The game loop, in one place:
//   you're at a station → check in, brake in, photo quest → the station's game
//   → stamped → ride to the next unstamped stop, either direction
//   → a line done in one direction or entirely → switch lines at a transfer
//   → every station on a line stamped → that line's End Boss.
//
// Direction: along a station's path, increasing index is MBTA direction_id 0
// (Red and Orange southbound, Green westbound/outbound) and decreasing is 1.

import { ROUTES, STATIONS, TRACKS, stationById, type LineId } from "@/components/run/stations";

/** The line a station belongs to first (Park Street is Red first, then Green). */
export const lineOf = (slug: string): LineId => stationById(slug).lines[0];

/**
 * The single track through this station, end to end. For a Green branch stop
 * that's the trunk up to where the branch splits off, then the branch.
 */
export function pathFor(slug: string): string[] {
  const line = lineOf(slug);
  const branch = TRACKS.find((t) => t.branch && t.ids.indexOf(slug) > 0);
  const main = TRACKS.find((t) => !t.branch && t.line === line && t.ids.includes(slug)) ?? TRACKS.find((t) => t.ids.includes(slug));
  if (!branch) return main?.ids ?? ROUTES[line];
  const trunk = TRACKS.find((t) => !t.branch && t.line === branch.line)!;
  const join = branch.ids[0];
  return [...trunk.ids.slice(0, trunk.ids.indexOf(join) + 1), ...branch.ids.slice(1)];
}

export interface NextStop {
  id: string;
  /** +1 = MBTA direction 0 (outbound / southbound), -1 = direction 1. */
  dir: 1 | -1;
  /** How many stops away. */
  stops: number;
  /** The end of the line that way, for "toward ..." when no live headsign. */
  towardEnd: string;
}

/** The nearest unstamped stop in one direction, or null if everything that way is stamped. */
export function nextAlong(current: string, played: Set<string>, dir: 1 | -1): NextStop | null {
  const path = pathFor(current);
  const at = path.indexOf(current);
  const towardEnd = stationById(dir === 1 ? path[path.length - 1] : path[0]).name;
  for (let i = at + dir, n = 1; i >= 0 && i < path.length; i += dir, n++) {
    if (!played.has(path[i])) return { id: path[i], dir, stops: n, towardEnd };
  }
  // At the end of the trunk (Kenmore, Copley): look down the branches that start here.
  if (dir === 1) {
    for (const b of TRACKS.filter((t) => t.branch && t.ids[0] === current)) {
      const i = b.ids.findIndex((id, k) => k > 0 && !played.has(id));
      if (i > 0) return { id: b.ids[i], dir, stops: i, towardEnd: stationById(b.ids[b.ids.length - 1]).name };
    }
  }
  return null;
}

/** Both directions from here (whichever still have unstamped stops). */
export const nextStops = (current: string, played: Set<string>): NextStop[] =>
  [nextAlong(current, played, 1), nextAlong(current, played, -1)].filter((s): s is NextStop => !!s);

/** One "where next" answer, for buttons that need a single station. */
export function nextStation(current: string, played: Set<string>): string | null {
  const [first] = nextStops(current, played);
  if (first) return first.id;
  // Nothing left on this track: anything left elsewhere on the line (other branches).
  return ROUTES[lineOf(current)].find((id) => id !== current && !played.has(id)) ?? null;
}

/** Every station on this station's line is stamped: its End Boss is open. */
export const lineComplete = (current: string, played: Set<string>) =>
  ROUTES[lineOf(current)].every((id) => played.has(id));

export interface Transfer {
  /** Transfer station slug, e.g. "haymarket". */
  at: string;
  line: LineId;
  /** Unstamped stations left on that line. */
  left: number;
  /** Stops from here to the transfer (0 = you're at it). */
  stops: number;
}

/**
 * Where to switch lines: the closest transfer station on your track that
 * connects to a line with stations still unstamped.
 */
export function suggestTransfer(current: string, played: Set<string>): Transfer | null {
  const path = pathFor(current);
  const at = path.indexOf(current);
  const mine = lineOf(current);
  let best: Transfer | null = null;
  path.forEach((id, i) => {
    for (const line of stationById(id).lines) {
      if (line === mine) continue;
      const left = ROUTES[line].filter((s) => !played.has(s)).length;
      const stops = Math.abs(i - at);
      if (left > 0 && (!best || stops < best.stops)) best = { at: id, line, left, stops };
    }
  });
  return best;
}

/** Stations that connect two lines (Park Street, Downtown Crossing, North Station, Haymarket). */
export const TRANSFERS = STATIONS.filter((s) => s.lines.length > 1).map((s) => s.id);
