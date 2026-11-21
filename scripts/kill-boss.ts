// scripts/kill-boss.ts
// End bosses on command:
//   npm run boss:kill                  every manual (fake) boss
//   npm run boss:kill -- --line Green  whatever boss is live on Green, manual or detected
//   npm run boss:kill -- --all         every live boss
//
// Ends them as escaped (not defeated), so nobody gets a badge. A detected
// boss comes back on the next poll if the line is still late.

import { pool, q } from "../lib/db";
import { ALL_TEAMS } from "../types";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const line = arg("line");
  if (line && !(ALL_TEAMS as string[]).includes(line)) {
    throw new Error(`--line must be one of ${ALL_TEAMS.join(", ")}`);
  }

  const where = line
    ? { sql: `line = $1`, params: [line] }
    : process.argv.includes("--all")
      ? { sql: `TRUE`, params: [] }
      : { sql: `source = 'manual'`, params: [] };

  const ended = await q<{ id: number; line: string; source: string; hp_remaining: number }>(
    `UPDATE boss_events SET ended_at = now()
      WHERE ended_at IS NULL AND ${where.sql}
      RETURNING id, line, source, hp_remaining`,
    where.params
  );

  if (ended.length === 0) console.log("No matching live boss.");
  for (const b of ended) {
    console.log(`Ended ${b.source} boss #${b.id} on ${b.line} (${b.hp_remaining} HP left).`);
  }
  await pool.end();
}

main().catch(async (e) => {
  console.error((e as Error).message);
  await pool.end();
  process.exit(1);
});
