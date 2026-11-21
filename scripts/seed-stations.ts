// scripts/seed-stations.ts
// Run once:  npx tsx scripts/seed-stations.ts
//
// Pulls every subway station from the MBTA, writes data/stations.json for
// reference, upserts them into Postgres, then layers the hand-written
// personas from data/personas.json on top.
//
// CHECK THE OUTPUT. It prints the first few stop ids. They should look like
// "place-pktrm". If you see numeric ids such as "70061", the parent_station
// follow did not work and predictions filtered by those ids will behave
// differently. Fix it before building on top.

import fs from "node:fs";
import path from "node:path";
import { getStationsForRoute } from "../lib/mbta";
import { pool } from "../lib/db";
import { ALL_ROUTES } from "../types";
import type { Station } from "../types";

interface Persona {
  id: string;
  characterName: string;
  persona: string;
  legend: string;
  questSeeds: string[];
}

async function main() {
  const merged = new Map<string, Station>();

  for (const route of ALL_ROUTES) {
    const stations = await getStationsForRoute(route);
    for (const s of stations) {
      const existing = merged.get(s.id);
      if (existing) {
        for (const r of s.routes) {
          if (!existing.routes.includes(r)) existing.routes.push(r);
        }
      } else {
        merged.set(s.id, s);
      }
    }
    console.log(`  ${route}: ${stations.length} stations`);
  }

  const all = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
  console.log(`\n${all.length} unique stations.`);
  console.log("Sample ids (should look like place-xxxxx):");
  for (const s of all.slice(0, 5)) console.log(`  ${s.id}  ${s.name}`);

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, "stations.json"),
    JSON.stringify(all, null, 2)
  );

  for (const s of all) {
    await pool.query(
      `INSERT INTO stations (id, name, routes, lat, lon)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             routes = EXCLUDED.routes,
             lat = EXCLUDED.lat,
             lon = EXCLUDED.lon`,
      [s.id, s.name, s.routes, s.lat, s.lon]
    );
  }
  console.log("Stations upserted.");

  /* ---- personas ---- */

  const personaFile = path.join(dataDir, "personas.json");
  if (!fs.existsSync(personaFile)) {
    console.log("No data/personas.json, skipping characters.");
    await pool.end();
    return;
  }

  const personas = JSON.parse(fs.readFileSync(personaFile, "utf8")) as Persona[];
  let applied = 0;
  const missing: string[] = [];

  for (const p of personas) {
    const res = await pool.query(
      `UPDATE stations
          SET character_name = $2, persona = $3, legend = $4, quest_seeds = $5
        WHERE id = $1`,
      [p.id, p.characterName, p.persona, p.legend, p.questSeeds]
    );
    if (res.rowCount === 0) missing.push(p.id);
    else applied++;
  }

  console.log(`Personas applied to ${applied} stations.`);
  if (missing.length) {
    console.warn(
      `WARNING: these persona ids matched no station, so the stop id is wrong: ${missing.join(", ")}`
    );
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
