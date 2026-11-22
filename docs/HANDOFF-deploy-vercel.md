# Handoff: GoDaddy domain + Vercel deploy

**Owner:** the team (not Trinh). Trinh is on the Mastra agent.
**Why it matters:** phones only allow the **camera and GPS over HTTPS**. Without a deployed HTTPS
site, the photo quest and location check-in can't be shown on a phone, and judges can't open the game.
**Prizes:** "Best Domain Name from GoDaddy Registry" (register the domain with GoDaddy Registry this weekend).
**Not doing:** Vultr. (`deploy/` has a Vultr kit if that changes.)

## Done = this works
On a **real phone**, open `https://<your-domain>`:
1. The pixel map loads (no endless reloading).
2. Allow **location**: the map says "You're at ..." (or use the **DEMO · stand at** panel).
3. Check in → brake → **Photo quest** → allow **camera** → photo of a sign passes, a selfie fails.
4. "Simulate delay" shows a Delay Boss with a Gemini name and **THE REAL DELAY** chart.

"It deployed" is not done. The phone camera is the pass condition.

## 1. Domain (GoDaddy Registry)
- Get the free code from the BostonHacks Discord / MLH ("Build with GoDaddy Registry" on the prize page).
- Register a name (e.g. `tminus.club`, `ridethet.xyz`, whatever the code covers).
- Leave DNS at defaults for now; Vercel gives you the records in step 3.

## 2. Vercel project
1. vercel.com → Add New → Project → import `trinhha752/t-minus` (private repo: give Vercel access).
2. Framework: **Next.js** (auto). Build command, output: defaults. Node: 22.x.
3. **Environment variables** (Production), values from Trinh's `.env.local` (ask by DM; never commit, never paste in chat):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Tiger Data connection string (same as `.env.local`) |
   | `MBTA_API_KEY` | same as `.env.local` |
   | `GOOGLE_GENERATIVE_AI_API_KEY` | same as `.env.local` |
   | `NEXT_PUBLIC_DEMO_MODE` | `1` (shows the DEMO panel, Simulate delay, New rider; allows teleport check-in) |
   | `GEMINI_MODEL` | leave unset (defaults to `gemini-3.1-flash-lite,gemini-3.6-flash`) |
   | `PHOTO_FAIL_OPEN` | leave unset (busy checker = "check again", not an auto-pass) |

   `NEXT_PUBLIC_DEMO_MODE` is read **at build time**: after changing it, **redeploy**.
4. Deploy. Open the `*.vercel.app` URL and run the "Done" checklist on a laptop first.

## 3. Point the domain at Vercel
1. Vercel → Project → Settings → **Domains** → add `your-domain` (and `www.your-domain`).
2. Vercel shows the exact DNS records. Usually: **A** `@` → `76.76.21.21`, **CNAME** `www` → `cname.vercel-dns.com`.
3. Add those records at GoDaddy Registry's DNS for the domain. HTTPS is automatic once DNS resolves (minutes, sometimes longer).
4. Run the "Done" checklist on a phone.

## Things that will bite
- **The poller does NOT run on Vercel.** It's a long-running loop (`npm run poll`: MBTA → Tiger Data every 15 s, spawns and retires Delay Bosses). Vercel only runs request handlers. **Keep it running on one laptop** (`npm run poll`, Trinh's or a teammate's with `.env.local`). Only ONE poller at a time. If nobody runs it, the game still works, but delays/bosses stop updating.
- **Offline seed fallback** (`lib/mbta.ts` reads `public/seed/mbta-fallback.json` with `fs`) may not be readable inside Vercel functions. It only matters if the MBTA API is down; the live API works.
- **DB connections:** `lib/db.ts` uses a pool of 8 per function instance. Fine for a demo. If Tiger Data reports too many connections, lower `max` to 3.
- **Photo checks** take ~1–2 s (Gemini); the budget is 8 s, under Vercel's default function limit. On the free Gemini tier, rapid photos can return "checker busy": wait a few seconds or enable billing on the key's Google project.
- **Local dev:** never run `next build` while `npm run dev` is running (they share `.next` → stale CSS / endless reloads). Fix: stop dev, `rm -rf .next`, start again.
- `next.config.ts` `allowedDevOrigins` is dev-only; it doesn't affect Vercel.

## After it works
- Put the URL in the README ("Play it: https://...") and in the Devpost submission.
- Tell Trinh, so the demo script uses the real domain.
