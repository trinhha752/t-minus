// lib/photo-quests.ts
// Photo quest tasks. Safe to import in the browser: no secrets here.
// Every task is satisfiable at ANY station, never station-specific.

import questsJson from "../data/photo-quests.json";
import stationQuestsJson from "../data/station-quests.json";
import type { TeamLine } from "../types";

export interface PhotoQuest {
  id: string;
  /** Shown to the player. */
  prompt: string;
  /** What Gemini checks for. */
  target: string;
}

const QUESTS = questsJson as PhotoQuest[];

/** Color words a person (and Gemini) would actually say for each line. */
const COLOR_WORD: Record<TeamLine, string> = { Red: "red", Orange: "orange", Blue: "blue", Green: "green" };

/** A quest with {color} and {line} filled in for this line. */
export function questFor(id: string, line: TeamLine = "Red"): PhotoQuest | null {
  const q = QUESTS.find((x) => x.id === id);
  if (!q) return null;
  const fill = (s: string) => s.replaceAll("{color}", COLOR_WORD[line] ?? "red").replaceAll("{line}", line);
  return { id: q.id, prompt: fill(q.prompt), target: fill(q.target) };
}

/** A random quest for this line. */
export function randomQuest(line: TeamLine = "Red"): PhotoQuest {
  return questFor(QUESTS[Math.floor(Math.random() * QUESTS.length)].id, line)!;
}

export const QUEST_IDS = QUESTS.map((q) => q.id);

const STATION_QUESTS = stationQuestsJson as unknown as Record<string, { questId: string; prompt: string }>;

/**
 * This station's quest: its own themed text, checked against a generic target
 * so it's always doable. Falls back to a random quest for unknown stations.
 */
export function stationQuest(slug: string, line: TeamLine = "Red"): PhotoQuest {
  const sq = STATION_QUESTS[slug];
  const base = sq && questFor(sq.questId, line);
  if (!sq || !base) return randomQuest(line);
  const color = questFor("line-color", line)!.target.replace(/^an object or surface that is mostly /, "");
  return { ...base, prompt: sq.prompt.replaceAll("{color}", color) };
}

export const STATION_QUEST_SLUGS = Object.keys(STATION_QUESTS).filter((k) => !k.startsWith("_"));
