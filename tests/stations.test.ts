// The backend reads the UI's station list. These fail loudly if the two drift.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { CHAPTERS, UNMAPPED_SLUGS, gameIdFor, toMbtaId, toSlug } from "../lib/chapters";
import { STATIONS } from "../components/run/stations";

const known = new Set(
  (JSON.parse(fs.readFileSync("data/stations.json", "utf8")) as { id: string }[]).map((s) => s.id)
);

test("every UI station has an MBTA id in data/station-ids.json", () => {
  assert.deepEqual(UNMAPPED_SLUGS, [], `add these to data/station-ids.json: ${UNMAPPED_SLUGS.join(", ")}`);
});

test("every mapped MBTA id is a real subway station", () => {
  for (const s of STATIONS) {
    const id = toMbtaId(s.id);
    assert.ok(id && known.has(id), `${s.id} -> ${id} is not in data/stations.json`);
  }
});

test("slug and MBTA id convert both ways", () => {
  assert.equal(toMbtaId("harvard"), "place-harsq");
  assert.equal(toMbtaId("place-harsq"), "place-harsq");
  assert.equal(toSlug("place-harsq"), "harvard");
  assert.equal(toMbtaId("nowhere"), null);
});

test("chapters follow the UI routes, boss at the end of each", () => {
  const red = CHAPTERS.find((c) => c.id === "red")!;
  assert.equal(red.stations[0].slug, "alewife");
  assert.equal(red.bossStationId, "place-sstat");
  assert.equal(CHAPTERS.find((c) => c.id === "green")!.bossStationId, "place-kencl");
});

test("game ids are stable kebab-case titles, unique within a chapter", () => {
  assert.equal(gameIdFor("Rindge's Gift"), "rindges-gift");
  assert.equal(gameIdFor("Rush Hour 1899"), "rush-hour-1899");
  for (const c of CHAPTERS) {
    const ids = c.stations.map((s) => s.gameId);
    assert.equal(new Set(ids).size, ids.length, `duplicate game id in ${c.id}`);
  }
});
