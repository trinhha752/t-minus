// Unit tests for the boss detector. Pure function, no database, no MBTA.
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateLines, type DelaySample } from "../lib/boss";
import type { RouteId } from "../types";

let t0 = 1_700_000_000_000;
/** One prediction. Each call is a new stop unless you reuse the tripId. */
function s(route: RouteId, tripId: string, delaySeconds: number, minutesOut = 1): DelaySample {
  return { route, tripId, stopId: `stop-${t0++}`, predictedMs: 1_700_000_000_000 + minutesOut * 60_000, delaySeconds };
}
const verdict = (samples: DelaySample[], alerts: RouteId[] = []) =>
  Object.fromEntries(evaluateLines(samples, new Set(alerts)).map((v) => [v.line, v]));

test("no samples: every line is clean", () => {
  const v = verdict([]);
  for (const line of ["Red", "Orange", "Blue", "Green"]) {
    assert.equal(v[line].shouldBeActive, false);
    assert.equal(v[line].lateTrains, 0);
    assert.equal(v[line].worstDelaySeconds, 0);
  }
});

test("one late train at many stops counts once (the old false-boss bug)", () => {
  const stops = Array.from({ length: 12 }, (_, i) => s("Blue", "trip-1", 400, i + 1));
  const v = verdict(stops);
  assert.equal(v.Blue.lateTrains, 1);
  assert.equal(v.Blue.trainsSampled, 1);
  assert.equal(v.Blue.shouldBeActive, false);
});

test("a trip is judged by its next stop, not its worst stop", () => {
  // Next stop (1 min out) is on time; a later stop predicts a big delay.
  const v = verdict([s("Red", "t", 0, 1), s("Red", "t", 900, 10)]);
  assert.equal(v.Red.lateTrains, 0);
  assert.equal(v.Red.worstDelaySeconds, 0);
});

test("3 distinct late trains spawn a boss, 2 do not", () => {
  const two = verdict([s("Orange", "a", 300), s("Orange", "b", 600)]);
  assert.equal(two.Orange.shouldBeActive, false); // 100% late, but only 2 trains
  const three = verdict([s("Orange", "a", 300), s("Orange", "b", 600), s("Orange", "c", 301)]);
  assert.equal(three.Orange.shouldBeActive, true);
  assert.equal(three.Orange.lateTrains, 3);
  assert.equal(three.Orange.worstDelaySeconds, 600);
});

test("299 seconds is not late, 300 is", () => {
  assert.equal(verdict([s("Red", "a", 299)]).Red.lateTrains, 0);
  assert.equal(verdict([s("Red", "a", 300)]).Red.lateTrains, 1);
});

test("negative delays clamp to 0 and never offset real delays", () => {
  const v = verdict([s("Red", "early", -900), s("Red", "late", 120)]);
  assert.equal(v.Red.worstDelaySeconds, 120);
  assert.equal(v.Red.lateTrains, 0);
  assert.equal(verdict([s("Red", "x", -500)]).Red.worstDelaySeconds, 0);
});

test("Green branches pool into one Green line", () => {
  const v = verdict([s("Green-B", "b", 400), s("Green-D", "d", 400), s("Green-E", "e", 400)]);
  assert.equal(v.Green.lateTrains, 3);
  assert.equal(v.Green.shouldBeActive, true);
  assert.equal(v.Red.shouldBeActive, false);
});

test("an official delay alert spawns a boss with zero late trains", () => {
  const v = verdict([], ["Green-C"]);
  assert.equal(v.Green.shouldBeActive, true);
  assert.equal(v.Green.delayAlert, true);
  assert.equal(v.Blue.delayAlert, false);
});

test("lines are independent", () => {
  const v = verdict([s("Red", "a", 400), s("Red", "b", 400), s("Red", "c", 400), s("Blue", "z", 400)]);
  assert.equal(v.Red.shouldBeActive, true);
  assert.equal(v.Blue.shouldBeActive, false);
});

const line = (route: RouteId, late: number, onTime: number) => [
  ...Array.from({ length: late }, (_, i) => s(route, `${route}-late-${i}`, 400)),
  ...Array.from({ length: onTime }, (_, i) => s(route, `${route}-ok-${i}`, 0)),
];

test("a big line needs half its trains late, not just 3 (Green always has 3)", () => {
  const v = verdict(line("Green-B", 18, 40)); // 31%: the real afternoon number
  assert.equal(v.Green.lateTrains, 18);
  assert.equal(v.Green.shouldBeActive, false);
  assert.equal(verdict(line("Green-B", 30, 28)).Green.shouldBeActive, true); // 52%
});

test("hysteresis: an up boss holds between 30% and 50%, escapes below 30%", () => {
  const mid = verdict(line("Orange", 7, 11)).Orange; // 39%
  assert.equal(mid.shouldBeActive, false);
  assert.equal(mid.stillDelayed, true);
  const low = verdict(line("Orange", 5, 13)).Orange; // 28%
  assert.equal(low.stillDelayed, false);
  assert.ok(Math.abs(low.lateShare - 5 / 18) < 1e-9);
});

test("an alert holds a boss up even when trains look fine", () => {
  const v = verdict(line("Blue", 0, 14), ["Blue"]).Blue;
  assert.equal(v.shouldBeActive, true);
  assert.equal(v.stillDelayed, true);
});
