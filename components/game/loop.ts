// components/game/loop.ts
// The game loop, in one place:
//   you're at a station → check in, brake in, photo quest → the station's game
//   → stamped → ride to the NEXT unstamped station on your line → ...
//   → every station on the line stamped → that line's End Boss.

import { ROUTES, stationById, type LineId } from "@/components/run/stations";

/** The line a station belongs to first (Park Street is Red first, then Green). */
export const lineOf = (slug: string): LineId => stationById(slug).lines[0];

/**
 * Where to ride next: the first unstamped station after this one on its line,
 * wrapping around. null when every station on the line is stamped.
 */
export function nextStation(current: string, played: Set<string>): string | null {
  const route = ROUTES[lineOf(current)];
  const at = Math.max(0, route.indexOf(current));
  for (let i = 1; i <= route.length; i++) {
    const id = route[(at + i) % route.length];
    if (id !== current && !played.has(id)) return id;
  }
  return null;
}

/** Every station on this station's line is stamped: its End Boss is open. */
export const lineComplete = (current: string, played: Set<string>) =>
  ROUTES[lineOf(current)].every((id) => played.has(id));
