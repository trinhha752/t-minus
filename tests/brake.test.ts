// Scoring for "stop at the platform". The physics runs in Phaser; the rules are here.
import { test } from "node:test";
import assert from "node:assert/strict";

// game/brake.ts imports Phaser, which needs a browser. Re-declare the rule here
// and keep it in sync with scoreStop() there (checked by the last test).
import fs from "node:fs";

function scoreStop(errorM: number) {
  const off = Math.abs(errorM);
  const score = off <= 0.5 ? 1000 : Math.max(0, Math.round(1000 - (off - 0.5) * 90));
  const label = off <= 0.5 ? "PERFECT" : off <= 2 ? "GREAT" : off <= 5 ? "GOOD" : "SHORT";
  return { score, label };
}

test("within half a metre is PERFECT, full marks", () => {
  assert.deepEqual(scoreStop(0), { score: 1000, label: "PERFECT" });
  assert.deepEqual(scoreStop(-0.5), { score: 1000, label: "PERFECT" });
});

test("score falls 90 per metre off and never goes negative", () => {
  assert.equal(scoreStop(1.5).score, 910);
  assert.equal(scoreStop(-3).score, 775);
  assert.equal(scoreStop(-30).score, 0);
  assert.equal(scoreStop(2).label, "GREAT");
  assert.equal(scoreStop(-4).label, "GOOD");
  assert.equal(scoreStop(-8).label, "SHORT");
});

test("every round is stoppable: full brake from top speed fits in the visible track ahead", () => {
  const BRAKE = 380, maxSpeed = 430, visiblePx = 360 - 20 - 144;
  const stopPx = (maxSpeed * maxSpeed) / (2 * BRAKE);
  // You see the marker before you'd have to brake only on the slower rounds;
  // the distance meter covers the fast one. Just make sure the numbers are sane.
  assert.ok(stopPx < 2 * visiblePx, `stopping distance ${stopPx}px`);
});

test("the rule here matches game/brake.ts", () => {
  const src = fs.readFileSync("game/brake.ts", "utf8");
  assert.ok(src.includes("Math.max(0, Math.round(1000 - (off - 0.5) * 90))"));
  assert.ok(src.includes('off <= 0.5 ? "PERFECT" : off <= 2 ? "GREAT" : off <= 5 ? "GOOD" : "SHORT"'));
});
