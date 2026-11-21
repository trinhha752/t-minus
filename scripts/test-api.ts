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
  r = await call("GET", "/api/predictions?stop=park");
  check("predictions: UI slug works", r.body.ok && r.body.data.length > 0 && r.body.data[0].stopId === "place-pktrm");
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

  // Progression: chapters come from components/run/stations.ts. Use UI slugs.
  r = await call("GET", "/api/progress");
  const red = r.body.data?.chapters?.find((c: any) => c.id === "red");
  check("progress: red chapter from the UI's stations.ts", red?.stations?.length === 10 && red.stations[0].slug === "alewife",
    `${red?.name}, ${red?.stations?.length} stations, boss ${red?.bossName}`);

  r = await call("POST", "/api/final-boss/start", { chapterId: "red" });
  check("final boss: locked before the chapter is cleared", r.status === 400);
  r = await call("POST", "/api/minigame/result", { stationId: "alewife", gameId: "rooftop-run", score: 1, cleared: true, durationMs: 30000 });
  check("minigame: wrong game for this station is refused", r.status === 400);
  r = await call("POST", "/api/minigame/result", { stationId: "alewife", score: 1, cleared: true, durationMs: 500 });
  check("minigame: impossibly fast clear is refused", r.status === 400);
  r = await call("POST", "/api/minigame/result", { stationId: "nowhere", score: 1, cleared: true, durationMs: 30000 });
  check("minigame: unknown station is refused", r.status === 400);

  for (const [i, s] of (red?.stations ?? []).entries()) {
    // Mix id styles: UI slug for most, MBTA id for one, gameId only sometimes.
    const stationId = i === 3 ? s.stationId : s.slug;
    const body: any = { stationId, score: 500, cleared: true, durationMs: 30000 };
    if (i % 2 === 0) body.gameId = s.gameId;
    r = await call("POST", "/api/minigame/result", body);
    if (!r.body.ok || !r.body.data.stationCleared) check(`minigame: clear ${s.slug}`, false, r.body.error);
    if (i === red.stations.length - 1) {
      check("minigame: all 10 red stations clear", r.body.ok);
      check("minigame: last station unlocks the chapter boss", r.body.data?.chapterBossUnlocked === "red", `${r.body.data?.chapterBossUnlocked}`);
    }
  }
  r = await call("POST", "/api/minigame/result", { stationId: "alewife", score: 500, cleared: true, durationMs: 30000 });
  check("minigame: replay the same day earns 0", r.body.ok && r.body.data.pointsEarned === 0);

  r = await call("POST", "/api/final-boss/start", { chapterId: "red", demo: true });
  const fight = r.body.data;
  if (!r.body.ok && /no verified questions/.test(r.body.error ?? "")) {
    console.log("SKIP  final boss: no verified questions yet (verify some, or set ALLOW_UNVERIFIED_TRIVIA=1)");
  } else if (!r.body.ok) {
    check("final boss: starts in demo mode", false, r.body.error);
  } else {
    check("final boss: starts in demo mode at 300 HP with questions", r.body.ok && fight.hpTotal === 300 && fight.questions.length > 0,
      `${fight?.bossName}, ${fight?.hpTotal}hp, x${fight?.damageMultiplier}, ${fight?.questions?.length} questions`);
    check("final boss: questions carry no answers", !JSON.stringify(fight ?? {}).match(/answer_?index|correctIndex/i));
    r = await call("POST", "/api/final-boss/start", { chapterId: "red", demo: true });
    check("final boss: starting again resumes the same fight", r.body.data?.id === fight.id);

    // Learn an answer by getting it wrong, then land a combo with it.
    const qn = fight.questions[0];
    r = await call("POST", "/api/final-boss/answer", { fightId: fight.id, questionId: qn.id, choiceIndex: 99 });
    const right = r.body.data?.correctIndex;
    check("final boss: wrong answer does no damage and resets combo", r.body.ok && r.body.data.damage === 0 && r.body.data.combo === 0);
    r = await call("POST", "/api/final-boss/answer", { fightId: fight.id, questionId: qn.id, choiceIndex: right });
    check("final boss: answering within 1.5s is a 429", r.status === 429);

    const dmg: number[] = [];
    let last: Res | null = null;
    for (let i = 0; i < 20; i++) {
      await sleep(1600);
      last = await call("POST", "/api/final-boss/answer", { fightId: fight.id, questionId: qn.id, choiceIndex: right });
      if (!last.body.ok) break;
      dmg.push(last.body.data.damage);
      if (last.body.data.defeated) break;
    }
    check("final boss: combo ramps 20 -> 40 -> 60 (x buffs)",
      dmg.length >= 3 && dmg[1] === 2 * dmg[0] && dmg[2] === 3 * dmg[0], dmg.join(","));
    check("final boss: defeated", last?.body.data?.defeated === true && last.body.data.pointsEarned > 0,
      `${dmg.length} correct answers, +${last?.body.data?.pointsEarned} points`);
    await sleep(1600);
    r = await call("POST", "/api/final-boss/answer", { fightId: fight.id, questionId: qn.id, choiceIndex: right });
    check("final boss: no answers after it is over", r.status === 400);
    r = await call("GET", "/api/progress");
    check("progress: chapter shows defeated", r.body.data?.chapters?.find((c: any) => c.id === "red")?.bossDefeated === true);
  }

  // Forfeit: a green fight can't start (not cleared), so forfeit a bogus id.
  r = await call("POST", "/api/final-boss/forfeit", { fightId: "0" });
  check("final boss: forfeiting a fight you don't have is a 400", r.status === 400);

  // Photo quest: fails open with no Gemini key, so it passes either way here.
  r = await call("POST", "/api/photo-quest/verify", { questId: "sign", imageBase64: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AL+A//9k=", line: "Orange" });
  check("photo quest: verify answers passed + reason", r.body.ok && typeof r.body.data.passed === "boolean", JSON.stringify(r.body.data));
  r = await call("POST", "/api/photo-quest/verify", { questId: "nope", imageBase64: "AAAA" });
  check("photo quest: unknown quest is a 404", r.status === 404);

  // Delay boss trivia by line
  r = await call("GET", "/api/trivia?line=Red");
  check("trivia: a line's boss round", r.body.ok && Array.isArray(r.body.data.questions), `${r.body.data?.questions?.length} questions`);
  r = await call("GET", "/api/trivia?stop=park");
  check("trivia: UI slug works as stop", r.body.ok && r.body.data.stationId === "place-pktrm");

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("FAIL  could not reach the server:", (e as Error).message);
  process.exit(1);
});
