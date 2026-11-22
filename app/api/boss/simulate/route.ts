// POST /api/boss/simulate { line } — demo only. Makes sure a Delay Boss is up
// on this line: reuses the real one if there is one, otherwise starts a manual
// boss (like `npm run boss:fake`). The map's "Simulate delay" button uses it.

import { fail, ok, readJson } from "@/lib/respond";
import { one } from "@/lib/db";
import { BOSS_HP_MIN } from "@/lib/scoring";
import type { TeamLine } from "@/types";
import { ALL_TEAMS } from "@/types";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DEMO_MODE !== "1") {
    return fail("only available in demo mode", 403);
  }
  const body = await readJson<{ line?: TeamLine }>(request);
  if (!body?.line || !ALL_TEAMS.includes(body.line)) return fail("expected { line: Red | Orange | Blue | Green }");

  const live = await one<{ id: number; source: string }>(
    `SELECT id, source FROM boss_events WHERE line = $1 AND ended_at IS NULL`,
    [body.line]
  );
  if (live) return ok({ id: String(live.id), started: false, source: live.source });

  const boss = await one<{ id: number }>(
    `INSERT INTO boss_events (line, hp_total, hp_remaining, source)
     VALUES ($1, $2, $2, 'manual')
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [body.line, BOSS_HP_MIN]
  );
  return ok({ id: boss ? String(boss.id) : null, started: !!boss, source: "manual" });
}
