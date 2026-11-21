// GET /api/trivia?stop=place-pktrm&wait=240
//
// Returns a round sized to the wait. Never sends answer_index: the whole
// game would be one view-source away.

import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/respond";
import { q, one } from "@/lib/db";
import { roundSize } from "@/lib/scoring";
import type { RouteId, TriviaQuestion, TriviaRound } from "@/types";
import { routeToTeam } from "@/types";

export async function GET(req: NextRequest) {
  const stop = req.nextUrl.searchParams.get("stop");
  const wait = Number(req.nextUrl.searchParams.get("wait") ?? "300");
  if (!stop) return fail("stop is required", 400);

  const station = await one<{ routes: string[] }>(
    `SELECT routes FROM stations WHERE id = $1`,
    [stop]
  );
  if (!station) return fail("unknown station", 404);

  // Is a boss up on any line this station serves?
  const lines = [...new Set((station.routes as RouteId[]).map(routeToTeam))];
  const live = await q<{ line: string }>(
    `SELECT line FROM boss_events
      WHERE ended_at IS NULL AND line = ANY($1::text[])`,
    [lines]
  );
  const bossActive = live.length > 0;

  const n = roundSize(wait, bossActive);

  // verified = true only. An unchecked fact never reaches a player.
  const rows = await q<{ id: string; question: string; options: string[] }>(
    `SELECT id, question, options
       FROM trivia_questions
      WHERE station_id = $1 AND verified
      ORDER BY random()
      LIMIT $2`,
    [stop, n]
  );

  const questions: TriviaQuestion[] = rows.map((r) => ({
    id: r.id,
    stationId: stop,
    question: r.question,
    options: r.options,
    verified: true,
  }));

  const round: TriviaRound = {
    roundId: `${stop}_${Date.now()}`,
    stationId: stop,
    questions,
    bossActive,
  };

  return ok(round);
}
