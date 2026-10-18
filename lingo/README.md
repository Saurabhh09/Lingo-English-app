# Lingo · A little English, every day

A working, responsive English-learning app inspired by your lime, yellow, blue, and lavender reference. Built with React, Vite, a Node/Express backend, and an optional Supabase database.

## Try it

The running app is available in the conversation’s **live preview**, on port **3000**.

It opens as a clearly labeled demo explorer. Click **Make it yours** (or the account avatar) to create an account using only:
- A name (does not need to be unique)
- A unique username (3–20 letters, numbers, or underscores)
- A password (at least 8 characters)

New accounts start at zero. The demo’s starting XP, word count, and streak are sample statistics; lesson completions and new activity are real and saved.

### What works

- **Dashboard:** actual lesson progress, XP, word counts, daily goals, streaks, weekly activity, saved-word library, and browser-based pronunciation.
- **Learn:** six sequential levels in two units (beginner and intermediate), five questions per lesson, immediate explanations, server-validated scoring, one-time XP rewards, and level unlocks at 60% accuracy. Completed levels can be practiced again.
- **Play:** difficulty and topic selection, 1/3/5/10-minute maximum time limits, unique six-character room codes, rooms for up to eight players, live joining, host-controlled start, timed questions, speed bonuses, and a final leaderboard. Solo play works too.
- **Navigation:** animated transitions, mobile bottom navigation, left/right touch swipes, arrow-key switching, and visible next/previous buttons.
- **Accounts:** signup, login, logout, persistent sessions, unique usernames, hashed passwords, and authenticated access to private records.
- **Responsive details:** locally hosted fonts, animated custom SVG artwork, accessible labels, dialog focus trapping, and reduced-motion support.

### Test multiplayer

1. Open **Play & learn**, select the game settings, and click **Create a game**.
2. Copy the room code.
3. Open the same live-preview URL in an **incognito window or a second device**. A second regular tab shares your account, so use a separate browser session to be a different player.
4. Enter the room code under **Got an invite?**.
5. Start the game from the host’s window. Both windows see the same questions and scoreboard.

Room and score updates use authenticated polling every 1.2 seconds, not Supabase Realtime subscriptions. The server controls correct answers, deadlines, and scoring. Each question lasts up to 20 seconds; if everybody answers, the next question appears after a short explanation period. The selected game duration is a maximum time limit, not a required minimum. Games may finish earlier when all questions are answered. Game points stay in the room; learning XP comes from lessons.

## Run locally

Requires Node **20.20+** (or a recent Node 22 release).

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The Express server handles both the API and the Vite frontend, so the app needs only one public port. All client API calls use relative `/api` URLs.

For a production build:

```bash
npm run build
npm start
```

Deploy the Node app to a server that supports long-running processes. Set `PORT` if your hosting provider requires it. The server binds to `0.0.0.0` and supports preview/proxy hosts.

## Connect your Supabase database

**Supabase is not connected in the preview yet:** no project credentials were provided. The functional demo instead persists records in `data.json` on the app server. This is shared backend storage, so the multiplayer flow works across browsers/devices; it is not a localStorage-only mock.

To switch all database reads and writes to Supabase:

1. Create or choose your Supabase project.
2. Run **`supabase/schema.sql`** in the project’s SQL Editor.
3. Copy `.env.example` to `.env`.
4. Set the project URL and the **server-side service role key**:

   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-server-side-service-role-key
   PORT=3000
   ```

5. Restart the Node server. It logs **Supabase connected**, and account details show the selected database.

**Keep the service role key private.** It belongs only in server environment variables. Never use a `VITE_` prefix, commit `.env`, or expose it to the browser. The public/anon key is intentionally not needed: the trusted backend authenticates and authorizes every request.

The database has private `lingo_accounts`, `lingo_sessions`, `lingo_progress`, and `lingo_games` tables. RLS is enabled and public access is revoked. The application uses username/password authentication on the backend rather than Supabase Auth’s email-oriented workflow, keeping your requested signup free of email. Passwords are salted and hashed with scrypt; only session-token hashes are stored in the database. Sessions expire after 30 days.

Existing local demo records are **not migrated automatically** when switching to Supabase. A previous local session will be replaced by a new demo session, and you can sign up anew in the connected database.

## Project map

```
src/main.jsx       App, dashboard, lessons, games, accounts, dialogs
src/Art.jsx        Custom SVG artwork and brand mark
src/style.css      Pastel theme, responsive layout, animations
content.js         Curriculum and game question bank
server.mjs         API, authentication, persistence, game engine
supabase/schema.sql Private Supabase tables and permissions
public/            Local fonts, font license, favicon
.env.example       Server environment template
tests/e2e.mjs      Two-browser UI integration test
tests/api.mjs      API validation and authorization tests
```

## Verification

```bash
npm run build
# With the app running on port 3000:
npm run test:api
npx playwright install --with-deps chromium
npm run test:e2e
```

The browser test covers signup, lesson scoring/unlocks, saved words, reload persistence, two-browser joining, host start, synchronized game rounds, scores/results, responsive layout, swipe navigation, and absence of browser errors. Local mode has been tested; the Supabase adapter requires your project configuration before live verification.

## Before a larger public launch

This is a complete working small-app foundation, not a claim of production-scale readiness. Use a **single Node process**: write serialization currently uses in-process locks. For horizontal scaling, move critical updates/code allocation into transactional Postgres functions and add presence/heartbeat handling. Other launch work includes password recovery without email, distributed rate limiting, session/abandoned-room cleanup, backups, security review, and a larger curriculum. Local demo storage should be replaced with Supabase or a persistent disk before deploying.

Browser pronunciation depends on speech-synthesis support. No paid AI/API is needed. External image or font CDNs are not required.
