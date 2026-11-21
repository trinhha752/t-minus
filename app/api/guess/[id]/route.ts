// GET /api/guess/:id
// Poll every 10s. Resolves once the guessed train reaches the platform:
// resolved=true with actualMinutes and pointsEarned. If the train is
// cancelled, it resolves with actualMinutes=null and 0 points.

import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/respond";
import { currentUserId } from "@/lib/session";
import { checkGuess } from "@/lib/guess";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/guess/[id]">) {
  const { id } = await ctx.params;
  const guess = await checkGuess(await currentUserId(), id);
  return guess ? ok(guess) : fail("no such guess", 404);
}
