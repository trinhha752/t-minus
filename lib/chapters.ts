// lib/chapters.ts
// The game's stations and chapters come from the UI's own file,
// components/run/stations.ts, so there is exactly one list and it can't drift.
// This file only adds what the server needs: the MBTA id for each UI slug
// (data/station-ids.json) and each chapter's final boss.
//
// Chapter = one line's route in the UI (red, green). Its final boss waits at
// the last station of that route.

import { LINES, ROUTES, STATIONS, type LineId } from "../components/run/stations";
import stationIdsJson from "../data/station-ids.json";
import type { TeamLine } from "../types";

const SLUG_TO_MBTA = stationIdsJson as Record<string, string>;
const MBTA_TO_SLUG = new Map(
  Object.entries(SLUG_TO_MBTA).filter(([k]) => !k.startsWith("_")).map(([slug, id]) => [id, slug])
);

/** Final bosses by UI line. The red one matches components/run/EndBoss.tsx. */
const FINAL_BOSSES: Record<LineId, string> = {
  red: "The Iron Archivist",
  green: "The Tunnel Warden", // placeholder until the UI names it
};

const TEAM: Record<LineId, TeamLine> = { red: "Red", green: "Green" };

export interface ChapterStationDef {
  /** MBTA id, e.g. "place-harsq". What check-in, trivia and the DB use. */
  stationId: string;
  /** UI slug, e.g. "harvard". */
  slug: string;
  name: string;
  /** kebab-case of the game title, e.g. "three-lies". */
  gameId: string;
  title: string;
  genre: string;
}

export interface ChapterDef {
  /** The UI's line id: "red" | "green". */
  id: LineId;
  name: string;
  line: TeamLine;
  bossStationId: string;
  bossName: string;
  stations: ChapterStationDef[];
}

export const gameIdFor = (title: string) =>
  title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Accepts a UI slug ("harvard") or an MBTA id ("place-harsq"); returns the MBTA id or null. */
export function toMbtaId(id: string): string | null {
  if (MBTA_TO_SLUG.has(id)) return id;
  return SLUG_TO_MBTA[id] ?? null;
}

export const toSlug = (mbtaId: string): string | null => MBTA_TO_SLUG.get(mbtaId) ?? null;

/** UI stations with no MBTA id in data/station-ids.json. Should always be empty. */
export const UNMAPPED_SLUGS = STATIONS.map((s) => s.id).filter((slug) => !SLUG_TO_MBTA[slug]);

export const CHAPTERS: ChapterDef[] = (Object.keys(ROUTES) as LineId[]).map((lineId) => {
  const stations = ROUTES[lineId].map((slug): ChapterStationDef => {
    const s = STATIONS.find((x) => x.id === slug);
    if (!s) throw new Error(`stations.ts: ROUTES.${lineId} lists unknown station "${slug}"`);
    return {
      stationId: SLUG_TO_MBTA[slug] ?? slug,
      slug,
      name: s.name,
      gameId: gameIdFor(s.game.title),
      title: s.game.title,
      genre: s.game.genre,
    };
  });
  return {
    id: lineId,
    name: LINES[lineId].realm,
    line: TEAM[lineId],
    bossStationId: stations[stations.length - 1].stationId,
    bossName: FINAL_BOSSES[lineId],
    stations,
  };
});

export const chapterById = (id: string) => CHAPTERS.find((c) => c.id === id) ?? null;
