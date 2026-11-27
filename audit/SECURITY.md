# Lingo Security Audit Report (Phases 1)

**Branch:** `security-hardening` (from `main`)  
**Environment Audited:** Local isolated server (`ISOLATED_TEST=1`, temp JSON store), codebase static analysis, git history scan, built `lingo/dist/` bundle, and `lingo/releases/lingo.apk`. Live production site/API/Supabase were **never** attacked, scanned, or mutated.

---

## Summary Counts by Severity

| Severity | Count |
|---|---:|
| **Critical** | 1 |
| **High** | 7 |
| **Medium** | 3 |
| **Low** | 1 |
| **Total** | **12** |

---

## Ranked Findings Index

1. **SEC-01** `[Critical]` — Client-trusted checkpoint XP, accuracy & arbitrary IDs (`lingo/server.mjs:579-627`)
2. **SEC-02** `[High]` — In-memory mutexes, rate limiters & full-table caches fail on Vercel serverless (`lingo/server.mjs:89-129, 232-253`)
3. **SEC-03** `[High]` — Unauthenticated answer-key leakage & unauthenticated speech endpoint (`lingo/server.mjs:328-361`)
4. **SEC-04** `[High]` — Cross-user profile/presence IDOR & directory enumeration (`lingo/server.mjs:1873-1951`)
5. **SEC-05** `[High]` — User block enforcement bypass in private communities & multiplayer rooms (`lingo/server.mjs:1397-1438, 2099-2245`)
6. **SEC-06** `[High]` — Unbounded LLM cost abuse & forged AI conversation XP (`lingo/server.mjs:763-828, 1106-1363`)
7. **SEC-07** `[High]` — Wildcard CORS (`*`) & missing HTTP security headers (`lingo/server.mjs:59-67`, `lingo/vercel.json`)
8. **SEC-08** `[High]` — Debug-signed & debuggable Android APK distribution + permissive manifest (`lingo/android/app/build.gradle`, `AndroidManifest.xml`)
9. **SEC-09** `[Medium]` — Brute-forceable 6-hex room codes with no join rate limiting (`lingo/server.mjs:1348, 1397-1438`)
10. **SEC-10** `[Medium]` — Tracked `.env` / Vite metadata, commented keystore `.gitignore`, unpinned `"latest"` deps & `npm audit` CVEs (`.gitignore`, `lingo/package.json`)
11. **SEC-11** `[Medium]` — Auth timing oracle, 30-day unrevoked sessions, missing Play account-deletion flow, production error guard (`lingo/server.mjs:364-377, 2774`)
12. **SEC-12** `[Low]` — Client-side XP/gems/reward synthesis from `localStorage` (`lingo/src/main.jsx:233-315`)

---

## Detailed Findings

### SEC-01 — Client-Trusted Checkpoint XP, Accuracy & Arbitrary IDs
- **Severity:** Critical  
- **Category:** API4 / Business Logic & Anti-Cheat Integrity  
- **Location:** `lingo/server.mjs:579-627` (`POST /api/progress/checkpoint`), `lingo/src/main.jsx:905-942`
- **Real-World Impact:** Any authenticated user can forge arbitrary XP, learned-word counts, streaks, and achievement progress in a single request—bypassing prerequisites, server-side answer grading, and valid curriculum checkpoint IDs.
- **Minimal Reproduction (Local `ISOLATED_TEST=1`):**
  1. Sign up/sign in as User B (`lingo/tests/security-audit-matrix.mjs`).
  2. `POST /api/progress/checkpoint` with `{ "checkpointId": "checkpoint-forged-999", "correct": 1000, "total": 1000, "xp": 50000 }`.
  3. **Observed:** `200 OK`, `earned=50000`, `progress.xp=50000`, `progress.words=1000`.
- **Proposed Fix:** Require submitted `answers` array graded server-side against canonical checkpoint questions from `curriculumCatalog.mjs`, validate `checkpointId` exists and prerequisites are completed, and derive XP/word counts strictly on the server (never read `xp`, `correct`, or `total` from `req.body`).
- **Risk of Fix:** Low — client `Lesson` component (`main.jsx:2735-2745`) already collects `answers` and can send `{ checkpointId, answers }`.
- **Effort:** Medium (1–2 hours).

---

### SEC-02 — In-Memory Mutexes, Rate Limiters & Caches Fail on Vercel Serverless
- **Severity:** High  
- **Category:** Serverless Concurrency, Availability & API4 Lack of Resources / Rate Limiting  
- **Location:** `lingo/server.mjs:89-129` (`socialDirectoryCache`, `limit(5000)` scans), `lingo/server.mjs:232` (`locks = new Map()`), `lingo/server.mjs:235-253` (`rate = new Map()` + `setInterval`), `api/index.js:1-4`
- **Real-World Impact:** On Vercel, separate warm serverless isolates do not share RAM. Concurrent requests from a single user or multiple users hit different instances simultaneously, defeating `locks` (risking race conditions on `claimReward`, `signup`, `__lingo_social_state__`, and multiplayer updates) and bypassing the `/api/auth` IP rate limiter (enabling brute-force login and unlimited account minting). Meanwhile `listAccountsAndProgress()` scans up to 5,000 rows from `lingo_accounts` and `lingo_progress` on every cold instance/cache miss.
- **Minimal Reproduction:** Inspect `lingo/server.mjs:89-130, 232-253`; single-process `locks` serialized parallel requests locally (`[50, 0]`, `[200, 400]`), confirming synchronization relies exclusively on process-local `Map` objects unavailable across serverless instances.
- **Proposed Fix:** Move shared social state and rate limiting out of in-memory `Map`/global JSON blobs into Supabase atomic SQL operations / RPCs (proposed migration in `lingo/supabase/proposed/`) and/or Vercel Firewall / Upstash Redis rate limiting, and replace `limit(5000)` directory scans with indexed targeted Supabase queries (`eq`, `ilike`).
- **Risk of Fix:** Medium — requires careful proposed SQL migrations and compatibility with local `ISOLATED_TEST=1` fallback.
- **Effort:** High (half day).

---

### SEC-03 — Unauthenticated Curriculum Answer-Key Disclosure & Unauthenticated Speech Endpoint
- **Severity:** High  
- **Category:** API2 / Broken Authentication & Anti-Cheat Integrity  
- **Location:** `lingo/server.mjs:328-361` (`POST /api/pronunciation/evaluate`, `POST /api/curriculum/exercises/check`)
- **Real-World Impact:** Any unauthenticated script on the internet can enumerate every lesson ID from public `/api/curriculum/levels` and submit `{ lessonId, exerciseIndex, choice: 0 }` to `/api/curriculum/exercises/check` to dump every `correctIndex` across Pre-A1 through C2 without signing in or unlocking prerequisites.
- **Minimal Reproduction (Local `ISOLATED_TEST=1`):**
  1. Without an `Authorization` header, `POST /api/curriculum/exercises/check` with `{ "lessonId": "<last lesson id>", "exerciseIndex": 0, "choice": 0 }`.
  2. **Observed:** `200 OK` with `{"isCorrect":false,"correctIndex":1}`.
  3. Unauthenticated `POST /api/pronunciation/evaluate` also returned `200 OK`.
- **Proposed Fix:** Place both routes behind the authentication middleware (`L378`), require prerequisite completion before checking exercises, and avoid returning `correctIndex` on wrong attempts (or track per-attempt state server-side).
- **Risk of Fix:** Low–Medium — check `main.jsx:2712-2714` and `tests/curriculum.mjs` so UI/tests keep working when signed in (only reveal `correctIndex` to authenticated users who have unlocked the lesson after a submitted check, or after completion).
- **Effort:** Low–Medium (1 hour).

---

### SEC-04 — Cross-User Profile & Online Presence IDOR + User Enumeration
- **Severity:** High  
- **Category:** API1 Broken Object Level Authorization (BOLA) / Privacy  
- **Location:** `lingo/server.mjs:1873-1951` (`GET /api/social/search`, `GET /api/social/users/:username`), `lingo/server/socialEngine.mjs:51-70`
- **Real-World Impact:** Any signed-in account can look up any non-blocked user's private activity (`xp`, `streak`, `words`, `lessonsCompleted`, `earnedBadgeIds`, `isOnline`, exact `lastActiveAt` timestamp, and `lingoId`) via `/api/social/users/:username`, and systematically harvest accounts with 2-character search prefixes (`?q=aa`, `?q=se`) via `/api/social/search`.
- **Minimal Reproduction (Local `ISOLATED_TEST=1`):**
  1. Sign up User A and User B with no friendship or shared community.
  2. User B sends `GET /api/social/users/<userA>` and `GET /api/social/search?q=sec_`.
  3. **Observed:** Both return `200 OK` exposing `lingoId`, `xp`, `streak`, `words`, `lessonsCompleted`, `badgesCount`, `cefrLevel`, `isOnline`, `lastActiveAt`, and `earnedBadgeIds`.
- **Proposed Fix:**
  - On `GET /api/social/users/:username`: return full study metrics/online status/`earnedBadgeIds` only to self, accepted friends, or shared-community members; restrict strangers to minimal non-sensitive identity (`username`, `name`, `avatar`, `avatarColor`, `friendStatus`).
  - On `GET /api/social/search`: require exact `@username` or exact `LNG-...` Lingo ID match (or return only minimal card fields without `lastActiveAt`/`earnedBadgeIds`/XP for non-friends) and apply per-user rate limiting.
- **Risk of Fix:** Medium — affects `Find Friends` search UX; verify behavior expectation before restricting partial name search.
- **Effort:** Medium (1–2 hours).

---

### SEC-05 — User Block Bypass on Private Communities & Multiplayer Game Rooms
- **Severity:** High  
- **Category:** API1 / API5 Broken Authorization  
- **Location:** `lingo/server.mjs:1397-1438` (`POST /api/games/join`), `lingo/server.mjs:2099-2133` (`POST /api/social/blocks`), `lingo/server.mjs:2201-2245` (`GET /api/communities/:id`), `lingo/supabase/migrations/20261126000001_social_friends_communities.sql:131-168`
- **Real-World Impact:** Blocking a user deletes friendships and cancels pending friend/game invites, but fails to revoke pending community invitations, fails to block access/membership in shared private communities, and does not stop the blocked user from joining the blocker's multiplayer game room via room code. Also `user_blocks` SQL grants `SELECT` to `authenticated` without defining a policy in `20261126000001`.
- **Minimal Reproduction (Local `ISOLATED_TEST=1`):**
  1. User A invites User B to a private community and creates a game room `codeA`. User B joins the community.
  2. User A calls `POST /api/social/blocks` on `username: uB, action: 'block'`.
  3. User B calls `GET /api/communities/<commId>` and `POST /api/games/join` with `{ code: codeA }`.
  4. **Observed:** Both return `200 OK`.
- **Proposed Fix:**
  - In `POST /api/social/blocks`: also cancel pending `communityInvitations` between `me` and `target`.
  - In `POST /api/games/join`: reject joining with `403` if `isBlockedBetween(socialState, me, member)` for any current room member (or the host).
  - In `GET /api/communities/:id` & `POST /api/communities/:id/invite`: enforce block checks or remove blocked memberships when owner blocks a member, and add a proposed RLS policy for `user_blocks` in `lingo/supabase/proposed/`.
- **Risk of Fix:** Low.
- **Effort:** Low–Medium (1 hour).

---

### SEC-06 — Unbounded LLM Cost Abuse & Client-Forged AI Conversation XP
- **Severity:** High  
- **Category:** API4 Unrestricted Resource Consumption / Anti-Cheat  
- **Location:** `lingo/server.mjs:763-828` (`POST /api/ai/conversation`), `lingo/server.mjs:1106-1148` (`POST /api/games/solo`), `lingo/server.mjs:1323-1363` (`POST /api/games`), `lingo/server/questionGenerator.mjs:290` (`maxOutputTokens: 8192`)
- **Real-World Impact:** Any user can spam unlimited parallel Gemini API requests (`50` custom questions with `maxOutputTokens: 8192` per call, or multi-turn `ai/conversation` calls with arbitrary `history` arrays), draining API quota/billing. Additionally, `/api/ai/conversation` trusts `req.body.history.length >= 2` and silently falls back when `scenarioId` is invalid to award `+30 XP` immediately.
- **Minimal Reproduction (Local `ISOLATED_TEST=1`):**
  1. Authenticated User B calls `POST /api/ai/conversation` with `{ "scenarioId": "nonexistent_scenario_id", "userMessage": "hi", "history": [{"role":"user","content":"a"},{"role":"assistant","content":"b"}] }`.
  2. **Observed:** `200 OK`, `earned=30`.
- **Proposed Fix:** Validate `scenarioId` strictly against `CONVERSATION_SCENARIOS` (`400` if unknown), sanitize/bound `history` items (max 10 turns, max 500 chars each, strings only) and track server-side conversation turns per user/scenario before awarding XP, plus add a Supabase-persisted per-user daily AI quota/rate limit (e.g. 20 LLM game generations / 60 AI convo turns per user per day) and lower `maxOutputTokens`.
- **Risk of Fix:** Low — legitimate learners stay well within reasonable daily AI caps.
- **Effort:** Medium (2 hours).

---

### SEC-07 — Wildcard CORS (`*`) & Missing HTTP Security Headers
- **Severity:** High  
- **Category:** Security Misconfiguration (OWASP A05)  
- **Location:** `lingo/server.mjs:59-67`, `lingo/vercel.json:4-45`
- **Real-World Impact:** Every API response sends `Access-Control-Allow-Origin: *` and omits `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (or `frame-ancestors 'none'`), and `Referrer-Policy`. Any malicious third-party website can initiate API calls or embed the web app in an iframe for clickjacking/MIME confusion.
- **Minimal Reproduction (Local `ISOLATED_TEST=1`):**
  1. `GET /api/health` on `ISOLATED_TEST=1` (`security-audit-matrix.mjs`).
  2. **Observed:** `Access-Control-Allow-Origin: *`, `X-Content-Type-Options: null`, `X-Frame-Options: null`, `Content-Security-Policy: null`.
- **Proposed Fix:** Restrict CORS to an explicit origin allowlist (`https://lingo-ruby-three.vercel.app`, Capacitor origins `https://localhost` / `capacitor://localhost`, and localhost dev origins when `NODE_ENV !== 'production'`), and configure `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a tested `Content-Security-Policy` in both `lingo/server.mjs` and `lingo/vercel.json`.
- **Risk of Fix:** Medium — an overly strict CSP could break inline styles/scripts or WebView fetch; must be verified with Playwright + Android WebView.
- **Effort:** Medium (1–2 hours).

---

### SEC-08 — Debug-Signed & Debuggable Android APK Distribution + Permissive Android Manifest
- **Severity:** High  
- **Category:** Mobile / Supply Chain & Platform Security (MASVS)  
- **Location:** `lingo/scripts/build-apk.mjs:142` (`assembleDebug`), `lingo/android/app/build.gradle:26-30`, `lingo/android/app/src/main/AndroidManifest.xml:4-11`, `lingo/android/app/src/main/res/xml/config.xml:3`, `lingo/android/.gitignore:51-52`
- **Real-World Impact:**
  - The APK served on the website (`lingo-v1.0.3.apk`) is compiled with `assembleDebug`, which sets `android:debuggable="true"` (allowing ADB/Chrome DevTools attachment to read `localStorage` session tokens and cached data) and signs with the public/non-release Android debug certificate (users cannot upgrade cleanly to a Play-signed release without uninstalling, and Play Store rejects debug builds).
  - `AndroidManifest.xml` sets `android:allowBackup="true"` (enabling backup extraction of app data/tokens) and `android:usesCleartextTraffic="true"` (allowing unencrypted HTTP downgrade if a non-HTTPS URL is ever loaded).
  - `config.xml` sets `<access origin="*" />`.
  - `lingo/android/.gitignore` has `#*.jks` and `#*.keystore` commented out, creating high risk of accidentally committing a production keystore once created.
- **Minimal Reproduction:** Inspect `lingo/android/app/build.gradle`, `AndroidManifest.xml`, `config.xml`, and `lingo/android/.gitignore`.
- **Proposed Fix (for owner review — not touching `lingo/android/` without permission):**
  1. Uncomment `*.jks` and `*.keystore` in `lingo/android/.gitignore`.
  2. Configure `signingConfigs.release` in `lingo/android/app/build.gradle` reading `LINGO_KEYSTORE_PATH`, `LINGO_KEYSTORE_PASSWORD`, `LINGO_KEY_ALIAS`, `LINGO_KEY_PASSWORD` from environment variables (never in git), and switch production distribution to `assembleRelease`.
  3. Set `android:allowBackup="false"`, `android:usesCleartextTraffic="false"` in `AndroidManifest.xml` (using `network_security_config.xml` only if dev needs `localhost`), and display the APK's SHA-256 checksum on the web UI / `/apk-manifest.json` so users can verify downloads.
- **Risk of Fix:** Low–Medium — changing signing certificate requires existing debug-APK testers to uninstall once before installing release-signed APKs.
- **Effort:** Medium (documented step-by-step for owner in Phase 4/5).

---

### SEC-09 — Brute-Forceable 6-Hex Room Codes Without Join Rate Limiting
- **Severity:** Medium  
- **Category:** API4 / Enumeration & Access Control  
- **Location:** `lingo/server.mjs:1348` (`randomBytes(4).toString('hex').slice(0, 6)`), `lingo/server.mjs:1397-1438` (`POST /api/games/join`)
- **Real-World Impact:** Room codes have only 24 bits of entropy (`16^6`), `POST /api/games/join` has zero rate limiting, and any authenticated stranger can join an active `waiting`/`playing` room by guessing a code and immediately read member usernames, names, and stats.
- **Minimal Reproduction (Local `ISOLATED_TEST=1`):** `security-audit-matrix.mjs` sent 30 parallel `POST /api/games/join` requests with invalid codes (`DEAD00..DEAD29`); zero `429` responses were returned.
- **Proposed Fix:** Enforce per-user and per-IP rate limiting on `POST /api/games/join` (e.g. max 10 failed joins per 5 minutes), expire stale `waiting` rooms (e.g. after 2 hours), and optionally support 8-character codes or friends/invite-only join toggles.
- **Risk of Fix:** Low.
- **Effort:** Low (45 min).

---

### SEC-10 — Tracked `.env` / Vite Metadata, Unpinned `"latest"` Dependencies & `npm audit` CVEs
- **Severity:** Medium  
- **Category:** Supply Chain & Secret Hygiene (OWASP A06 / A02)  
- **Location:** `.env` (tracked in git: `ADMIN_USERNAMES=alic*** (len=11)`), `node_modules/.vite/deps/_metadata.json` (tracked in git), `lingo/package.json:42,48` (`"vite": "latest"`, `"@vitejs/plugin-react": "latest"`), `lingo/package-lock.json`
- **Real-World Impact:** Tracked `.env` creates a precedent for committing local secrets even though `.gitignore` lists `.env`. Unpinned `"latest"` versions break deterministic builds and risk supply-chain drift. `npm --prefix lingo audit` reports 2 known vulnerabilities: `body-parser` `2.0.0–2.3.0` (**High**, DoS `GHSA-27r3-jxmh-p828`) and `qs` `6.7.0–6.16.0` (**Moderate**, DoS `GHSA-6pq8-jhm2-2vcw`).
- **Notes on Real Secret Scan (Redacted):**
  - `lingo/.env` contains `GEMINI_API_KEY=AQ.A*** (len=53)` and `SUPABASE_SERVICE_ROLE_KEY=eyJh*** (len=219)` on disk only — git history scan confirmed `lingo/.env` was **never** committed, and neither key appears in `lingo/dist/` or `lingo/releases/lingo.apk`.
  - Matches found in `lingo/tests/phase4-llm-questions.mjs:259-260` (`AIza***(len=36)`, `sk-p***(len=36)`) and `lingo/tests/comprehensive-regression-suite.mjs:315-317` (`AIza***(len=38)`, `sk-1***(len=29)`) are synthetic unit-test strings for `sanitizeErrorMessage`.
- **Proposed Fix:** `git rm --cached .env node_modules/.vite/deps/_metadata.json`, pin `vite` & `@vitejs/plugin-react` to exact tested versions, and run `npm --prefix lingo audit fix` cleanly against lockfile.
- **Risk of Fix:** Low.
- **Effort:** Low (30 min).

---

### SEC-11 — Auth Hardening Gaps (Username Timing Oracle, 30-Day Tokens, Account Deletion & Production Error Boundary)
- **Severity:** Medium  
- **Category:** API2 Authentication & Compliance  
- **Location:** `lingo/server.mjs:364-377`, `lingo/server.mjs:480`, `lingo/server.mjs:2774`
- **Real-World Impact:**
  1. `POST /api/auth/login` (`L366`) short-circuits `if (!u || ...)` before `scryptSync`, creating a timing difference (~30–80ms) that confirms whether a username exists.
  2. Sessions last 30 days in `localStorage` with no `logout-all` / session revocation or password change/delete-account endpoint (Google Play requires in-app account deletion for apps supporting account creation).
  3. `/api/auth/demo` fails closed when `connected === true` (`Supabase`), but if a deploy misconfigures `SUPABASE_*` env vars, the app silently falls back to `local` demo DB and allows unlimited unauthenticated demo signups.
- **Proposed Fix:** Perform dummy `scryptSync` when user does not exist for constant-time login comparison, add `POST /api/auth/logout-all` & `DELETE /api/me` (account deletion), fail closed at startup in `NODE_ENV=production` if `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are missing, and tighten rate limiting across serverless instances.
- **Risk of Fix:** Low–Medium.
- **Effort:** Medium (2 hours).

---

### SEC-12 — Client-Side Synthesis of XP, Gems & Checkpoints from `localStorage`
- **Severity:** Low  
- **Category:** Client State Integrity  
- **Location:** `lingo/src/main.jsx:233-250` (`mergeCheckpoints`), `lingo/src/main.jsx:294-315` (`handleClaimReward` fallback)
- **Real-World Impact:** Client `applyProgress()` merges locally stored `checkpoints`, `badges`, and `rewards` onto server progress and adds `extraXp`/`extraGems` locally when rewards fall back to `404`. Does not modify the server database, but corrupts local UI state and diverges from server truth if `localStorage` is stale or edited.
- **Proposed Fix:** Treat server `progress` as single source of truth; remove `extraXp`/`extraGems` synthesis and `claimRewardLocal` mutation fallback.
- **Risk of Fix:** Low.
- **Effort:** Low (30 min).

---

## Things Already Done Well
- **Password hashing & session storage:** `scryptSync` with random per-user 16-byte salts and `timingSafeEqual` (`lingo/server.mjs:365-366`), plus 256-bit random session tokens stored as SHA-256 hashes in `lingo_sessions` (`L140, L364, L378`).
- **Supabase RLS & key isolation:** All `lingo_*` and curriculum tables revoke `anon` and `authenticated` (`lingo/supabase/schema.sql`, `20261015000001`), and `SUPABASE_SERVICE_ROLE_KEY` / `GEMINI_API_KEY` are strictly server-side (verified absent from `lingo/dist/` and `lingo/releases/lingo.apk`).
- **XSS safety in UI:** No `dangerouslySetInnerHTML`, `innerHTML`, `eval()`, `new Function()`, or `javascript:` URLs exist anywhere in `lingo/src/` or `lingo/server/`.
- **Admin authorization:** `requireAdmin` (`lingo/server/adminAuth.mjs`) derives admin identity strictly from verified session `req.user.username` against `ADMIN_USERNAMES`.
- **Standard lesson, reward & multiplayer room grading:** Standard lessons (`L529`), multiplayer answers (`L1533`), and server-side `claimReward` (`rewardEngine.mjs:124`) compute correctness, XP, and gems on the server and guard against non-member game access (`L1443`) and non-host starts (`L1453`).
- **LLM input & error sanitization:** `validateQuestionConfig` & `sanitizeTopicInput` (`questionGenerator.mjs:49-98`) bound CEFR level, question count, duration, topic characters, and scrub provider keys (`sanitizeErrorMessage`).
- **APK config safety:** `apkConfigGuard.mjs` verifies production APKs contain no `localhost`/`server.url` and no nested APKs.
