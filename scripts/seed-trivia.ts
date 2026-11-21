// scripts/seed-trivia.ts
// Run after seed-stations:  npx tsx scripts/seed-trivia.ts
//
// Loads data/trivia.json into the database. Questions land with
// verified = false, and /api/trivia refuses to serve those. A human has to
// read the source and flip the flag:
//
//   UPDATE trivia_questions SET verified = true WHERE id = 'pktrm-1';
//
// That is deliberate. An AI-written history fact that nobody checked is the
// one thing in this app that can embarrass you in front of a Boston judge.

import fs from "node:fs";
import path from "node:path";
import { pool } from "../lib/db";

interface Q {
  id: string;
  stationId: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
  sourceUrl?: string;
  verified?: boolean;
}

async function main() {
  const file = path.join(process.cwd(), "data", "trivia.json");
  const questions = JSON.parse(fs.readFileSync(file, "utf8")) as Q[];

  let inserted = 0;
  for (const q of questions) {
    if (q.answerIndex < 0 || q.answerIndex >= q.options.length) {
      console.warn(`SKIP ${q.id}: answerIndex out of range`);
      continue;
    }
    await pool.query(
      `INSERT INTO trivia_questions
         (id, station_id, question, options, answer_index, explanation, source_url, verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE
         SET question = EXCLUDED.question,
             options = EXCLUDED.options,
             answer_index = EXCLUDED.answer_index,
             explanation = EXCLUDED.explanation,
             source_url = EXCLUDED.source_url`,
      [
        q.id,
        q.stationId,
        q.question,
        q.options,
        q.answerIndex,
        q.explanation ?? null,
        q.sourceUrl ?? null,
        q.verified === true,
      ]
    );
    inserted++;
  }

  const [{ count: ready }] = (
    await pool.query(`SELECT COUNT(*)::int AS count FROM trivia_questions WHERE verified`)
  ).rows;
  const [{ count: pending }] = (
    await pool.query(`SELECT COUNT(*)::int AS count FROM trivia_questions WHERE NOT verified`)
  ).rows;

  console.log(`Loaded ${inserted} questions.`);
  console.log(`  verified and playable: ${ready}`);
  console.log(`  waiting on a human:    ${pending}`);
  if (ready === 0) {
    console.log("\nNothing is playable yet. Check the facts, then flip verified.");
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
