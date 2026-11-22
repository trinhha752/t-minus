# T-Minus

A pixel-art game where the real MBTA is the world: every station is a level, every real delay is a boss fight. BostonHacks 2026, Transit Gamification track.

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
| Trinh | **Backend + AI**: MBTA data, Tiger Data, the boss pipeline, Mastra characters, deploy | `lib/`, `scripts/`, `mastra/`, all of `app/api/`, `data/`, Vultr + domain |
| | **World**: the overworld (Phaser) and the station levels | `game/` (Phaser scenes), `app/play/`, `components/run/stations.ts`, art in `public/` |
| | **Bosses + game feel**: Delay Boss arena, End Boss, juice, and the screens between levels (results, cards, menus) | `components/run/` (except `stations.ts`), `components/cards/`, `app/(game)/`, `app/globals.css` |

`types.ts` is edited by the Backend + AI owner only. Ping the chat if you need a shape changed.

## What we're building

**T-Minus is a game, not an app.** You control something in real time, you can fail, and you get better. The hook nobody else has: **the real T is the world.**

- **Overworld:** drive your train car along the real T lines on a pixel map. Real trains, live from the MBTA, move on the same tracks. It's a playable overworld, not a free-roam open world: movement follows the lines.
- **Stations are levels:** stop at a station for a 30–60s arcade level from its history (swim the herring run at Alewife, dig the 1897 tunnel at Park Street). Real-time, and you can lose. Three level types, each reskinned per station, not 20 separate games.
- **Delays are bosses:** when a real line runs late, a Delay Boss appears on it in the world. Everyone on that line fights it together: dodge its attacks, answer trivia to charge your hits, one shared HP bar.
- **Each line ends in an End Boss:** a multi-phase fight, made easier by the Signal Shards from Delay Bosses you helped beat.
- **Your real wait is the timer:** the time until your train arrives sets how long you get to play.

**Look:** pixel art (Phaser for gameplay, React for menus and screens between levels). Use free CC0 packs from [Kenney.nl](https://kenney.nl/assets) rather than drawing everything. Game feel is a requirement: hit-stop, screen shake, flashing HP bars, sounds.

### How the game loop works

```
Map: "YOU ARE HERE · BU Central"  (your phone's real location)
  └─ Check in ─▶ Arrive: brake your train in ─▶ photo quest ─▶ STAMPED (+25, saved on the server)
                   └─▶ Play the station's game (Landmark Match, or Harvard's own) ─▶ results
  └─ back on the map, the card shows both directions, like the platform sign:
        📍 BU Central ✓ done
        ▸ Amory Street   1 stop toward Boston College · train in 2 min
        ◂ BU East        1 stop toward Government Center · train in 6 min
  └─ ride either way (or "Try the game here (demo)") ─▶ Arrive ─▶ ... ─▶ next stamp
  └─ one direction finished ─▶ "Switch to the Red Line at Park Street (9 left)"
  └─ every station on a line stamped ─▶ "Green Line complete!" ─▶ Fight its End Boss
  └─ a real delay on your line ─▶ Delay Boss (everyone on the line fights it together)
```

- **Progress is saved on the server.** Stamped stations, gold (points) and streak come from `/api/progress` and `/api/me`, so a refresh keeps them. The line chips at the top count real stamps.
- **Where next** (`components/game/loop.ts`): the nearest unstamped stop in **each direction** along your track (a Green branch stop's track is the trunk plus its branch; at Kenmore, outbound looks down the B, C and D branches). Live train times come from `/api/predictions`; MBTA direction 0 is "▸" (outbound/southbound), 1 is "◂".
- **Branches:** Green splits at Kenmore (B, C, D) and Copley (E); Red splits at JFK/UMass into Ashmont (A) and Braintree (Br). Branch stops show their letter on the map.
- **Switching lines** happens at the transfer stations: Park Street (Red–Green), Downtown Crossing (Red–Orange), and North Station and Haymarket (Green–Orange). When a direction or the whole line is done, the card points to the nearest transfer to a line with stations left.
- **Demo stations:** in dev (or with `NEXT_PUBLIC_DEMO_MODE=1`) the map shows **DEMO · stand at Harvard / BU Central / Chinatown**, one per line (Red, Green, Orange). Tapping one makes the whole game act as if you're standing there: the map, check-in, Arrive, and that line's bosses. **📍 Real** goes back to your actual location.
- **Start over:** tap **↺ New rider** on the map (dev, or `NEXT_PUBLIC_DEMO_MODE=1`). It gives you a fresh rider with nothing stamped.
- Playing a station again the same day is allowed but earns nothing ("Already stamped today").
- Still local only: gold from the boss fights (`addGold`), until the bosses are wired to the server.

### The 2-hour test (decide by 8:00 pm Saturday)

Before rebuilding anything, prove the overworld works: a `/play` page with a pixel T map in Phaser, your car moving along the Red Line with the arrow keys, and real trains from `/api/trains`.

**Built, inside the game:** open <http://localhost:3000>. The pixel map finds **your real location** and centers on the station you're at ("YOU ARE HERE · BU Central"). Tap **Check in** (or a station, then **Play**) and you go through **Arrive** (`/station/[id]/arrive`, in `components/game/ArriveView.tsx`):
1. **Check in:** live next trains, one per direction like the platform sign. You must be within 150 m; in dev, or with `NEXT_PUBLIC_DEMO_MODE=1`, stations you're not at offer **Arrive (demo)**.
2. **Brake your train into the station** (hold anywhere, stop on the STOP line).
3. **The station's photo quest** (themed text in `data/station-quests.json`).
4. **Stamped:** the station's fact with your photo, saved to the server (`/api/minigame/result`). Then **Play the station** goes to the station's own game (`/station/[id]/play`).

`/play` (the old stand-alone test page) now redirects to the map. The server enforces "you have to be there": `/api/minigame/result` refuses a station you haven't checked in at today, and teleport check-ins only work in dev or demo mode. Play it, then decide:

- **Works and feels fun by 8:00 pm:** commit to the game. Port mini-games into Phaser levels one at a time; the current screens become the menus around it.
- **Fighting us:** drop it. Keep the current screens and polish their game feel. We lose 2 hours, not the weekend.

### Priorities (cut from the bottom)

1. Overworld with real trains, and your car moving on it (World)
2. One level type, reskinned across a chapter's stations (World)
3. Delay Boss arena: a real delay spawns it, shared HP (Bosses + Backend)
4. End Boss at the end of the Red Line (Bosses)
5. Results and card reveal between levels (Bosses)
6. Two more level types (World)
7. Stretch: a voxel 3D map, AI boss names and taunts, the arrival guess

Cut entirely: Solana, real email auth (type a name and pick a line instead), AR, free-roam open world.

## What to build next (per role)

The backend is live on `main`. Open <http://localhost:3000/dev> to see every route working, then build against the real routes below. You need `DATABASE_URL` and `MBTA_API_KEY` in `.env.local`; ask Trinh for them by DM.

### World: the overworld

Station positions and track paths are already computed. Don't hand-place them; read `data/map-layout.json` and draw it in Phaser:

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
- **Trains:** poll `GET /api/trains?line=all` every 15s. Key each sprite by `train.id` and tween it over about 10s to its new position, so trains glide between polls instead of jumping.
- Line colors: Red `#DA291C`, Orange `#ED8B00`, Blue `#2B6CE8`, Green `#00B04F`.
- Stretch: a voxel 3D map (react-three-fiber, rendered at low resolution with `image-rendering: pixelated`), behind `NEXT_PUBLIC_MAP_3D=1` and off by default. If it isn't working by 11pm, leave it off.

### World: station levels

Stations, games and chapters come from **`components/run/stations.ts`**, the UI's own file. The backend reads it directly, so there's one list. Add, rename or reorder stations there; each chapter (`red`, `green`) is a line in `ROUTES`, and its final boss waits at the last station. If you add a station, also add its MBTA id to `data/station-ids.json`, or `npm test` fails.

When a level ends (from Phaser or React), report the result once:

```ts
const res = await fetch("/api/minigame/result", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ stationId: "alewife", score: 420, cleared: true, durationMs: 30000 }),
}).then((r) => r.json());
// res.data = { runId, pointsEarned, stationCleared, chapterBossUnlocked }
// chapterBossUnlocked is "red" or "green" when this clear unlocked that final boss: show the unlock moment.
```

- `stationId` is your slug (`"alewife"`) or the MBTA id (`"place-alfcl"`). Both work everywhere.
- `gameId` is optional. If you send it, it must be the kebab-case game title (`"fish-run"`, `"rindges-gift"`), or you get a 400.
- A cleared run must last at least 3s (`durationMs >= 3000`), or it's rejected as fake. Scores are capped at 10,000.
- Points are awarded for the first clear per station per day. Replays are allowed but earn 0, so say "practice run" in the UI rather than showing +0.
- Clearing Park Street counts for both chapters.

### World: photo quests (Gemini Vision)

A different verb from answering: the player stands up, looks around the platform and photographs something. `components/PhotoQuest.tsx` is a full-screen React overlay. Mount it over the game canvas and unmount it from `onComplete`:

```tsx
import PhotoQuest from "@/components/PhotoQuest";

<PhotoQuest stationName="Harvard" line="Red"
  onComplete={({ passed, dataUrl }) => { /* dataUrl = the photo: use it as this station's card art */ }} />
```

- Tasks are in `data/photo-quests.json`: 10 generic ones that work at **any** station (a sign, a map, something metal, something the line's color...). Never station-specific.
- It opens the back camera, shrinks the photo to 768px JPEG, and sends it to `POST /api/photo-quest/verify { questId, imageBase64, line }`, which returns `{ passed, reason }`. Gemini is told to be generous.
- **Models:** it tries `gemini-3.1-flash-lite` first (fast, its own rate limit), then `gemini-3.6-flash` (override with `GEMINI_MODEL=a,b`). Checks take about 1.5 s. Gemini is told to pass only if the thing is clearly visible: a person, face or selfie alone fails, and when unsure it fails (reshoots are free). Tested on real photos: a door, escalator, bench, station sign and green object pass; a portrait fails for door, sign and seat; a bench and an escalator fail for door.
- **When Gemini can't answer** (free-tier rate limit, HTTP 429, or a timeout after 8 s), the photo does **not** count: the player sees "The photo checker is busy" with **Check again** (same photo) or **Reshoot**. They can still Skip to the station game. `PHOTO_FAIL_OPEN=1` brings back auto-pass for a stage emergency. Each verdict (model, pass or fail, reason; never the image) is logged as `[photo-quest]`. To avoid busy checks during the demo, turn on billing for the key's Google project, which raises the rate limit.
- A wrong photo means "try another angle" with free reshoots. No camera means a Skip button. The player is never trapped.
- A "Demo: pass without camera" button shows in dev, or when `NEXT_PUBLIC_DEMO_MODE=1`, in case the venue blocks camera access.
- **The camera needs HTTPS.** `localhost` works, but a phone pointed at your laptop's IP silently fails. Test on a phone with `npx next dev --experimental-https`, a tunnel, or the deployed Vultr URL.
- **iOS:** the shutter must be a direct tap. Don't trigger capture from a timer or a promise.
- Try it on `/dev` → "Photo quest".
- The photo isn't uploaded anywhere or awarded points by the server yet; the parent decides what to do with `dataUrl`.

### Bosses and screens

| Screen | Route | Notes |
|---|---|---|
| Chapter screen | `GET /api/progress` | Chapters `red` (Scholars' Realm) and `green` (Ancient Tunnels). Each station has `slug`, `title`, `genre`, `cleared`, `bestScore`. Plus `bossUnlocked`, `bossDefeated`, `activeFightId` (resume it), and buffs. |
| End Boss fight | `POST /api/final-boss/start {chapterId, demo?}` then `POST /api/final-boss/answer {fightId, questionId, choiceIndex}` | Start returns `questions` (no answers): cycle through them. Each answer comes back with `correct`, `correctIndex`, `damage`, `combo`, `hpRemaining`. Damage = 20 × min(combo + 1, 3) × `damageMultiplier`, the same as `hitDamage` in `stats.ts`. HP is 1000, or 300 with `demo: true`. **Hearts and items stay in the UI**: a wrong answer just resets the combo on the server. When hearts run out, call `POST /api/final-boss/forfeit {fightId}`. At most one answer per 1.5s; faster returns **429**. `defeated: true` comes with +200 points. |
| Delay Boss takeover | `GET /api/boss` every 15s, questions from `GET /api/trivia?line=Red` | `active: true` on a line means a Delay Boss is up. It's **shared**: everyone on the line chips the same HP (200 per active rider, minimum 200). Answers go to `POST /api/trivia/answer`, which returns `bossDamage` (20/40/60 with combo) and `bossHpRemaining`. It spawns when half a line's trains are 5+ min late (or the MBTA posts a delay alert), and escapes once fewer than 30% are. To show one on command: `npm run boss:fake -- --line Red`. |
| Trivia answer | `POST /api/trivia/answer` | `alreadyAnswered: true` means the rider answered this question today. Show the answer, but it scores nothing and does no boss damage. |
| Buffs | `GET /api/progress` → `buffs` | Beating a Delay Boss gives every rider who fought it a Signal Shard (+10% damage, lasts 24h). It's spent automatically on the next End Boss fight and shows in `damageMultiplier`. |
| Arrival guess | `POST /api/guess {stationId, guessMinutes}` then poll `GET /api/guess/:id` every 10s | Locks onto the next train at least 90s out, and follows that train if it slips. When it arrives: `resolved: true` with `actualMinutes` and `pointsEarned` (50 for exact, minus 10 per minute off). If the train is cancelled, `actualMinutes` is null and it scores 0. One open guess per rider: a second one returns **409**. No Safe or All In stake on the server yet. |
| Leaderboard | `GET /api/leaderboard?scope=line` or `?scope=user` | Teams ranked by total points, or the top 20 riders. `teamTotals` is always included, for coloring the map. Points are all-time, not weekly. |
| Profile and header | `GET /api/me` | Points, level, streak, badges, stamps |
| Next trains | `GET /api/predictions?stop=<id>` | `secondsAway` can be negative: the train is at the platform, so show "Boarding" |

Still mock data, with a final shape (build against it now): `/api/chat`.

### Everyone: not code, but blocking

`data/trivia.json` has 26 questions, including the 14 from `DelayBoss.tsx` and `EndBoss.tsx`, all `verified=false`. **Until some are verified, both bosses have no questions, so they can't be fought.** Pick a few, check each fact against a real source, add the `sourceUrl`, and tell Trinh which are correct. The UI-authored ones don't have sources yet, and the Davis "cattle crossroads" question was flagged as possibly wrong.

For local development before that, add `ALLOW_UNVERIFIED_TRIVIA=1` to `.env.local` to serve unverified questions. It's ignored in production.

**Still open: gold vs points.** The UI uses gold; the backend counts points. Same number for now, so label it however the UI wants.

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
curl "localhost:3000/api/leaderboard?scope=line"            # or scope=user for the top 20 riders

# Arrival guess: lock in, then poll until resolved
curl -c jar.txt -b jar.txt -X POST localhost:3000/api/guess -H 'content-type: application/json' \
  -d '{"stationId":"place-pktrm","guessMinutes":4}'
curl -c jar.txt -b jar.txt localhost:3000/api/guess/<id from above>

# Check in (teleport skips the GPS check, for the demo)
curl -c jar.txt -b jar.txt -X POST localhost:3000/api/checkin -H 'content-type: application/json' \
  -d '{"stationId":"place-pktrm","lat":0,"lon":0,"teleport":true}'

# Trivia: only verified questions are served, and the answer never leaves the server
curl "localhost:3000/api/trivia?stop=place-pktrm&wait=300"
curl -c jar.txt -b jar.txt -X POST localhost:3000/api/trivia/answer -H 'content-type: application/json' \
  -d '{"roundId":"<from /api/trivia>","questionId":"pktrm-1","choiceIndex":0}'

# Progression: stations are levels, a final boss ends each chapter (components/run/stations.ts)
curl -c jar.txt -b jar.txt localhost:3000/api/progress
curl -c jar.txt -b jar.txt -X POST localhost:3000/api/minigame/result -H 'content-type: application/json' \
  -d '{"stationId":"alewife","score":420,"cleared":true,"durationMs":30000}'
curl -c jar.txt -b jar.txt -X POST localhost:3000/api/final-boss/start -H 'content-type: application/json' \
  -d '{"chapterId":"red","demo":true}'
curl -c jar.txt -b jar.txt -X POST localhost:3000/api/final-boss/answer -H 'content-type: application/json' \
  -d '{"fightId":"<id from start>","questionId":"<from start.questions>","choiceIndex":0}'   # max one per 1.5s
curl -c jar.txt -b jar.txt -X POST localhost:3000/api/final-boss/forfeit -H 'content-type: application/json' \
  -d '{"fightId":"<id>"}'
curl "localhost:3000/api/trivia?line=Red"                     # Delay Boss questions for a line
```

Still mock (the shape is final, the data is not): `/api/chat`.

### Mastra: The Conductor

An AI guide in the game ("💬 Ask the Conductor" on the map), built with **Mastra** (`mastra/`):
- **Agent** (`mastra/agents/conductor.ts`): runs on Gemini (`gemini-3.1-flash-lite`, falling back to `gemini-3.6-flash`), and decides which **tools** to call:
  - `get-next-trains` (live MBTA)
  - `get-line-delays` (Tiger Data continuous aggregates)
  - `get-delay-boss`
  - `get-rider-progress` (stamps, End Bosses, next stop each direction, where to switch lines)
  - `get-station-info` (story, fact, mini-game, photo quest)

  It never invents a train time or delay.
- **Memory:** message history plus **working memory** (home station, favorite line, goal), per rider. It's stored in **Tiger Data** (`mastra` schema, via `@mastra/pg` on the app's pool), so it remembers you across visits.
- **Workflow** (`mastra/workflows/plan-ride.ts`): **gather** (trains, delays, boss and progress in parallel) → **decide** (rule-based next stop, train, delay risk) → **narrate** (the Conductor says it in character). The "Plan my ride" button runs it.
- `POST /api/chat { stationId, message }` returns the answer plus `toolsUsed`; the UI shows them as chips. `POST /api/plan-ride { stationId }` runs the workflow.
- Try it from the terminal: `npm run conductor -- "Should I wait for the next train?" bucentral`.

### Gemini

- **Photo quests:** Gemini Vision checks every photo (see "World: photo quests").
- **Boss names:** when a real delay spawns a Delay Boss, Gemini names it and writes its taunt from the actual numbers (late trains, share late, worst delay), e.g. "The Grand Orange Switchblade: Your commute stalls for 13 minutes while my shadow consumes the tracks". `GET /api/boss/persona?line=Orange` (`lib/bossPersona.ts`). It's written once and stored on the boss (`boss_events.name/taunt`), so everyone on the line fights the same boss and Gemini is called once per boss. If Gemini is busy, the screens keep their built-in names.

### Tiger Data

- `prediction_snapshots` is a **hypertable**: every MBTA prediction, ~1,300 rows every 15 s (2M+ so far), with **columnstore compression** (about 89% smaller: 100 MB → 11 MB).
- Two **continuous aggregates** keep 5-minute buckets up to date in the background: `delay_5m` (avg/max delay) and `late_share_5m` (share of predictions 5+ min late, the signal that spawns a Delay Boss).
- `GET /api/delays?line=Orange&hours=3` serves the chart shown when a Delay Boss appears ("THE REAL DELAY", with the 50% boss line), so a 3-hour chart is ~36 pre-computed rows instead of scanning raw data.

### Testing the backend

- **See it working:** open <http://localhost:3000/dev>. It's a plain console that shows the live delay bosses, a countdown to the next trains, and buttons to clear stations and fight a final boss. It's not the game UI.
- `npm test`: unit tests for the boss detector, scoring, and check-in distance. No database or network needed.
- `npm run test:api`: with `npm run dev` running, plays one fresh rider through every live route and prints PASS or FAIL for each check. Set `BASE=https://...` to test a deployed server.

### Deploy (team): GoDaddy domain + Vercel

**In progress, owned by the team. Full handoff with steps, env vars and the pass condition: [`docs/HANDOFF-deploy-vercel.md`](docs/HANDOFF-deploy-vercel.md).** The poller keeps running on one laptop; Vercel serves the site over HTTPS so phones get the camera and GPS.

### Deploy (Vultr, HTTPS) (not used for now)

Phones only allow the camera and GPS over HTTPS, so the photo quest and location check-in need the deployed site.
1. Create an Ubuntu 24.04 server on Vultr (2 GB RAM or more) with your SSH key. Point your domain's A record at its IP, or skip the domain and use `<ip-with-dashes>.sslip.io`.
2. Once, on the server as root: `bash setup-server.sh <domain>` (copy it there with `scp deploy/setup-server.sh root@<ip>:`). This installs Node 22, Caddy (automatic HTTPS), the `tminus-web` and `tminus-poller` services, the firewall and swap.
3. From your laptop, whenever you want to deploy: `bash deploy/push.sh root@<ip>`. It copies the code and `.env.local` over SSH, builds, and restarts both services.
4. Stop the poller on your laptop once the server's poller is running.
5. **Pass condition:** open `https://<domain>` on a real phone, allow location and camera, and complete a photo quest.

Don't run `next build` while `npm run dev` is running locally: they share `.next`, and that breaks the dev server (stale CSS, endless reloads). If it happens: stop dev, `rm -rf .next`, start again.

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
