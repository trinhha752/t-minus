// scripts/test-api.ts
// End-to-end check of every live route against a running server.
// Plays one fresh rider through check-in, a chapter, and the final boss.
//
//   npm run dev            (in another terminal)
//   npm run test:api       (or BASE=https://your-host npm run test:api)
//
/* eslint-disable @typescript-eslint/no-explicit-any -- loose JSON checks */
// Creates one test rider in the database each run. Exits 1 if anything fails.

const BASE = process.env.BASE ?? "http://localhost:3000";
let cookie = "";
let passed = 0;
let failed = 0;

type Res = { status: number; body: { ok: boolean; data?: any; error?: string } };

async function call(method: "GET" | "POST", path: string, json?: unknown): Promise<Res> {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  return { status: res.status, body: await res.json() };
}

function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`Testing ${BASE}\n`);

  // Transit
  let r = await call("GET", "/api/predictions?stop=place-pktrm");
  check("predictions: Park Street returns trains", r.body.ok && r.body.data.length > 0,
    r.body.ok ? r.body.data.map((a: any) => `${a.route} ${a.headsign} ${a.secondsAway}s`).join(", ") : r.body.error);
  r = await call("GET", "/api/predictions");
  check("predictions: missing stop is a 400", r.status === 400);

  r = await call("GET", "/api/trains?line=Red");
  check("trains: Red has live vehicles", r.body.ok && r.body.data.length > 0, `${r.body.data?.length} trains`);
  r = await call("GET", "/api/trains?line=all");
  check("trains: all lines", r.body.ok && r.body.data.length > 0, `${r.body.data?.length} trains`);

  // Boss
  r = await call("GET", "/api/boss");
  check("boss: four lines", r.body.ok && r.body.data.length === 4,
    r.body.data?.map((b: any) => `${b.line} ${b.active ? `UP ${b.hpRemaining}hp` : "clean"} ${b.lateTrains} late`).join(" | "));

  // Check-in
  r = await call("POST", "/api/checkin", { stationId: "place-pktrm", lat: 0, lon: 0, teleport: true });
  check("checkin: first check-in earns points", r.body.ok && r.body.data.accepted && r.body.data.pointsEarned > 0);
  r = await call("POST", "/api/checkin", { stationId: "place-pktrm", lat: 0, lon: 0, teleport: true });
  check("checkin: second one today is refused", r.body.ok && r.body.data.reason === "already_today");
  r = await call("POST", "/api/checkin", { stationId: "place-harsq", lat: 42.3563, lon: -71.0624 });
  check("checkin: too far without teleport", r.body.ok && r.body.data.reason === "too_far", `${r.body.data?.metresAway}m`);

  r = await call("GET", "/api/me");
  check("me: Park Street is stamped after check-in",
    r.body.ok && r.body.data.stampedStationIds.includes("place-pktrm") && r.body.data.points > 0,
    `${r.body.data?.points} pts, stamps ${r.body.data?.stampedStationIds?.join(",")}`);

  // Leaderboard
  r = await call("GET", "/api/leaderboard?scope=line");
  check("leaderboard: four teams ranked", r.body.ok && r.body.data.rows.length === 4 && r.body.data.rows[0].rank === 1,
    r.body.data?.rows?.map((x: any) => `${x.name} ${x.points}`).join(", "));
  r = await call("GET", "/api/leaderboard?scope=user");
  check("leaderboard: riders sorted by points", r.body.ok &&
    r.body.data.rows.every((x: any, i: number, a: any[]) => i === 0 || a[i - 1].points >= x.points),
    `${r.body.data?.rows?.length} riders`);
  r = await call("GET", "/api/leaderboard?scope=nope");
  check("leaderboard: bad scope is a 400", r.status === 400);

  // Guess: lock onto a real train. Resolution takes minutes, so it's unit-tested instead.
  r = await call("POST", "/api/guess", { stationId: "place-pktrm", guessMinutes: 4 });
  const guess = r.body.data;
  check("guess: locks onto a train 90s+ out", r.body.ok && Date.parse(guess.targetArrivalIso) - Date.now() > 60_000,
    r.body.ok ? `target ${Math.round((Date.parse(guess.targetArrivalIso) - Date.now()) / 1000)}s away` : r.body.error);
  r = await call("POST", "/api/guess", { stationId: "place-pktrm", guessMinutes: 5 });
  check("guess: a second open guess is a 409", r.status === 409);
  if (guess) {
    r = await call("GET", `/api/guess/${guess.id}`);
    check("guess: polling shows it unresolved", r.body.ok && r.body.data.resolved === false);
  }
  r = await call("GET", "/api/guess/not-a-real-id");
  check("guess: unknown id is a 404", r.status === 404);

  // Trivia
  r = await call("GET", "/api/trivia?stop=place-pktrm&wait=300");
  const qs = r.body.data?.questions ?? [];
  check("trivia: responds", r.body.ok, `${qs.length} verified questions`);
  check("trivia: answers never sent to the browser",
    !JSON.stringify(r.body).match(/answer_?index|correctIndex/i));

  // Progression
  r = await call("POST", "/api/final-boss/start", { chapterId: "green-trunk" });
  check("final boss: locked before the chapter is cleared", r.status === 400);
  r = await call("POST", "/api/minigame/result", { stationId: "place-pktrm", gameId: "rooftop-run", score: 1, cleared: true, durationMs: 30000 });
  check("minigame: wrong game for this station is refused", r.status === 400);
  r = await call("POST", "/api/minigame/result", { stationId: "place-pktrm", gameId: "frog-pond-skate", score: 1, cleared: true, durationMs: 500 });
  check("minigame: impossibly fast clear is refused", r.status === 400);

  const stations: [string, string][] = [
    ["place-pktrm", "frog-pond-skate"], ["place-boyls", "rooftop-run"],
    ["place-armnl", "garden-or-graveyard"], ["place-coecl", "the-last-mile"],
  ];
  for (const [i, [stationId, gameId]] of stations.entries()) {
    r = await call("POST", "/api/minigame/result", { stationId, gameId, score: 500, cleared: true, durationMs: 30000 });
    check(`minigame: clear ${gameId}`, r.body.ok && r.body.data.pointsEarned > 0 && r.body.data.stationCleared);
    if (i === stations.length - 1)
      check("minigame: last station unlocks the chapter boss", r.body.data?.chapterBossUnlocked === "green-trunk", `${r.body.data?.chapterBossUnlocked}`);
  }
  r = await call("POST", "/api/minigame/result", { stationId: "place-pktrm", gameId: "frog-pond-skate", score: 500, cleared: true, durationMs: 30000 });
  check("minigame: replay the same day earns 0", r.body.ok && r.body.data.pointsEarned === 0);

  r = await call("GET", "/api/progress");
  const ch = r.body.data?.chapters?.find((c: any) => c.id === "green-trunk");
  check("progress: chapter shows unlocked", ch?.bossUnlocked === true && ch?.bossDefeated === false);

  r = await call("POST", "/api/final-boss/start", { chapterId: "green-trunk" });
  const fight = r.body.data;
  check("final boss: starts", r.body.ok && fight.hpRemaining === fight.hpTotal,
    `${fight?.bossName}, ${fight?.hpTotal}hp, x${fight?.damageMultiplier}`);
  r = await call("POST", "/api/final-boss/start", { chapterId: "green-trunk" });
  check("final boss: starting again resumes the same fight", r.body.data?.id === fight.id);

  r = await call("POST", "/api/final-boss/hit", { fightId: fight.id });
  check("final boss: a hit does damage", r.body.ok && r.body.data.hpRemaining < fight.hpTotal, `${r.body.data?.hpRemaining}hp left`);
  r = await call("POST", "/api/final-boss/hit", { fightId: fight.id });
  check("final boss: spam hits get 429", r.status === 429);

  let hp = 1, hits = 1, last: Res | null = null;
  while (hp > 0 && hits < 20) {
    await sleep(1600);
    last = await call("POST", "/api/final-boss/hit", { fightId: fight.id });
    hp = last.body.data?.hpRemaining ?? 0;
    hits++;
    if (!last.body.ok) break;
  }
  check("final boss: defeated", last?.body.data?.defeated === true && last.body.data.pointsEarned > 0,
    `${hits} hits, +${last?.body.data?.pointsEarned} points`);
  await sleep(1600);
  r = await call("POST", "/api/final-boss/hit", { fightId: fight.id });
  check("final boss: no hits after it is over", r.status === 400);
  r = await call("GET", "/api/progress");
  check("progress: chapter shows defeated",
    r.body.data?.chapters?.find((c: any) => c.id === "green-trunk")?.bossDefeated === true);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("FAIL  could not reach the server:", (e as Error).message);
  process.exit(1);
});
