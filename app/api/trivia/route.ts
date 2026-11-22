// GET /api/trivia?stop=place-pktrm&wait=240   a round for one station, sized to the wait
// GET /api/trivia?line=Red                     a Delay Boss fight: 10 questions from that line's stations
//
// `stop` accepts a UI slug ("park") or an MBTA id. Never sends the answer:
// the whole game would be one view-source away.

import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/respond";
import { q, one } from "@/lib/db";
import { roundSize } from "@/lib/scoring";
import { toMbtaId } from "@/lib/chapters";
import { questionsForStations } from "@/lib/trivia";
import type { RouteId, TeamLine, TriviaRound } from "@/types";
import { ALL_TEAMS, routeToTeam } from "@/types";

const BOSS_FIGHT_QUESTIONS = 10;

async function liveBossOn(lines: TeamLine[]): Promise<boolean> {
  const live = await q(`SELECT 1 FROM boss_events WHERE ended_at IS NULL AND line = ANY($1::text[])`, [lines]);
  return live.length > 0;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const line = params.get("line");

  if (line) {
    if (!(ALL_TEAMS as string[]).includes(line)) return fail("line must be Red, Orange, Blue or Green");
    const stations = await q<{ id: string }>(
      `SELECT id FROM stations s
        WHERE EXISTS (SELECT 1 FROM unnest(s.routes) r
                       WHERE CASE WHEN r LIKE 'Green%' THEN 'Green' ELSE r END = $1)`,
      [line]
    );
    const round: TriviaRound = {
      roundId: `${line}_${Date.now()}`,
      stationId: "",
      questions: await questionsForStations(stations.map((s) => s.id), BOSS_FIGHT_QUESTIONS),
      bossActive: await liveBossOn([line as TeamLine]),
    };
    return ok(round);
  }

  const raw = params.get("stop");
  if (!raw) return fail("stop or line is required", 400);
  const stop = toMbtaId(raw) ?? raw;
  const wait = Number(params.get("wait") ?? "300");

  const station = await one<{ routes: string[] }>(`SELECT routes FROM stations WHERE id = $1`, [stop]);
  if (!station) return fail("unknown station", 404);

  // Is a boss up on any line this station serves?
  const lines = [...new Set((station.routes as RouteId[]).map(routeToTeam))];
  const bossActive = await liveBossOn(lines);

  const round: TriviaRound = {
    roundId: `${stop}_${Date.now()}`,
    stationId: stop,
    questions: await questionsForStations([stop], roundSize(wait, bossActive)),
    bossActive,
  };
  return ok(round);
}
