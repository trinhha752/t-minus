// Owner: Transit. MOCK — replace with boss_events + prediction_snapshots.
import type { BossResponse } from "@/types";
import { ok } from "@/lib/respond";

const MOCK: BossResponse = [
  { line: "Red", active: false, bossEventId: null, hpTotal: 0, hpRemaining: 0, averageDelaySeconds: 40, since: null },
  {
    line: "Green",
    active: true,
    bossEventId: "boss-mock-1",
    hpTotal: 200,
    hpRemaining: 130,
    averageDelaySeconds: 420,
    since: "2026-11-21T15:00:00Z",
  },
  { line: "Orange", active: false, bossEventId: null, hpTotal: 0, hpRemaining: 0, averageDelaySeconds: 60, since: null },
  { line: "Blue", active: false, bossEventId: null, hpTotal: 0, hpRemaining: 0, averageDelaySeconds: 20, since: null },
];

export async function GET() {
  return ok(MOCK);
}
