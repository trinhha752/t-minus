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

## Backend API

Run `npm run dev`, then hit `http://localhost:3000`. Everything returns `{ ok: true, data }` or `{ ok: false, error }`; shapes are in `types.ts`.
The rider is a cookie (`et_uid`) created on first use. Browsers keep it automatically; with curl, pass `-c jar.txt -b jar.txt` so calls act as one rider.

```bash
# Transit (live MBTA, 10s cache)
curl "localhost:3000/api/predictions?stop=place-pktrm"      # next 3 arrivals; negative secondsAway = train at the platform
curl "localhost:3000/api/trains?line=Red"                   # line = Red | Orange | Blue | Green-B | Green-C | Green-D | Green-E | all

# Delay (mini) boss: shared by everyone on the line
curl "localhost:3000/api/boss"                              # 4 lines: active, hp, lateTrains, avgDelaySeconds

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

Still mock (shapes are final, data is not): `/api/me`, `/api/leaderboard`, `/api/guess`, `/api/guess/[id]`, `/api/chat`.

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
