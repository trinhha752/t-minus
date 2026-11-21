// POST /api/final-boss/start { chapterId, demo? }  (demo: 300 HP instead of 1000)
// Starts this rider's final boss fight, spending their buffs, or resumes an open one.
import { startFinalBoss, GameRuleError } from "@/lib/progress";
import { currentUserId } from "@/lib/session";
import { fail, ok, readJson } from "@/lib/respond";
import type { FinalBossStartRequest } from "@/types";

export async function POST(request: Request) {
  const body = await readJson<FinalBossStartRequest>(request);
  if (!body || typeof body.chapterId !== "string") return fail("expected { chapterId }");

  try {
    return ok(await startFinalBoss(await currentUserId(), body.chapterId, body.demo === true));
  } catch (e) {
    if (e instanceof GameRuleError) return fail(e.message);
    console.error("[final-boss/start]", e);
    return fail("could not start the fight", 500);
  }
}
