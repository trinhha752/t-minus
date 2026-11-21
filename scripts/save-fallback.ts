// scripts/save-fallback.ts
// Demo insurance:  npm run seed:fallback
//
// Saves real MBTA responses verbatim to public/seed/mbta-fallback.json.
// lib/mbta.ts serves them when USE_SEED=1 or when a live call fails, with
// every timestamp shifted forward so the saved arrivals are never "in the past".
// Re-run it whenever you want a fresher snapshot. Run it once while the
// trains are busy, so the offline map has plenty on it.

import fs from "node:fs";
import path from "node:path";
import {
  SEED_FILE,
  mbtaFetchLive,
  predictionsRequest,
  vehiclesRequest,
  type MbtaRequest,
  type SeedFile,
} from "../lib/mbta";

// The five persona stations: every demo path starts at one of these.
const STOPS = ["place-pktrm", "place-bucen", "place-harsq", "place-aqucl", "place-chncl"];

async function main() {
  const requests: MbtaRequest[] = [vehiclesRequest(), ...STOPS.map(predictionsRequest)];

  const out: SeedFile = { _savedAt: new Date().toISOString() };
  for (const req of requests) {
    const doc = await mbtaFetchLive(req);
    out[req.key] = doc;
    console.log(`  ${req.key.padEnd(70)} ${doc.data.length} rows`);
  }

  fs.mkdirSync(path.dirname(SEED_FILE), { recursive: true });
  fs.writeFileSync(SEED_FILE, JSON.stringify(out, null, 2));
  console.log(`Saved ${requests.length} responses to ${path.relative(process.cwd(), SEED_FILE)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
