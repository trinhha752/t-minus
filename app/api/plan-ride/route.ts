// POST /api/plan-ride { stationId } -> RidePlan
// Runs the plan-ride Mastra workflow (mastra/workflows/plan-ride.ts):
// gather (live trains + Tiger Data delays + boss + progress) -> decide -> narrate.

import { fail, ok, readJson } from "@/lib/respond";
import { currentUserId } from "@/lib/session";
import { mastra } from "@/mastra";
import type { RidePlan } from "@/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await readJson<{ stationId?: string }>(request);
  if (!body || typeof body.stationId !== "string") return fail("expected { stationId }");
  const userId = await currentUserId();
  try {
    const run = await mastra.getWorkflow("planRide").createRun();
    const out = await run.start({ inputData: { station: body.stationId, userId } });
    if (out.status !== "success") return fail(`plan-ride ${out.status}`, 502);
    const r = out.result;
    const plan: RidePlan = {
      goTo: r.goTo,
      takeTrainToward: r.takeTrainToward,
      minutesUntilTrain: r.minutesUntilTrain,
      delayRisk: r.delayRisk,
      fightBoss: r.fightBoss,
      reasons: r.reasons,
      narration: r.narration,
      facts: r.facts,
    };
    return ok(plan);
  } catch (e) {
    console.error("[plan-ride]", (e as Error).message);
    return fail("Couldn't plan the ride right now", 502);
  }
}
