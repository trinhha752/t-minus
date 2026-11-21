// Unit tests for scoring rules and check-in distance.
import { test } from "node:test";
import assert from "node:assert/strict";
import { bossHpFor, levelFor, nextStreak, roundSize, scoreGuess, BOSS_HP_MIN } from "../lib/scoring";
import { metresBetween, withinCheckinRange } from "../lib/geo";

test("round size grows with the wait, and a boss always means 5", () => {
  assert.equal(roundSize(60, false), 1);
  assert.equal(roundSize(300, false), 3);
  assert.equal(roundSize(600, false), 5);
  assert.equal(roundSize(60, true), 5);
});

test("guess score: exact is best, never negative", () => {
  assert.ok(scoreGuess(5, 5) > scoreGuess(5, 7));
  assert.equal(scoreGuess(0, 999), 0);
});

test("boss HP has a floor so one rider can win a demo", () => {
  assert.equal(bossHpFor(0), BOSS_HP_MIN);
  assert.ok(bossHpFor(10) > bossHpFor(1));
});

test("level curve starts at 1 and a first ride reaches level 2", () => {
  assert.equal(levelFor(0), 1);
  assert.ok(levelFor(60) >= 2);
});

test("streaks: same day holds, next day grows, a gap resets", () => {
  assert.equal(nextStreak(0, null, "2026-11-21"), 1);
  assert.equal(nextStreak(4, "2026-11-21", "2026-11-21"), 4);
  assert.equal(nextStreak(4, "2026-11-20", "2026-11-21"), 5);
  assert.equal(nextStreak(4, "2026-11-18", "2026-11-21"), 1);
  assert.equal(nextStreak(4, "2026-11-30", "2026-12-01"), 5); // month boundary
});

test("check-in radius: Park Street platform is in, Downtown Crossing is out", () => {
  const park = { lat: 42.35639457, lon: -71.0624242 };
  assert.equal(metresBetween(park.lat, park.lon, park.lat, park.lon), 0);
  assert.equal(withinCheckinRange(42.3566, -71.0623, park.lat, park.lon).ok, true);
  const dtx = withinCheckinRange(42.355518, -71.060225, park.lat, park.lon);
  assert.equal(dtx.ok, false);
  assert.ok(dtx.metres > 150 && dtx.metres < 400);
});
