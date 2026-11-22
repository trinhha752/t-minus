// GET /api/boss/persona?line=Orange -> { name, taunt, source } for the live Delay Boss,
// written by Gemini from the real delay the first time (lib/bossPersona.ts).
// 404 when there's no boss on the line or Gemini is busy: the UI keeps its own names.

import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/respond";
import { bossPersona } from "@/lib/bossPersona";
import type { TeamLine } from "@/types";
import { ALL_TEAMS } from "@/types";

export async function GET(req: NextRequest) {
  const line = req.nextUrl.searchParams.get("line") as TeamLine | null;
  if (!line || !ALL_TEAMS.includes(line)) return fail("line must be Red, Orange, Blue or Green");
  const persona = await bossPersona(line);
  return persona ? ok(persona) : fail("no named boss right now", 404);
}
