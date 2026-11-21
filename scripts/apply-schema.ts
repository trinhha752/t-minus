// scripts/apply-schema.ts
// Run once:  npm run db:schema
//
// Applies schema.sql one statement at a time, the way `psql -f` would, so it
// works on a machine without psql. Stops at the first statement that fails.

import fs from "node:fs";
import path from "node:path";
import { pool } from "../lib/db";

function statements(sql: string): string[] {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const file = path.join(process.cwd(), "schema.sql");
  const all = statements(fs.readFileSync(file, "utf8"));

  for (const [i, stmt] of all.entries()) {
    const label = stmt.split("\n")[0].slice(0, 70);
    try {
      await pool.query(stmt);
      console.log(`ok   ${i + 1}/${all.length}  ${label}`);
    } catch (e) {
      const pg = e as { message?: string; code?: string; hint?: string; detail?: string };
      console.error(`FAIL ${i + 1}/${all.length}  ${label}`);
      console.error(`  code:    ${pg.code ?? "-"}`);
      console.error(`  message: ${pg.message ?? "-"}`);
      if (pg.detail) console.error(`  detail:  ${pg.detail}`);
      if (pg.hint) console.error(`  hint:    ${pg.hint}`);
      console.error(`\n--- statement ---\n${stmt}\n`);
      process.exitCode = 1;
      break;
    }
  }
  await pool.end();
}

main().catch((e) => {
  console.error("could not connect:", (e as { code?: string }).code ?? "unknown error");
  process.exit(1);
});
