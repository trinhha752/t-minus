// scripts/poll-predictions.ts
// Run this for the whole hackathon:  npx tsx scripts/poll-predictions.ts
//
// Every 15 seconds it diffs predicted against scheduled times for all seven
// subway routes, writes a row per prediction into the Tiger Data hypertable,
// and reconciles bosses. The longer it runs, the better the delay chart looks
// at the demo, so start it early and leave it alone.
//
// One call per route (not per stop) keeps this at 7 requests a cycle.

import { mbtaGet } from "../lib/mbta";
import { pool } from "../lib/db";
import { reconcileBosses, type DelaySample } from "../lib/boss";
import { ALL_ROUTES, type RouteId } from "../types";

const INTERVAL_MS = 15_000;

interface Row {
  stopId: string;
  route: RouteId;
  directionId: number;
  predicted: string;
  scheduled: string;
  delaySeconds: number;
}

async function collectRoute(route: RouteId): Promise<Row[]> {
  // No page limit: a page of 200 could cut off part of a busy route.
  const doc = await mbtaGet({
    endpoint: "/predictions",
    params: { "filter[route]": route, include: "schedule" },
    key: `poll:${route}`,
  });

  // Scheduled times arrive in `included`, keyed by schedule id.
  const scheduled = new Map<string, string>();
  for (const inc of doc.included ?? []) {
    if (inc.type !== "schedule") continue;
    const t = inc.attributes.arrival_time ?? inc.attributes.departure_time;
    if (typeof t === "string") scheduled.set(inc.id, t);
  }

  const rows: Row[] = [];
  for (const p of doc.data) {
    const predicted =
      (p.attributes.arrival_time as string | null) ??
      (p.attributes.departure_time as string | null);
    if (!predicted) continue; // train is skipping this stop

    const schedId = p.relationships?.schedule?.data?.id;
    const sched = schedId ? scheduled.get(schedId) : undefined;
    if (!sched) continue; // no schedule to compare against, so no delay

    const stopId = p.relationships?.stop?.data?.id;
    if (!stopId) continue;

    rows.push({
      stopId,
      route,
      directionId: Number(p.attributes.direction_id ?? 0),
      predicted,
      scheduled: sched,
      delaySeconds: Math.round((Date.parse(predicted) - Date.parse(sched)) / 1000),
    });
  }
  return rows;
}

async function tick() {
  const all: Row[] = [];

  for (const route of ALL_ROUTES) {
    try {
      all.push(...(await collectRoute(route)));
    } catch (e) {
      console.warn(`[poll] ${route} failed:`, (e as Error).message);
    }
  }

  if (all.length === 0) {
    console.warn("[poll] nothing collected this cycle");
    return;
  }

  // One multi-row insert beats 500 round trips.
  const values: unknown[] = [];
  const tuples = all.map((r, i) => {
    const b = i * 5;
    values.push(r.stopId, r.route, r.directionId, r.predicted, r.scheduled);
    return `(now(), $${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}::timestamptz, $${b + 5}::timestamptz,
             EXTRACT(EPOCH FROM ($${b + 4}::timestamptz - $${b + 5}::timestamptz))::int)`;
  });

  await pool.query(
    `INSERT INTO prediction_snapshots
       (observed_at, stop_id, route, direction_id, predicted_at, scheduled_at, delay_seconds)
     VALUES ${tuples.join(",")}`,
    values
  );

  const samples: DelaySample[] = all.map((r) => ({
    route: r.route,
    stopId: r.stopId,
    delaySeconds: r.delaySeconds,
  }));

  await reconcileBosses(samples);

  const worst = Math.max(...all.map((r) => r.delaySeconds));
  console.log(
    `[poll] ${new Date().toLocaleTimeString()} wrote ${all.length} rows, worst delay ${worst}s`
  );
}

async function main() {
  console.log("[poll] started, every 15s. Ctrl-C to stop.");
  await tick();
  setInterval(() => {
    tick().catch((e) => console.error("[poll] tick failed:", e));
  }, INTERVAL_MS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
