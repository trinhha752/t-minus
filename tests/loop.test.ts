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
