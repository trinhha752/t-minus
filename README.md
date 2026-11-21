# T-Minus

Every station is a level, every delay is a boss fight. BostonHacks 2026, Transit Gamification track.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in keys from the team chat; never commit .env.local
npm run dev                  # http://localhost:3000
```

## How we work

- `types.ts` is the contract between frontend and backend. Change a shape there first and tell the team.
- Every `/api/*` route returns `{ ok: true, data }` or `{ ok: false, error }` (helpers in `lib/respond.ts`).
- Every route starts as **mock data** so the frontend is never blocked. Replace the mock in your own route.
- One branch per person (`git checkout -b <name>`), merge into `main` often.
- Stay in the folders you own:

| Who | Role | Owns |
|---|---|---|
| Trinh | **Backend + AI**: MBTA data, Tiger Data, the boss pipeline, Mastra characters, deploy | `lib/`, `scripts/`, `mastra/`, all of `app/api/`, `data/stations.json`, Vultr + domain |
| | **World + run flow**: the map, greeting and check-in, results screen, card reveal and album | `components/TMap.tsx`, `components/cards/`, `app/page.tsx`, `app/station/`, `app/profile/`, `app/login/`, `data/t-map.svg`, art in `public/` |
| | **Game feel + boss**: juice layer, trivia screen, staked guess, boss takeover | `app/game-feel.css`, `lib/juice/` (shared hooks and sounds), `components/TriviaRound.tsx`, `components/GuessGame.tsx`, `components/BossBar.tsx`, `components/boss/`, `app/leaderboard/` |

`types.ts` is edited by the Backend + AI owner only. Ping the chat if you need a shape changed.

## What we're building

A ride is a **run**, not a dashboard. Every screen leads with an action; the numbers sit around the edges.

**Greet → Check in → Lock a guess (Safe or All In) → Play the wait → Train arrives → Results → Card reveal**

- The **map** is the world map between runs. It is not the home screen.
- A **Delay Boss** takes over the whole screen: the screen dims, the boss slides in with a taunt, and each answer chips its HP.
- **Game feel is a requirement:** sounds, points that fly up, trains that slide, HP bars that flash, a shake on wrong answers. CSS transitions and keyframes only: no 3D, Lottie, or page transitions.
- Test it at 3 am: cover every number on the screen. If tapping still feels good, it's a game.

### Priorities (cut from the bottom)

1. Juice layer (Game feel, first, because everyone uses it)
2. Run flow: greet → check in → trivia → results (World + Game feel)
3. Live MBTA data plus the boss pipeline: Tiger Data detects the delay → Mastra/Gemini names the boss → it takes over the screen (Backend + Game feel)
4. Station cards: flip reveal with a rarity tier, plus an album (World)
5. Staked guess: Safe or All In (Game feel)
6. Daily quest from the station character (Backend)
7. Stretch: one station mini-game, the forecast screen

Cut entirely: Solana, real email auth (type a name and pick a line instead), AR.

### First checkpoint

- **Backend + AI:** MBTA proxy is live, the poller writes to Tiger Data, and `/api/trains` and `/api/boss` return real data.
- **World:** SVG map with all four lines and the 5 demo stations, trains rendered from `/api/trains` (mock is fine).
- **Game feel:** the juice layer (sound helper, `usePointsBurst`, shake and flash classes) plus a full-screen trivia card that uses it.

## What to build next (per role)

The backend is live on `main`. Open <http://localhost:3000/dev> to see every route working, then build against the real routes below. You need `DATABASE_URL` and `MBTA_API_KEY` in `.env.local`; ask Trinh for them by DM.

### Mini-games

When a game ends, report the result once:

```ts
const res = await fetch("/api/minigame/result", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ stationId: "place-boyls", gameId: "rooftop-run", score: 420, cleared: true, durationMs: 30000 }),
}).then((r) => r.json());
// res.data = { runId, pointsEarned, stationCleared, chapterBossUnlocked }
// chapterBossUnlocked is a chapter id (e.g. "green-trunk") when this clear unlocked a final boss: show the unlock moment.
```

- `stationId` and `gameId` must be a pair from `data/chapters.json`. Any other pair gets a 400. To add or rename a game, ask Trinh to update that file.
- A cleared run must last at least 3s (`durationMs >= 3000`), or it's rejected as fake. Scores are capped at 10,000.
- Points are awarded for the first clear per station per day. Replays are allowed but earn 0, so say "practice run" in the UI rather than showing +0.
- Build each **engine** once (`GameEngine` in `types.ts`: timing, memory, pick-the-lie, rhythm, dodge, runner, puzzle) and reskin it per station. One finished engine beats four half-built games.
- Suggested order: `rooftop-run` (runner) first, then a second station on the same engine.

### UI: map

Station positions are already computed. Don't hand-place them; read `data/map-layout.json`:

```ts
import layout from "@/data/map-layout.json";
import { project } from "@/lib/map-projection";

layout.viewBox;                  // "0 0 1000 1000", north is up
layout.paths["Red"];             // [[...Ashmont branch ids], [...Braintree branch ids]], in order
layout.paths["Green-B"];         // every route is an array of branches; draw one polyline per branch
layout.stations["place-pktrm"];  // { name, routes, x, y }
project(layout.projection, train.lat, train.lon); // live trains from /api/trains -> same x/y space
```

- Downtown is spread out automatically, so Park Street to Downtown Crossing is about 17px apart on a 390px phone. Regenerate with `npm run build:map`.
- **Tapping:** some stops are still about 4px apart, such as the street-level Green Line stops (BU Central and BU East). Don't give each dot its own small hit area. Put one tap handler on the board and pick the **nearest station within about 22px**. Add pinch-to-zoom if there's time.
- **Stamped stations:** use `stampedStationIds` from `GET /api/me`. A station counts as stamped once the rider has checked in there or cleared its mini-game.
- **Trains:** poll `GET /api/trains?line=all` every 15s. Move each train with `transform: translate(x, y)` and `key={train.id}`, with a transition of about 10s, so trains glide between polls instead of jumping. Don't animate SVG `cx`/`cy`; it's unreliable on iPhone Safari.
- **Tilted 3D board:** `translateZ` and `preserve-3d` do nothing on elements inside an `<svg>`. Draw only the line paths in SVG. Put station dots, trains and the boss banner in an absolutely positioned HTML layer on top, so they can lift off the board.
- Line colors: Red `#DA291C`, Orange `#ED8B00`, Blue `#2B6CE8`, Green `#00B04F`.
- Optional: if you build a 3D map (react-three-fiber), give it the same props as the 2D map and keep it behind `NEXT_PUBLIC_MAP_3D=1`, off by default. If it isn't working by 11pm, leave it off.

### UI: chapters and bosses

| Screen | Route | Notes |
|---|---|---|
| Chapter screen | `GET /api/progress` | Stations with `cleared` and `bestScore`, plus `bossUnlocked`, `bossDefeated`, `activeFightId` (resume it), and buffs |
| Final boss fight | `POST /api/final-boss/start {chapterId}` then `POST /api/final-boss/hit {fightId}` | One hit per 1.5s. Faster hits return **429**: play a "whiff" animation, not an error. `defeated: true` comes with +200 points. |
| Delay boss takeover | `GET /api/boss` every 15s | `active: true` on a line means a delay boss is up. Show HP from `hpRemaining` and `hpTotal`. Trivia answers damage it. |
| Profile and header | `GET /api/me` | Points, level, streak, badges, stamps |
| Next trains | `GET /api/predictions?stop=<id>` | `secondsAway` can be negative: the train is at the platform, so show "Boarding" |

Still mock data, with final shapes (build against them now): `/api/leaderboard`, `/api/guess`, `/api/guess/[id]`, `/api/chat`.

### Everyone: not code, but blocking

`data/trivia.json` has 12 questions, all `verified=false`, so none are served and the delay boss can't be fought. Pick a few, check each `sourceUrl`, and tell Trinh which ones are correct. That takes about 20 minutes.

## Backend API

Run `npm run dev`, then hit `http://localhost:3000`. Everything returns `{ ok: true, data }` or `{ ok: false, error }`; shapes are in `types.ts`.
The rider is a cookie (`et_uid`) created on first use. Browsers keep it automatically; with curl, pass `-c jar.txt -b jar.txt` so calls act as one rider.

```bash
# Transit (live MBTA, 10s cache)
curl "localhost:3000/api/predictions?stop=place-pktrm"      # next 3 arrivals; negative secondsAway = train at the platform
curl "localhost:3000/api/trains?line=Red"                   # line = Red | Orange | Blue | Green-B | Green-C | Green-D | Green-E | all

# Delay (mini) boss: shared by everyone on the line
curl "localhost:3000/api/boss"                              # 4 lines: active, hp, lateTrains, avgDelaySeconds
curl -c jar.txt -b jar.txt localhost:3000/api/me            # rider: points, level, streak, badges, stampedStationIds

# Check in (teleport skips the GPS check, for the demo)
curl -c jar.txt -b jar.txt -X POST localhost:3000/api/checkin -H 'content-type: application/json' \
  -d '{"stationId":"place-pktrm","lat":0,"lon":0,"teleport":true}'

# Trivia: only verified questions are served, and the answer never leaves the server
curl "localhost:3000/api/trivia?stop=place-pktrm&wait=300"
curl -c jar.txt -b jar.txt -X POST localhost:3000/api/trivia/answer -H 'content-type: application/json' \
  -d '{"roundId":"<from /api/trivia>","questionId":"pktrm-1","choiceIndex":0}'

# Progression: stations are levels, a final boss ends each chapter (data/chapters.json)
curl -c jar.txt -b jar.txt localhost:3000/api/progress
curl -c jar.txt -b jar.txt -X POST localhost:3000/api/minigame/result -H 'content-type: application/json' \
  -d '{"stationId":"place-boyls","gameId":"rooftop-run","score":420,"cleared":true,"durationMs":30000}'
curl -c jar.txt -b jar.txt -X POST localhost:3000/api/final-boss/start -H 'content-type: application/json' \
  -d '{"chapterId":"green-trunk"}'
curl -c jar.txt -b jar.txt -X POST localhost:3000/api/final-boss/hit -H 'content-type: application/json' \
  -d '{"fightId":"<id from start>"}'                        # one landed attack; max one per 1.5s
```

Still mock (shapes are final, data is not): `/api/leaderboard`, `/api/guess`, `/api/guess/[id]`, `/api/chat`.

### Testing the backend

- **See it working:** open <http://localhost:3000/dev>. It's a plain console that shows the live delay bosses, a countdown to the next trains, and buttons to clear stations and fight a final boss. It's not the game UI.
- `npm test`: unit tests for the boss detector, scoring, and check-in distance. No database or network needed.
- `npm run test:api`: with `npm run dev` running, plays one fresh rider through every live route and prints PASS or FAIL for each check. Set `BASE=https://...` to test a deployed server.

### Backend scripts

| Command | Does |
|---|---|
| `npm run poll` | The poller. Keep it running: writes ~1,300 prediction rows every 15s and spawns/retires delay bosses. Log in `logs/poller.log`. |
| `npm run boss:fake -- --line Green --hp 50` | Start a boss on command (demo). Ends any boss already on that line. Defaults: Green if free, 50 HP. |
| `npm run boss:kill` | End fake bosses. `--line Green` ends whatever is on Green; `--all` ends everything. |
| `npm run seed:fallback` | Re-save live MBTA responses to `public/seed/mbta-fallback.json`. `USE_SEED=1` serves them offline. |
| `npm run smoke:mbta` | Next 3 trains at Park Street plus a vehicle count. Add `USE_SEED=1` to test offline. |
| `npm run sql -- "SELECT ..."` | Run one query against Tiger Data (no psql needed). |
| `npm run db:schema` | Apply `schema.sql` (safe to re-run). |
| `npm run seed:stations` / `seed:trivia` | One-time seeds. Trivia loads `verified=false`; flip it per question once a human checks the source. |

## Rules that matter

- MBTA calls are server-side only; the key never reaches the browser.
- Trivia answers are checked server-side; never send `answerIndex` to the browser.
- Boss damage is applied server-side in one transaction.
- Times go over the wire as ISO strings.
- Trivia facts are hand-written and verified with a `sourceUrl`; the model only words them.
