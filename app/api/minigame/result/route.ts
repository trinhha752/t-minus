// POST /api/minigame/result { stationId, gameId, score, cleared, durationMs }
// Records a finished mini-game. A cleared run counts toward the chapter, and
// clearing the last station of a chapter unlocks its final boss.
import { recordMiniGame, GameRuleError } from "@/lib/progress";
import { currentUserId } from "@/lib/session";
import { fail, ok, readJson } from "@/lib/respond";
import type { MiniGameResultRequest } from "@/types";

export async function POST(request: Request) {
  const body = await readJson<MiniGameResultRequest>(request);
  if (
    !body ||
    typeof body.stationId !== "string" ||
    typeof body.gameId !== "string" ||
    typeof body.score !== "number" ||
    typeof body.cleared !== "boolean" ||
    typeof body.durationMs !== "number"
  ) {
    return fail("expected { stationId, gameId, score, cleared, durationMs }");
  }

  try {
    return ok(await recordMiniGame(await currentUserId(), body));
  } catch (e) {
    if (e instanceof GameRuleError) return fail(e.message);
    console.error("[minigame]", e);
    return fail("could not record the run", 500);
  }
}
