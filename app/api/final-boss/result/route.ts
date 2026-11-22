// POST /api/final-boss/result { chapterId, won, demo? }
// The outcome of an End Boss fight played in the browser (the parry-and-attack
// fight). A first win marks the chapter's boss defeated, +2500 points and a badge.
import { recordFinalBossResult, GameRuleError } from "@/lib/progress";
import { currentUserId } from "@/lib/session";
import { fail, ok, readJson } from "@/lib/respond";

export async function POST(request: Request) {
  const body = await readJson<{ chapterId?: string; won?: boolean; demo?: boolean }>(request);
  if (!body || typeof body.chapterId !== "string" || typeof body.won !== "boolean") {
    return fail("expected { chapterId, won, demo? }");
  }
  try {
    return ok(await recordFinalBossResult(await currentUserId(), body.chapterId, body.won, body.demo === true));
  } catch (e) {
    if (e instanceof GameRuleError) return fail(e.message);
    console.error("[final-boss/result]", e);
    return fail("could not record the result", 500);
  }
}
