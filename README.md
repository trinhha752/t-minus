# Enchanted T

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

| Role | Owns |
|---|---|
| Frontend | `components/`, page files in `app/` |
| Backend | `lib/` (except `mbta.ts`), `api/trivia/answer`, `checkin`, `guess`, `me`, `leaderboard` |
| Transit | `lib/mbta.ts`, `api/trains`, `predictions`, `boss`, `scripts/seed-stations.ts`, `scripts/poll-predictions.ts` |
| Characters | `mastra/`, `api/trivia`, `api/chat`, `scripts/seed-trivia.ts` |

## Rules that matter

- MBTA calls are server-side only; the key never reaches the browser.
- Trivia answers are checked server-side; never send `answerIndex` to the browser.
- Boss damage is applied server-side in one transaction.
- Times go over the wire as ISO strings.
- Trivia facts are hand-written and verified with a `sourceUrl`; the model only words them.
