// scripts/fake-boss.ts
// Start a boss on command, for the demo and for frontend work:
//   npm run boss:fake                        Green if it has no boss, else the first clean line
//   npm run boss:fake -- --line Red          that line; ends any boss already live on it
//   npm run boss:fake -- --line Green --hp 120
//
// The boss is source='manual', so the poller never retires it. It ends when
// riders drain it, or with `npm run boss:kill`.

import { pool, q } from "../lib/db";
import { ALL_TEAMS, type TeamLine } from "../types";
import { BOSS_HP_MIN } from "../lib/scoring";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const live = await q<{ line: TeamLine }>(`SELECT line FROM boss_events WHERE ended_at IS NULL`);
  const busy = new Set(live.map((r) => r.line));

  const requested = arg("line");
  if (requested && !(ALL_TEAMS as string[]).includes(requested)) {
    throw new Error(`--line must be one of ${ALL_TEAMS.join(", ")}`);
  }
  const line: TeamLine =
    (requested as TeamLine | undefined) ??
    (!busy.has("Green") ? "Green" : ALL_TEAMS.find((l) => !busy.has(l)) ?? "Green");

  const hp = Number(arg("hp") ?? BOSS_HP_MIN);
  if (!Number.isInteger(hp) || hp <= 0) throw new Error("--hp must be a positive whole number");

  // One live boss per line (unique index), so clear the way first.
  const ended = await q<{ id: number; source: string }>(
    `UPDATE boss_events SET ended_at = now()
      WHERE line = $1 AND ended_at IS NULL
      RETURNING id, source`,
    [line]
  );
  for (const b of ended) console.log(`Ended live ${b.source} boss #${b.id} on ${line}.`);

  const [boss] = await q<{ id: number }>(
    `INSERT INTO boss_events (line, hp_total, hp_remaining, source)
     VALUES ($1, $2, $2, 'manual') RETURNING id`,
    [line, hp]
  );
  console.log(`Boss #${boss.id} is up on ${line} with ${hp} HP.`);
  await pool.end();
}

main().catch(async (e) => {
  console.error((e as Error).message);
  await pool.end();
  process.exit(1);
});
