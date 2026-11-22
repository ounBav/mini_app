# dlbot Mini App

Telegram Mini App for the **dlbot** media downloader: paste a YouTube, TikTok or Facebook link,
preview it, choose MP4 (with quality) or MP3, watch the progress, and save the file to the device.

Vue 3 (`<script setup lang="ts">`) · TypeScript · Vite · Tailwind CSS · Pinia. No UI library,
no router (one page). About 53 KB gzipped (JS + CSS).

The API is the existing dlbot FastAPI service (`dlbot/apps/bot/app/api.py`). It is the source of
truth: [`src/types/api.ts`](src/types/api.ts) mirrors its responses field by field.

## How it works

```
open ──▶ GET /api/me            (Authorization: tma <initData>; >3 s ⇒ "Waking up the server…",
                                 unreachable ⇒ probe GET /health for up to 60 s, then retry)
paste ─▶ POST /api/info {url}   → title, thumbnail, duration, uploader, has_video, qualities
pick ──▶ POST /api/downloads {url, format, quality, delivery:"device"} → {id, status:"queued"}
poll ──▶ GET /api/downloads/{id} every 1.5 s → 3 s → 6 s (backoff on network errors)
           queued → downloading (progress 0–1) → (retrying) → (processing) → done | failed | cancelled | expired
save ──▶ job.file.download_path = /api/files/<token>  (public, valid FILE_TTL_MIN = 15 min)
           Telegram 8.0+: WebApp.downloadFile({url, file_name}); older: WebApp.openLink(url)
```

- **Auth**: every `/api/*` call sends `Authorization: tma <Telegram.WebApp.initData>`; dlbot checks
  the HMAC with the bot token (`webapp_auth.py`). `/health` and `/api/files/<token>` need no auth.
- **One job at a time**: if the server answers `409 E-BUSY`, the app shows the running job.
- **Reopen**: the current job is kept in `sessionStorage`. In a fresh webview, the app asks
  `GET /api/downloads` for a job that is still running.
- **Errors**: every `E-*` code from dlbot gets its own title and message
  ([`src/lib/errors.ts`](src/lib/errors.ts)), plus the right action: _Try again_ (with a countdown
  for rate limits), _Try 480p_ / _Try audio instead_ for files that are too big, or _Back_.

## Project layout

```
src/
  api/client.ts            fetch wrapper: base URL, initData header, timeout, ApiError mapping
  api/media.ts             typed calls for every dlbot endpoint
  types/api.ts             TS mirror of the dlbot responses
  types/telegram.ts        the Telegram WebApp API subset used here
  composables/useTelegram.ts   ready/expand, theme, MainButton, BackButton, haptics, downloadFile
  composables/useJobPolling.ts polling with backoff; stops on final status, stop() or unmount
  composables/useNow.ts    ticking clock for countdowns
  stores/download.ts       Pinia: phase (boot/wake/auth), step, link, info, choice, job, error
  components/              UrlInput, PlatformBadge, PlatformIcon, MediaPreview, FormatToggle,
                           QualityChips, ProgressCard, ResultCard, ErrorState, Skeleton, Spinner,
                           WakeUpScreen, FullScreenState, ToastMessage, DevBottomBar
  views/DownloaderView.vue the five steps + MainButton/BackButton wiring
  lib/                     strings (all copy), errors, url, format, session, platforms
tests/                     Vitest: helpers, store flows against a contract-shaped fetch mock, App render
scripts/sign-init-data.mjs signs a dev initData string with your DEV bot token
```

## Environment variables

| Variable             | Required | Example                            | Notes                                                   |
| -------------------- | -------- | ---------------------------------- | ------------------------------------------------------- |
| `VITE_API_BASE_URL`  | yes      | `https://bot-webhook.onrender.com` | dlbot web service, no trailing slash                    |
| `VITE_BOT_USERNAME`  | no       | `my_dl_bot`                        | Without `@`. "Open in Telegram" button outside Telegram |
| `VITE_DEV_INIT_DATA` | no       | output of `npm run sign-init-data` | Dev server only; never included in a production build   |

Vite inlines these at **build** time: change them, then rebuild.

### dlbot settings this app needs (env vars only, no code change)

| dlbot env var  | Value                                                                | Why                                                           |
| -------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| `MINIAPP_URL`  | URL of this static site, e.g. `https://dlbot-mini-app.onrender.com/` | Adds the site's origin to CORS and sets the bot's menu button |
| `CORS_ORIGINS` | e.g. `http://localhost:5173,https://xyz.trycloudflare.com`           | Extra origins: local dev and tunnels (comma-separated)        |

## Local development

Requirements: Node 20+, the dlbot backend running locally (`docker compose up` in `dlbot/`, on
`:8000`) with a **separate dev bot token**. Never use the production token locally: two pollers
on one token both get `409 Conflict`.

```bash
npm ci
cp .env.example .env.local
# .env.local:  VITE_API_BASE_URL=http://localhost:8000
# dlbot apps/bot/.env:  CORS_ORIGINS=http://localhost:5173
npm run dev            # http://localhost:5173
```

**In a normal browser** the app runs in dev mock mode: a bar at the bottom stands in for
Telegram's MainButton and BackButton. To make API calls pass auth, sign a dev initData with the
same dev bot token the backend uses:

```bash
BOT_TOKEN=<dev bot token> USER_ID=<your Telegram id> npm run sign-init-data
# copy the output into .env.local as VITE_DEV_INIT_DATA=...   (valid 24 h, MINIAPP_AUTH_MAX_AGE)
```

**Inside Telegram** (real initData, MainButton, haptics, downloadFile), Telegram needs HTTPS.
Tunnel both the app and the API:

```bash
cloudflared tunnel --url http://localhost:5173    # → https://<a>.trycloudflare.com  (Mini App)
cloudflared tunnel --url http://localhost:8000    # → https://<b>.trycloudflare.com  (API)
# or: ngrok http 5173  /  ngrok http 8000
```

Set `VITE_API_BASE_URL=https://<b>.trycloudflare.com` in `.env.local` and restart `npm run dev`.
On the backend, set `MINIAPP_URL=https://<a>.trycloudflare.com/` (or add it to `CORS_ORIGINS`),
then restart it. Point the dev bot's Mini App URL at `https://<a>.trycloudflare.com` (see BotFather
below).

## Quality checks

```bash
npm run type-check     # vue-tsc, strict
npm run lint           # ESLint (flat config, vue + typescript), zero warnings allowed
npm run format:check   # Prettier
npm test               # Vitest
npm run check          # all of the above
npm run build          # type-check + production build into dist/
```

## Deploy

### Render Static Site (recommended, same place as dlbot)

1. Put this folder in a Git repository (its own repo, or a folder in the dlbot monorepo).
2. Render → **New → Blueprint** and select the repo. [`render.yaml`](render.yaml) creates the
   static site with `npm ci && npm run build`, publishes `dist/`, and rewrites `/*` to `/index.html`.
   If the folder is not the repo root, set **Root Directory** to it.
   Without Blueprints: **New → Static Site**, build command `npm ci && npm run build`, publish
   directory `dist`, then **Redirects/Rewrites**: source `/*`, destination `/index.html`, action
   **Rewrite**.
3. Set `VITE_API_BASE_URL` (and optionally `VITE_BOT_USERNAME`) and deploy.
4. On the dlbot web service, set `MINIAPP_URL` to the new site URL and redeploy it. This allows
   CORS for the new origin and updates the bot's menu button.

### Vercel / Netlify

- Vercel: import the repo; [`vercel.json`](vercel.json) sets the build, `dist/` and the SPA rewrite.
- Netlify: build `npm run build`, publish `dist`; [`public/_redirects`](public/_redirects) does the rewrite.

Set `VITE_API_BASE_URL` in the project's environment variables, and `MINIAPP_URL` on dlbot.

### Set the Mini App URL in BotFather

1. `@BotFather` → `/mybots` → your bot → **Bot Settings → Configure Mini App → Enable Mini App**,
   and enter the static site URL (HTTPS).
2. Optional menu button: **Bot Settings → Menu Button** with the same URL. dlbot already sets the
   menu button itself on startup when `MINIAPP_URL` is set (`setChatMenuButton`), so this is
   only needed if you leave `MINIAPP_URL` empty.
3. Open the bot in Telegram and tap the menu button.

## Cold starts (Render free plan)

The free dlbot instance sleeps after 15 idle minutes. When the first request takes more than
3 seconds, the app shows **"Waking up the server…"** and keeps probing `GET /health` for up to
60 seconds before it shows "Can't reach the server" with a **Try again** button. The same wake-and-retry
runs if the server falls asleep while the app is open. dlbot's README "Keep-alive on Render"
(external pinger) avoids most cold starts.

## Manual test checklist

Run in Telegram iOS, Android and Desktop, in both light and dark themes.

- [ ] Open from the menu button: the app opens expanded, header and background match the theme,
      no flash of white in dark mode.
- [ ] Switch the Telegram theme while the app is open: colors update without a reload.
- [ ] **Paste** reads the clipboard (or shows "Long-press the field and choose Paste" if blocked).
      Share text such as `Look at this https://vm.tiktok.com/… !` is reduced to the link.
- [ ] A `vimeo.com` link shows "This site isn't supported"; plain text shows "That doesn't look like a link".
- [ ] YouTube link → preview with thumbnail (skeleton first), title (max 2 lines), duration, uploader.
- [ ] Video/Audio toggle; quality chips show only the qualities the server listed.
- [ ] MP4 720p → progress shows the stage text, percentage and bar → "Your file is ready" with name,
      size and the expiry countdown → **Save to device** opens the native download sheet (8.0+).
- [ ] TikTok → MP3 and Facebook → MP4 work end to end.
- [ ] **Cancel** asks for confirmation and returns to the preview with "Download cancelled."
- [ ] BackButton: preview → paste screen; error → previous step; done → paste screen.
- [ ] Close the app mid-download and reopen: the progress screen comes back.
- [ ] Start a second download from the chat while one runs: the app shows the running job (E-BUSY).
- [ ] Private / removed / live / playlist links show their own messages.
- [ ] A long video at 1080p over 50 MB → "File too large" with **Try 720p** and **Try audio instead**.
- [ ] Six downloads within a minute → "Slow down a little" with a live countdown on the button.
- [ ] Let the dlbot instance sleep (15 min) and open the app: "Waking up the server…", then the app.
- [ ] Airplane mode during progress: "Connection lost. Reconnecting…", then it resumes.
- [ ] Wait more than 15 min on the done screen: "The link has expired", the button becomes **Try again**.
- [ ] Open the site URL in a normal browser: "Open this in Telegram".
- [ ] VoiceOver/TalkBack: stage changes are announced; all buttons have labels; focus rings show
      with a keyboard (Desktop).
- [ ] Reduce Motion on: no shimmer, spinner or sliding bar animation.
- [ ] Telegram Web (web.telegram.org/k or /a): Save to device downloads the file. If it fails
      there, add `https://web.telegram.org` to dlbot's `CORS_ORIGINS`.
#   m i n i _ a p p  
 