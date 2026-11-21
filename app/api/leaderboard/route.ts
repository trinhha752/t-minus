// Owner: Backend. MOCK — weekly totals from users / trivia_answers.
import type { NextRequest } from "next/server";
import type { LeaderboardResponse } from "@/types";
import { fail, ok } from "@/lib/respond";

const BY_LINE: LeaderboardResponse = [
  { rank: 1, name: "Green", points: 1840, line: "Green" },
  { rank: 2, name: "Red", points: 1520, line: "Red" },
  { rank: 3, name: "Orange", points: 990, line: "Orange" },
  { rank: 4, name: "Blue", points: 610, line: "Blue" },
];

const BY_USER: LeaderboardResponse = [
  { rank: 1, name: "Demo Rider", points: 240, line: "Green" },
  { rank: 2, name: "Sim Rider A", points: 180, line: "Red" },
  { rank: 3, name: "Sim Rider B", points: 95, line: "Blue" },
];

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope") ?? "line";
  if (scope === "line") return ok(BY_LINE);
  if (scope === "user") return ok(BY_USER);
  return fail("scope must be line or user");
}
