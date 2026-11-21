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

## Rules that matter

- MBTA calls are server-side only; the key never reaches the browser.
- Trivia answers are checked server-side; never send `answerIndex` to the browser.
- Boss damage is applied server-side in one transaction.
- Times go over the wire as ISO strings.
- Trivia facts are hand-written and verified with a `sourceUrl`; the model only words them.
