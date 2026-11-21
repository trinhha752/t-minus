// scripts/sql.ts
// Run one SQL statement against DATABASE_URL and print the rows as a table.
//   npm run sql -- "SELECT count(*) FROM stations"
// For machines without psql.

import { pool } from "../lib/db";

async function main() {
  const text = process.argv.slice(2).join(" ");
  if (!text) {
    console.error('usage: npm run sql -- "SELECT ..."');
    process.exit(1);
  }
  const res = await pool.query(text);
  if (res.rows.length) console.table(res.rows);
  else console.log(`${res.command} ${res.rowCount ?? 0}`);
  await pool.end();
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
