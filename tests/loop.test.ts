// The game loop: where to ride next, and when a line's End Boss opens.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nextStation, lineComplete } from "../components/game/loop";
import { ROUTES } from "../components/run/stations";

test("next is the following unstamped station on your line", () => {
  assert.equal(nextStation("harvard", new Set()), "central");
  assert.equal(nextStation("harvard", new Set(["central", "kendall"])), "charles");
});

test("it wraps around to stations you skipped earlier on the line", () => {
  const played = new Set(ROUTES.red.filter((id) => id !== "alewife"));
  assert.equal(nextStation("south", played), "alewife");
});

test("every station stamped: no next station, End Boss open", () => {
  const all = new Set(ROUTES.red);
  assert.equal(nextStation("harvard", all), null);
  assert.equal(lineComplete("harvard", all), true);
  assert.equal(lineComplete("harvard", new Set(["harvard"])), false);
});

test("orange and green work the same way", () => {
  assert.equal(nextStation("sullivan", new Set()), "ccollege");
  assert.equal(nextStation("bucentral", new Set()), "amory");
});

import { nextAlong, nextStops, pathFor, suggestTransfer } from "../components/game/loop";

test("a B-branch stop's path runs from Lechmere down the trunk and out the B", () => {
  const p = pathFor("bucentral");
  assert.equal(p[0], "lechmere");
  assert.ok(p.indexOf("kenmore") < p.indexOf("bueast") && p.indexOf("bueast") < p.indexOf("bucentral"));
  assert.equal(p[p.length - 1], "harvardave");
});

test("both directions from BU Central: Amory outbound, BU East inbound", () => {
  const [out, inb] = nextStops("bucentral", new Set());
  assert.deepEqual([out.id, out.dir, out.stops], ["amory", 1, 1]);
  assert.deepEqual([inb.id, inb.dir, inb.stops], ["bueast", -1, 1]);
  assert.equal(out.towardEnd, "Harvard Ave");
  assert.equal(inb.towardEnd, "Lechmere");
});

test("stamped stops are skipped; a finished direction drops out", () => {
  assert.equal(nextAlong("bucentral", new Set(["bueast", "blandford"]), -1)?.id, "kenmore");
  assert.equal(nextAlong("alewife", new Set(), -1), null); // end of the line
  assert.equal(nextAlong("harvard", new Set(), -1)?.id, "porter");
});

test("Kenmore outbound looks down the branches", () => {
  assert.equal(nextAlong("kenmore", new Set(), 1)?.id, "blandford");
  assert.equal(nextAlong("kenmore", new Set(["blandford", "bueast", "bucentral", "amory", "babcock", "packards", "harvardave"]), 1)?.id, "stmarys");
});

test("switching lines: the nearest transfer to a line with stops left", () => {
  assert.deepEqual(suggestTransfer("bucentral", new Set()), { at: "park", line: "red", left: 10, stops: 8 });
  const redDone = new Set(["alewife", "davis", "porter", "harvard", "central", "kendall", "charles", "park", "downtown", "south"]);
  assert.equal(suggestTransfer("bucentral", redDone)?.line, "orange"); // Red done: Orange at Haymarket
  assert.equal(suggestTransfer("harvard", new Set())?.at, "park");
});
