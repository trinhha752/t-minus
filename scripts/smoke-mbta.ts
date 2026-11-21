// scripts/smoke-mbta.ts
// Prints the next 3 arrivals at Park Street and a vehicle count per line.
//   npm run smoke:mbta                 live
//   USE_SEED=1 npm run smoke:mbta      from public/seed/mbta-fallback.json

import { getPredictions, getVehicles } from "../lib/mbta";
import { ALL_ROUTES } from "../types";

function fmt(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.abs(seconds) % 60;
  return `${seconds < 0 ? "-" : ""}${m}m ${String(s).padStart(2, "0")}s`;
}

async function main() {
  console.log(`source: ${process.env.USE_SEED === "1" ? "seed file" : "live MBTA"}\n`);

  const arrivals = await getPredictions("place-pktrm", 3);
  console.log("Next 3 at Park Street:");
  for (const a of arrivals) {
    console.log(`  ${a.route.padEnd(8)} ${(a.headsign ?? "?").padEnd(22)} ${fmt(a.secondsAway)}`);
  }
  if (arrivals.length < 3) console.log(`  (only ${arrivals.length} arrival(s) found)`);

  const vehicles = await getVehicles();
  const counts = ALL_ROUTES.map((r) => `${r} ${vehicles.filter((v) => v.route === r).length}`);
  console.log(`\nVehicles: ${vehicles.length} (${counts.join(", ")})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
