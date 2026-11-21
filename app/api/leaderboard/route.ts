// GET /api/leaderboard?scope=line|user
// scope=line: the four teams ranked by their riders' total points.
// scope=user: the top 20 riders. teamTotals always comes back, for the map.

import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/respond";
import { q } from "@/lib/db";
import type { Leaderboard, LeaderboardRow, TeamLine } from "@/types";
import { ALL_TEAMS } from "@/types";

const TOP_RIDERS = 20;

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope") ?? "line";
  if (scope !== "line" && scope !== "user") return fail("scope must be line or user");

  const totals = await q<{ team_line: TeamLine; points: string }>(
    `SELECT team_line, COALESCE(SUM(points), 0) AS points FROM users GROUP BY team_line`
  );
  const teamTotals = Object.fromEntries(ALL_TEAMS.map((t) => [t, 0])) as Record<TeamLine, number>;
  for (const t of totals) teamTotals[t.team_line] = Number(t.points);

  let rows: LeaderboardRow[];
  if (scope === "line") {
    rows = [...ALL_TEAMS]
      .sort((a, b) => teamTotals[b] - teamTotals[a])
      .map((team, i) => ({ rank: i + 1, name: team, points: teamTotals[team], team }));
  } else {
    const riders = await q<{ name: string; points: number; team_line: TeamLine }>(
      `SELECT name, points, team_line FROM users WHERE points > 0
        ORDER BY points DESC, created_at LIMIT $1`,
      [TOP_RIDERS]
    );
    rows = riders.map((r, i) => ({ rank: i + 1, name: r.name, points: r.points, team: r.team_line }));
  }

  const board: Leaderboard = { scope, rows, teamTotals };
  return ok(board);
}
