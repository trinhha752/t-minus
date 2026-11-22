// mastra/workflows/plan-ride.ts
// "Plan my ride": a fixed three-step Mastra workflow (the Conductor agent handles
// open-ended chat; this is the predictable path the map's button uses).
//   1. gather   live trains + Tiger Data delay trend + Delay Boss + rider progress, in parallel
//   2. decide   rule-based: where to go next, which train, how risky the delay is
//   3. narrate  the Conductor phrases the plan in one or two in-character sentences

import { createStep, createWorkflow } from "@mastra/core/workflows";
import { RequestContext } from "@mastra/core/request-context";
import { z } from "zod";
import { delayBossTool, findStation, lineDelaysTool, nextTrainsTool, riderProgressTool } from "../tools/transit";
import { conductor } from "../agents/conductor";
import { lineOf } from "@/components/game/loop";
import { STATIONS } from "@/components/run/stations";

const TEAM = { red: "Red", green: "Green", orange: "Orange" } as const;

const input = z.object({ station: z.string(), userId: z.string() });

const train = z.object({ line: z.string(), toward: z.string().nullable(), minutesAway: z.number(), status: z.string() });
const stop = z.object({ station: z.string(), stopsAway: z.number(), toward: z.string() });
const transfer = z.object({ at: z.string(), to: z.string(), stationsLeft: z.number() });

const facts = z.object({
  station: z.string(),
  line: z.enum(["Red", "Green", "Orange"]),
  trains: z.array(train),
  lateNowPct: z.number().nullable(),
  trend: z.string().nullable(),
  boss: z.object({ active: z.boolean(), name: z.string().optional(), hpRemaining: z.number().optional() }),
  nextStops: z.array(stop),
  switchLines: transfer.nullable(),
  stampedOnLine: z.string(),
});

const plan = z.object({
  goTo: z.string().nullable(),
  takeTrainToward: z.string().nullable(),
  minutesUntilTrain: z.number().nullable(),
  delayRisk: z.enum(["low", "medium", "high"]),
  fightBoss: z.boolean(),
  reasons: z.array(z.string()),
  facts,
});

const result = plan.extend({ narration: z.string() });

/** Tools are plain functions too: call them with a request context carrying the rider. */
function toolContext(userId: string) {
  const requestContext = new RequestContext();
  requestContext.set("userId", userId);
  return { requestContext } as unknown as Parameters<NonNullable<typeof nextTrainsTool.execute>>[1];
}

const gather = createStep({
  id: "gather",
  description: "Live trains, Tiger Data delay trend, Delay Boss and the rider's progress, in parallel",
  inputSchema: input,
  outputSchema: facts,
  execute: async ({ inputData }) => {
    const slug = findStation(inputData.station);
    if (!slug) throw new Error(`Unknown station ${inputData.station}`);
    const line = TEAM[lineOf(slug)];
    const c = toolContext(inputData.userId);
    const [trains, delays, boss, progress] = await Promise.all([
      nextTrainsTool.execute!({ station: slug }, c),
      lineDelaysTool.execute!({ line, hours: 3 }, c),
      delayBossTool.execute!({ line }, c),
      riderProgressTool.execute!({ fromStation: slug }, c),
    ]);
    const t = trains as { trains?: z.infer<typeof train>[] };
    const d = delays as { lateNowPct?: number; trend?: string };
    const b = boss as { active: boolean; name?: string; hpRemaining?: number };
    const p = progress as {
      lines?: { line: string; stamped: number; total: number }[];
      next?: { stops: z.infer<typeof stop>[]; switchLines: z.infer<typeof transfer> | null };
    };
    const mine = p.lines?.find((l) => l.line === line);
    return {
      station: STATIONS.find((s) => s.id === slug)!.name,
      line,
      trains: t.trains ?? [],
      lateNowPct: d.lateNowPct ?? null,
      trend: d.trend ?? null,
      boss: { active: b.active, name: b.name, hpRemaining: b.hpRemaining },
      nextStops: p.next?.stops ?? [],
      switchLines: p.next?.switchLines ?? null,
      stampedOnLine: mine ? `${mine.stamped}/${mine.total}` : "?",
    };
  },
});

const decide = createStep({
  id: "decide",
  description: "Rule-based plan: next stop, which train, delay risk, whether to fight the boss",
  inputSchema: facts,
  outputSchema: plan,
  execute: async ({ inputData: f }) => {
    const reasons: string[] = [];
    const goal = f.nextStops[0] ?? null;
    // Prefer a train heading toward the next stop's end of the line; otherwise the soonest.
    const word = goal?.toward.toLowerCase().split(" ")[0] ?? "";
    const ride = (word && f.trains.find((t) => t.toward?.toLowerCase().includes(word))) || f.trains[0] || null;
    const late = f.lateNowPct ?? 0;
    const delayRisk: "low" | "medium" | "high" = late >= 50 ? "high" : late >= 25 || f.trend === "getting worse" ? "medium" : "low";
    if (goal) reasons.push(`${goal.station} is your closest unstamped stop, ${goal.stopsAway} stop${goal.stopsAway > 1 ? "s" : ""} away.`);
    else if (f.switchLines) reasons.push(`You've stamped this stretch: switch to the ${f.switchLines.to} at ${f.switchLines.at}.`);
    if (ride) reasons.push(`Next train toward ${ride.toward ?? "?"} in ${ride.minutesAway} min.`);
    if (f.lateNowPct != null) reasons.push(`${f.lateNowPct}% of ${f.line} Line trains are 5+ min late (${f.trend}).`);
    if (f.boss.active) reasons.push(`${f.boss.name} is up with ${f.boss.hpRemaining} HP: fight it while you wait.`);
    return {
      goTo: goal?.station ?? f.switchLines?.at ?? null,
      takeTrainToward: ride?.toward ?? null,
      minutesUntilTrain: ride?.minutesAway ?? null,
      delayRisk,
      fightBoss: f.boss.active,
      reasons,
      facts: f,
    };
  },
});

const narrate = createStep({
  id: "narrate",
  description: "The Conductor says the plan in character",
  inputSchema: plan,
  outputSchema: result,
  execute: async ({ inputData: p }) => {
    let narration = p.reasons.join(" ");
    try {
      const res = await conductor.generate(
        `Tell the rider at ${p.facts.station} this ride plan in at most 2 short sentences, in character. ` +
          `Use only these facts and call no tools: ${p.reasons.join(" ")}`,
        { maxSteps: 1 }
      );
      if (res.text?.trim()) narration = res.text.trim();
    } catch {
      /* Gemini busy: the plain reasons still read fine */
    }
    return { ...p, narration };
  },
});

export const planRide = createWorkflow({
  id: "plan-ride",
  description: "Plan the rider's next move from where they stand: live trains, delay trend, boss, progress",
  inputSchema: input,
  outputSchema: result,
})
  .then(gather)
  .then(decide)
  .then(narrate)
  .commit();
