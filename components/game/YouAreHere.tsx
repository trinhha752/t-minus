"use client";
// components/game/YouAreHere.tsx
// A small live map: the real T lines (data/map-layout.json), the game's
// stations (filled once stamped), and a pulsing dot where you are.

import layout from "@/data/map-layout.json";
import { project, type MapProjection } from "@/lib/map-projection";

const ROUTE_COLOR: Record<string, string> = {
  Red: "#DA291C",
  Orange: "#ED8B00",
  Blue: "#2B6CE8",
  "Green-B": "#00843D",
  "Green-C": "#00843D",
  "Green-D": "#00843D",
  "Green-E": "#00843D",
};

type Pt = { x: number; y: number };
const stations = layout.stations as Record<string, { name: string; x: number; y: number }>;
const paths = layout.paths as Record<string, string[][]>;

export default function YouAreHere({
  you,
  gameStations: allGameStations,
  stamped,
  current,
}: {
  /** Your position, or null if unknown. */
  you: { lat: number; lon: number } | null;
  /** MBTA ids of the game's stations, with their line color. */
  gameStations: { stationId: string; color: string }[];
  /** MBTA ids you've stamped. */
  stamped: Set<string>;
  /** MBTA id of the station you're at, if any. */
  current: string | null;
}) {
  // Transfer stations (Park Street, North Station...) are on two lines: draw once.
  const gameStations = allGameStations.filter((g, i, a) => a.findIndex((x) => x.stationId === g.stationId) === i);
  const youPt = you ? project(layout.projection as MapProjection, you.lat, you.lon) : null;
  // Only zoom to include you if you're roughly in the T's area.
  const youOnMap = youPt && youPt.x > -200 && youPt.x < 1200 && youPt.y > -200 && youPt.y < 1200 ? youPt : null;

  // Frame: the game's stations plus you, with padding, kept square.
  const pts: Pt[] = gameStations.map((g) => stations[g.stationId]).filter(Boolean);
  if (youOnMap) pts.push(youOnMap);
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const pad = 40;
  let minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
  let minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
  const size = Math.max(maxX - minX, maxY - minY);
  minX -= (size - (maxX - minX)) / 2;
  minY -= (size - (maxY - minY)) / 2;
  maxX = minX + size;
  maxY = minY + size;
  const k = size / 300; // stroke scale

  return (
    <svg viewBox={`${minX} ${minY} ${size} ${size}`} className="aspect-square w-full bg-[#11131a]" role="img" aria-label="Map of the T with your location">
      {Object.entries(paths).map(([route, branches]) =>
        branches.map((ids, i) => (
          <polyline
            key={`${route}-${i}`}
            points={ids.map((id) => stations[id]).filter(Boolean).map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={ROUTE_COLOR[route] ?? "#666"}
            strokeOpacity={route === "Blue" ? 0.35 : 0.85}
            strokeWidth={3.5 * k}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))
      )}
      {gameStations.map((g) => {
        const p = stations[g.stationId];
        if (!p) return null;
        const done = stamped.has(g.stationId);
        return (
          <circle
            key={g.stationId}
            cx={p.x}
            cy={p.y}
            r={(g.stationId === current ? 5 : 3.5) * k}
            fill={done ? g.color : "#11131a"}
            stroke={g.stationId === current ? "#fff" : g.color}
            strokeWidth={1.5 * k}
          />
        );
      })}
      {youOnMap && (
        <g>
          <circle cx={youOnMap.x} cy={youOnMap.y} r={9 * k} fill="#4ea1ff" opacity={0.25}>
            <animate attributeName="r" values={`${6 * k};${14 * k};${6 * k}`} dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={youOnMap.x} cy={youOnMap.y} r={4 * k} fill="#4ea1ff" stroke="#fff" strokeWidth={1.5 * k} />
        </g>
      )}
    </svg>
  );
}
