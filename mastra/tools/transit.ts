// mastra/tools/transit.ts
// The Conductor's tools. Each wraps game/backend code that's already tested, so
// the agent answers from live data (MBTA, Tiger Data, the rider's progress)
// instead of guessing. The rider's id arrives in requestContext ("userId").

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getPredictions } from "@/lib/mbta";
import { delayHistory, tigerStats } from "@/lib/delays";
import { readBossStates } from "@/lib/boss";
import { bossPersona } from "@/lib/bossPersona";
import { getProgress } from "@/lib/progress";
import { stationQuest } from "@/lib/photo-quests";
import { toMbtaId, toSlug } from "@/lib/chapters";
import { STATIONS, LINES } from "@/components/run/stations";
import { lineOf, nextStops, suggestTransfer } from "@/components/game/loop";
import type { TeamLine } from "@/types";

const TEAM: Record<string, TeamLine> = { red: "Red", green: "Green", orange: "Orange" };

/** "harvard", "Harvard", "place-harsq", "Kendall/MIT" → UI slug, or null. */
export function findStation(input: string): string | null {
  const s = input.trim().toLowerCase();
  const bySlug = STATIONS.find((x) => x.id === s);
  if (bySlug) return bySlug.id;
  const mbta = toMbtaId(s);
  if (mbta && toSlug(mbta)) return toSlug(mbta);
  const byName =
    STATIONS.find((x) => x.name.toLowerCase() === s) ?? STATIONS.find((x) => x.name.toLowerCase().includes(s));
  return byName?.id ?? null;
}

const stationName = (slug: string) => STATIONS.find((s) => s.id === slug)?.name ?? slug;
const lineSchema = z.enum(["Red", "Green", "Orange", "Blue"]).describe("MBTA line");

export const nextTrainsTool = createTool({
  id: "get-next-trains",
  description:
    "Live next trains at a station from the MBTA, both directions, with minutes away and where each is headed. Use for any question about when a train comes.",
  inputSchema: z.object({ station: z.string().describe("Station name or id, e.g. 'Harvard' or 'BU Central'") }),
  execute: async ({ station }) => {
    const slug = findStation(station);
    if (!slug) return { error: `No T-Minus station called "${station}"` };
    const arrivals = await getPredictions(toMbtaId(slug)!, 6);
    return {
      station: stationName(slug),
      trains: arrivals.map((a) => ({
        line: a.route,
        toward: a.headsign,
        minutesAway: a.secondsAway <= 0 ? 0 : Math.round(a.secondsAway / 60),
        status: a.secondsAway <= 0 ? "boarding" : a.secondsAway <= 60 ? "arriving" : "on the way",
      })),
    };
  },
});

export const lineDelaysTool = createTool({
  id: "get-line-delays",
  description:
    "How late a line has been over the last few hours, from Tiger Data (TimescaleDB continuous aggregates): share of trains 5+ minutes late now, the average, the peak, and whether it's getting worse. A Delay Boss spawns around 50%.",
  inputSchema: z.object({ line: lineSchema, hours: z.number().min(1).max(6).default(3) }),
  execute: async ({ line, hours }) => {
    const [points, stats] = await Promise.all([delayHistory(line, hours), tigerStats()]);
    if (!points.length) return { line, note: "No delay data yet for this window" };
    const pct = points.map((p) => p.latePct);
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    const recent = avg(pct.slice(-3));
    const earlier = avg(pct.slice(0, 3));
    return {
      line,
      hours,
      lateNowPct: pct[pct.length - 1],
      averagePct: Math.round(avg(pct)),
      peakPct: Math.max(...pct),
      trend: recent > earlier + 5 ? "getting worse" : recent < earlier - 5 ? "improving" : "steady",
      bossThresholdPct: 50,
      source: `Tiger Data: ${stats.snapshotRows.toLocaleString()} predictions stored${
        stats.compressionSavedPct ? `, ${stats.compressionSavedPct}% compressed` : ""
      }`,
    };
  },
});

export const delayBossTool = createTool({
  id: "get-delay-boss",
  description:
    "Whether a Delay Boss is up on a line right now, its name and remaining HP. Riders fight it together by answering trivia or playing its mini-games.",
  inputSchema: z.object({ line: lineSchema }),
  execute: async ({ line }) => {
    const state = (await readBossStates()).find((b) => b.line === line);
    if (!state?.active) return { line, active: false };
    const persona = await bossPersona(line).catch(() => null);
    return {
      line,
      active: true,
      name: persona?.name ?? "a Delay Boss",
      hpRemaining: state.hpRemaining,
      hpTotal: state.hpTotal,
      lateTrains: state.lateTrains,
    };
  },
});

export const riderProgressTool = createTool({
  id: "get-rider-progress",
  description:
    "This rider's game progress: stations stamped per line, which End Bosses are unlocked or defeated, and buffs. Give fromStation to also get the next unstamped stop in each direction and where to switch lines.",
  inputSchema: z.object({ fromStation: z.string().optional().describe("Where the rider is, to suggest the next stop") }),
  execute: async ({ fromStation }, context) => {
    const userId = context?.requestContext?.get("userId") as string | undefined;
    if (!userId) return { error: "No rider" };
    const progress = await getProgress(userId);
    const played = new Set(progress.chapters.flatMap((c) => c.stations.filter((s) => s.cleared).map((s) => s.slug)));
    const lines = progress.chapters.map((c) => ({
      line: c.line,
      realm: c.name,
      stamped: c.stations.filter((s) => s.cleared).length,
      total: c.stations.length,
      endBoss: c.bossName,
      endBossUnlocked: c.bossUnlocked,
      endBossDefeated: c.bossDefeated,
    }));
    const slug = fromStation ? findStation(fromStation) : null;
    const transfer = slug ? suggestTransfer(slug, played) : null;
    return {
      lines,
      buffs: progress.buffs.length,
      next: slug
        ? {
            from: stationName(slug),
            stops: nextStops(slug, played).map((n) => ({ station: stationName(n.id), stopsAway: n.stops, toward: n.towardEnd })),
            switchLines: transfer ? { at: stationName(transfer.at), to: LINES[transfer.line].name, stationsLeft: transfer.left } : null,
          }
        : undefined,
    };
  },
});

export const stationInfoTool = createTool({
  id: "get-station-info",
  description: "A station's story, fact, mini-game and photo quest in T-Minus. Use when the rider asks about a station or what to do there.",
  inputSchema: z.object({ station: z.string() }),
  execute: async ({ station }) => {
    const slug = findStation(station);
    if (!slug) return { error: `No T-Minus station called "${station}"` };
    const s = STATIONS.find((x) => x.id === slug)!;
    const quest = stationQuest(slug, TEAM[lineOf(slug)]);
    return {
      station: s.name,
      lines: s.lines.map((l) => LINES[l].name),
      realm: LINES[s.lines[0]].realm,
      story: s.story,
      fact: s.fact.title,
      miniGame: `${s.game.title} (${s.game.genre}, ${s.game.time})`,
      photoQuest: quest.prompt,
    };
  },
});

export const conductorTools = {
  nextTrainsTool,
  lineDelaysTool,
  delayBossTool,
  riderProgressTool,
  stationInfoTool,
};
