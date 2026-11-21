// MOCK — weekly totals from users / trivia_answers.
import type { NextRequest } from "next/server";
import type { Leaderboard, LeaderboardRow, TeamLine } from "@/types";
import { fail, ok } from "@/lib/respond";

const TEAM_TOTALS: Record<TeamLine, number> = { Green: 1840, Red: 1520, Orange: 990, Blue: 610 };

const BY_LINE: LeaderboardRow[] = [
  { rank: 1, name: "Green", points: 1840, team: "Green" },
  { rank: 2, name: "Red", points: 1520, team: "Red" },
  { rank: 3, name: "Orange", points: 990, team: "Orange" },
  { rank: 4, name: "Blue", points: 610, team: "Blue" },
];

const BY_USER: LeaderboardRow[] = [
  { rank: 1, name: "Demo Rider", points: 240, team: "Green" },
  { rank: 2, name: "Sim Rider A", points: 180, team: "Red" },
  { rank: 3, name: "Sim Rider B", points: 95, team: "Blue" },
];

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope") ?? "line";
  if (scope !== "line" && scope !== "user") return fail("scope must be line or user");
  const board: Leaderboard = {
    scope,
    rows: scope === "line" ? BY_LINE : BY_USER,
    teamTotals: TEAM_TOTALS,
  };
  return ok(board);
}
