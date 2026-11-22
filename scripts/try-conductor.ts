// scripts/try-conductor.ts — talk to the Conductor and run plan-ride from the terminal.
//   npm run conductor -- "Should I wait for the next train?" bucentral
import { RequestContext } from "@mastra/core/request-context";
import { mastra } from "../mastra";
import { one } from "../lib/db";

const question = process.argv[2] ?? "When is my next train, and is the line running late?";
const station = process.argv[3] ?? "bucentral";

async function main() {
  // Any rider will do; use the most recent one.
  const rider = await one<{ id: string }>(`SELECT id FROM users ORDER BY created_at DESC LIMIT 1`);
  if (!rider) throw new Error("no riders yet: open the game once first");
  const requestContext = new RequestContext();
  requestContext.set("userId", rider.id);

  const agent = mastra.getAgent("conductor");
  const t0 = Date.now();
  const res = await agent.generate(`[Rider is at ${station}] ${question}`, {
    requestContext,
    memory: { resource: rider.id, thread: `${rider.id}:conductor:cli` },
    maxSteps: 6,
  });
  console.log(`\nQ: ${question}`);
  console.log(`tools: ${res.toolCalls.map((c) => c.payload.toolName).join(", ") || "(none)"}`);
  console.log(`A (${((Date.now() - t0) / 1000).toFixed(1)}s): ${res.text}\n`);

  const run = await mastra.getWorkflow("planRide").createRun();
  const t1 = Date.now();
  const out = await run.start({ inputData: { station, userId: rider.id } });
  if (out.status === "success") {
    console.log(`plan-ride (${((Date.now() - t1) / 1000).toFixed(1)}s): go to ${out.result.goTo}, toward ${out.result.takeTrainToward} in ${out.result.minutesUntilTrain} min, risk ${out.result.delayRisk}`);
    console.log(`  narration: ${out.result.narration}`);
  } else {
    console.log("plan-ride:", out.status, JSON.stringify(out).slice(0, 300));
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
