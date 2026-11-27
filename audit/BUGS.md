# Lingo Bug Audit Report (Phase 2)

**Branch:** `security-hardening` (from `main`)  
**Static Tools Run:** `tsc --noEmit --allowJs --checkJs` (on `lingo/src` & `lingo/server`), static AST/pattern scans (`lingo/tests/bug-hunt-repros.mjs`, `phase2-static-scan.mjs`, `phase2-react-check.mjs`), and manual code review.  
*(Note: ESLint is not installed in `lingo/package.json`; `tsc --noEmit --allowJs --checkJs` produced 1,000+ diagnostics largely from implicit `any` in untyped JS and React 19 / `lucide-react` / `@supabase/auth-js` type definitions, alongside real missing null guards detailed in `BUG-10`.)*

---

## Summary Counts by Severity

| Severity | Count |
|---|---:|
| **Critical** | 1 |
| **High** | 5 |
| **Medium** | 4 |
| **Low** | 1 |
| **Total** | **11** |

---

## Ranked Findings Index

1. **BUG-01** `[Critical]` — No React `ErrorBoundary` (any render error causes a full white screen) (`lingo/src/main.jsx:3124`)
2. **BUG-02** `[High]` — React Rules of Hooks violation in `LessonPreviewModal` (`lingo/src/components/Learn/LessonPreviewModal.jsx:7-15`)
3. **BUG-03** `[High]` — Serverless-unsafe `setTimeout` game countdown transitions (`lingo/server.mjs:1179-1190, 1468-1479`)
4. **BUG-04** `[High]` — UTC vs user local timezone (`IST`) day-boundary & streak bug (`lingo/server.mjs:140, 541...`, `main.jsx:917, 1606`, `deviceNotifications.js:489`)
5. **BUG-05** `[High]` — Missing Capacitor Android hardware back-button handler (`lingo/src/`)
6. **BUG-06** `[High]` — Sign-out fails to clear `lingo-custom-name` and `dataCache`, leaking User A's name onto User B (`lingo/src/main.jsx:344-347, 1957-1968`)
7. **BUG-07** `[Medium]` — Uncaught `TypeError` crash when `PronunciationCoach` or `AIConversationTutor` receives empty catalog (`PronunciationCoach.jsx:87`, `AIConversationTutor.jsx:37`)
8. **BUG-08** `[Medium]` — Unguarded `localStorage` calls & missing `AbortController` network timeouts (`lingo/src/main.jsx:98-1962`, `lingo/src/apiConfig.js:71`)
9. **BUG-09** `[Medium]` — Leaked `SpeechRecognition` instance on unmount & `NaN%` chart height when `goal === 0` (`AIConversationTutor.jsx:15, 73`, `main.jsx:1611`)
10. **BUG-10** `[Medium]` — Fire-and-forget checkpoint sync, stale `adopt()` closure in `refreshSocial()`, and real `tsc` nullable bugs (`main.jsx:368, 937-941`, `server.mjs:339, 633, 685, 728`, `deviceNotifications.js:429, 510`)
11. **BUG-11** `[Low]` — Intermittent prompt-lookup collision in `e2e.mjs` multiplayer round (`lingo/tests/e2e.mjs:101-107`)

---

## Detailed Findings

### BUG-01 — No React ErrorBoundary (Full White-Screen Crash)
- **Severity:** Critical  
- **Category:** Crash Safety / React Rendering  
- **Location:** `lingo/src/main.jsx:3124` (zero `ErrorBoundary`, `componentDidCatch`, or `getDerivedStateFromError` in `lingo/src/`)
- **Real-World Impact:** Any runtime rendering exception on a tab, modal, or malformed API payload unmounts the entire React application and leaves the user staring at an empty white `#faf8f0` screen with no recovery button.
- **Minimal Reproduction:** Verified by codebase scan (`phase2-static-scan.mjs`) and DOM inspection (`bug-hunt-repros.mjs`). Any thrown render error inside `<App />` clears `#root`.
- **Proposed Fix:** Add a class-based `<ErrorBoundary>` component wrapping `<App />` (and individual heavy tabs/modals) with a friendly recovery screen ("Something went wrong — Reload / Return Home").
- **Risk of Fix:** Low.
- **Effort:** Low (30 min).

---

### BUG-02 — React Rules of Hooks Violation in `LessonPreviewModal`
- **Severity:** High  
- **Category:** React Hook Ordering Bug  
- **Location:** `lingo/src/components/Learn/LessonPreviewModal.jsx:7-15`
- **Real-World Impact:** `if (!lesson) return null;` is placed at line 7 *before* `useState` (line 11) and `useEffect` (line 15). If a parent keeps `<LessonPreviewModal lesson={...} />` mounted across `null` <-> object prop changes, React throws `"Rendered more hooks than during the previous render"` and crashes the app.
- **Minimal Reproduction:** Identified by `phase2-react-check.mjs` (`HOOK_AFTER_RETURN src\components\Learn\LessonPreviewModal.jsx:11`) and verified directly in source lines 6–29. Currently masked only because `Learn.jsx` conditionally mounts `{previewLesson && <LessonPreviewModal ... />}`.
- **Proposed Fix:** Move `useState` and `useEffect` unconditionally above `if (!lesson) return null;`.
- **Risk of Fix:** Low.
- **Effort:** Low (10 min).

---

### BUG-03 — Serverless-Unsafe `setTimeout` Countdown Transitions
- **Severity:** High  
- **Category:** Serverless / Multiplayer State Lifecycle  
- **Location:** `lingo/server.mjs:1179-1190` (`/api/games/solo`), `lingo/server.mjs:1468-1479` (`/api/games/:code/start`)
- **Real-World Impact:** After starting a 10-second countdown, `server.mjs` relies on an in-memory `setTimeout` to transition `status` from `'countdown'` to `'playing'`. On Vercel serverless, the function runtime can freeze/terminate immediately once the HTTP response returns, leaving the database record in `'countdown'` unless a client polls `GET /api/games/:code` (or until `tick()` runs on a subsequent request).
- **Minimal Reproduction:** Inspect `lingo/server.mjs:1179-1190` and `1468-1479` vs Vercel stateless execution model.
- **Proposed Fix:** Make `tick()`/`tickSolo()` authoritative on every read/write (`status === 'countdown' && now() >= countdownDeadline`)—which it already supports—and avoid relying on background `setTimeout` in `process.env.VERCEL` deployments.
- **Risk of Fix:** Low.
- **Effort:** Low (20 min).

---

### BUG-04 — UTC vs User Local Timezone (`IST`) Streak & Day-Boundary Bug
- **Severity:** High  
- **Category:** Timezone & Streak Logic  
- **Location:** `lingo/server.mjs:140, 541, 599, 652, 701, 742, 815`, `lingo/src/main.jsx:917-918, 1606`, `lingo/src/services/deviceNotifications.js:489`
- **Real-World Impact:** Both server and client derive calendar days via `.toISOString().slice(0, 10)` (UTC). For users in India (`IST`, UTC+05:30), completing lessons between `00:00` and `05:29 AM IST` records study under yesterday's UTC date, fails to reset `todayWords`, misaligns the 7-day learning chart, misfires "daily reminder already sent", and can reset streaks prematurely.
- **Minimal Reproduction (`bug-hunt-repros.mjs`):**
  - Timestamp `2026-11-26T18:45:00Z` (`2026-11-27 00:15 IST`): `toISOString().slice(0, 10)` evaluates to `2026-11-26` while `Asia/Kolkata` local date is `2026-11-27`.
- **Proposed Fix:** Accept the user's IANA timezone (e.g. `Intl.DateTimeFormat().resolvedOptions().timeZone` or `X-User-Timezone` / stored `account.timezone`) on progress/reminder calculations with UTC fallback, and use local calendar formatting (`en-CA` via `Intl.DateTimeFormat`) on the client.
- **Risk of Fix:** Medium — requires careful date comparison compatibility with existing `history` / `lastStudy` keys.
- **Effort:** Medium (1–2 hours).

---

### BUG-05 — Missing Capacitor Android Hardware Back-Button Handling
- **Severity:** High  
- **Category:** Mobile / Capacitor Navigation  
- **Location:** `lingo/src/` (no `@capacitor/app` plugin or `backButton` listener present)
- **Real-World Impact:** On Android phones, pressing the hardware/system Back gesture while a modal (`LessonPreviewModal`, `NotificationsModal`, `FriendProfileModal`, `BadgeUnlockModal`), active lesson (`activeLessonPage`), or non-Home tab is open immediately exits/minimizes the Android app instead of closing the overlay or navigating back.
- **Minimal Reproduction:** Static scan of `lingo/src/` confirms zero `backButton` or `@capacitor/app` integrations.
- **Proposed Fix:** Propose installing `@capacitor/app` + `cap sync android` (with user approval since `lingo/android/` sync is restricted in Phases 0–2) and adding a `App.addListener('backButton', ...)` handler that dismisses modals/confirm-leave-lesson/subtabs before navigating to `home` or minimizing (`exitApp()`).
- **Risk of Fix:** Low.
- **Effort:** Low–Medium (1 hour).

---

### BUG-06 — Sign-Out Leaks Previous User's Custom Display Name & SWR Caches
- **Severity:** High  
- **Category:** State Cleanup / Multi-User Session Switching  
- **Location:** `lingo/src/main.jsx:344-347, 477-480, 1733, 1957-1968` (`dataCache.js:94` `clearUserScopedCaches` unused)
- **Real-World Impact:** Signing out removes `lingo-token`, `lingo-game`, and `lingo-solo`, but leaves `lingo-custom-name` and user-scoped `localStorage`/SWR entries intact and fails to reset `socialOverview`, `socialPresence`, `badgeQueue`, and `rewardQueue`. Any new user signing in on the same device inherits the previous user's custom display name.
- **Minimal Reproduction (Playwright — `lingo/tests/bug-hunt-repros.mjs`):**
  1. Sign in as User One, edit display name to `LeakedNameFromU1`, click Sign out.
  2. Sign in as User Two (`User Two`).
  3. **Observed:** User Two's sidebar renders `🌱LeakedNameFromU1@bug_u2_...`.
- **Proposed Fix:** Scope `lingo-custom-name` by username (or remove it and use server `user.name` synced via `/api/social/profile`), call `clearUserScopedCaches()` on logout and `adopt()`, and reset all user-derived React states (`socialOverview`, `socialPresence`, `badgeQueue`, `rewardQueue`, `isEditingName`).
- **Risk of Fix:** Low.
- **Effort:** Low (30 min).

---

### BUG-07 — Uncaught `TypeError` Crash on Empty Practice Catalog Props
- **Severity:** Medium  
- **Category:** Null/Undefined Guarding  
- **Location:** `lingo/src/components/Practice/PronunciationCoach.jsx:87, 91, 97`, `lingo/src/components/Practice/AIConversationTutor.jsx:37, 45`
- **Real-World Impact:** If `/api/practice/catalog` fails offline or returns empty `items`/`scenarios`, `currentItem` / `currentScenario` is `undefined`, throwing `TypeError: Cannot read properties of undefined (reading 'level' / 'starterPrompt' / 'id')` and crashing the Practice tab.
- **Minimal Reproduction:** Read `PronunciationCoach.jsx:13, 87, 91, 97` and `AIConversationTutor.jsx:17, 37, 45`.
- **Proposed Fix:** Add early fallback UI (`if (!currentItem)` / `if (!currentScenario)`) and optional chaining inside effects.
- **Risk of Fix:** Low.
- **Effort:** Low (15 min).

---

### BUG-08 — Unguarded `localStorage` Calls & Missing `AbortController` Network Timeouts
- **Severity:** Medium  
- **Category:** Storage & Flaky Network Resilience  
- **Location:** `lingo/src/main.jsx:98, 99, 324, 343, 380...`, `lingo/src/apiConfig.js:71-75`
- **Real-World Impact:** Over 30 `localStorage.getItem/setItem/removeItem` calls in `main.jsx` lack `try/catch` (throwing if storage quota is full or restricted in WebView/private tabs). Additionally, `requestApi()`'s `fetch()` (`apiConfig.js:71`) has no `AbortController` timeout, causing `initialize()` or actions to spin indefinitely on slow/stalled mobile connections.
- **Minimal Reproduction:** Static check (`phase2-static-scan.mjs` & `phase2-react-check.mjs`).
- **Proposed Fix:** Route all storage access through small safe `safeStorageGet/Set/Remove` helpers and add a 15-second `AbortController` timeout to `requestApi` (plus retry/offline UI banner).
- **Risk of Fix:** Low.
- **Effort:** Low–Medium (45 min).

---

### BUG-09 — `SpeechRecognition` Leaks Active Mic Session on Unmount & `NaN%` Chart Width
- **Severity:** Medium  
- **Category:** Effect Cleanup / UI Calculation  
- **Location:** `lingo/src/components/Practice/AIConversationTutor.jsx:15, 73`, `lingo/src/main.jsx:1611`
- **Real-World Impact:** Navigating away from `AIConversationTutor` while voice input is listening never stops/aborts `recognitionRef.current`. Separately, in `main.jsx:1611`, `v / progress.goal * 100` produces `NaN%` if `progress.goal` is `0` or falsy.
- **Minimal Reproduction:** Inspected `AIConversationTutor.jsx:15-80` (no unmount cleanup `useEffect`) and `main.jsx:1611`.
- **Proposed Fix:** Add `useEffect(() => () => { try { recognitionRef.current?.abort(); } catch {} }, [])` in `AIConversationTutor.jsx` and guard denominator `Math.max(1, progress.goal || 10)` in `main.jsx:1611`.
- **Risk of Fix:** Low.
- **Effort:** Low (15 min).

---

### BUG-10 — Fire-and-Forget Checkpoint Sync, Stale `adopt()` Closure & `tsc` Type Findings
- **Severity:** Medium  
- **Category:** Async Sync / Static Type Audit (`tsc --checkJs`)  
- **Location:** `lingo/src/main.jsx:360, 368, 937-941`, `lingo/server.mjs:339, 633, 685, 728`, `lingo/src/services/deviceNotifications.js:429, 510`
- **Real-World Impact:**
  1. `completeCheckpoint` (`main.jsx:937-941`) ignores server errors via `.catch(() => {})` — on offline/failed sync the user sees success locally while progress is lost server-side.
  2. `adopt()` (`main.jsx:360`) triggers `refreshSocial()`, which checks `user?.username` (`L368`) before React commits `setUser(d.user)`, skipping notification delivery or reading the prior user's username.
  3. `tsc --checkJs` flagged missing null checks on `mod` (`server.mjs:645` if `LISTENING_MODULES` lacks a key present in solution keys), `spk` / `item` ordering (`L685, 728`), and `buildPersonalizedDailyReminders({ user, progress })` parameter JSDoc mismatch (`deviceNotifications.js:429, 510`).
- **Proposed Fix:** Await/surface checkpoint submission result (especially once `SEC-01` server-grades checkpoints), pass explicit `username` into `refreshSocial(username)`, and add explicit runtime guards where `tsc --checkJs` identified nullable lookups.
- **Risk of Fix:** Low.
- **Effort:** Medium (1 hour).

---

### BUG-11 — Intermittent Question Prompt Collision in `e2e.mjs` Multiplayer Round
- **Severity:** Low  
- **Category:** Test Flakiness  
- **Location:** `lingo/tests/e2e.mjs:101-107`
- **Real-World Impact:** Observed once during Phase 0/previous runs (`locator.click('.answer-options button').filter({ hasText: 'She is happy.' })` timed out) when concatenating `questionPool('Mixed English', 'B1')` and `Beginner` caused a prompt lookup mismatch or option randomization edge case. Passed on immediate re-run (`task-6547`).
- **Proposed Fix:** Match against the active difficulty pool directly and resolve correct option cleanly by question ID/prompt within that pool.
- **Risk of Fix:** Low (test-only).
- **Effort:** Low (15 min).

---

## Things Already Done Well
- **Interval & Listener Cleanup in Timers:** `CountdownLobby.jsx`, `GameClockTimer.jsx`, `SoloGameRoom.jsx`, `MicrophoneRecorder.jsx` (stops `MediaStream` tracks & `SpeechRecognition` on unmount), and `main.jsx` social/game pollers (`L710, L780`) consistently clean up intervals and listeners in `useEffect` return functions.
- **Request Sequencing in Search:** `FriendsPage.jsx:49, 73, 84` uses `searchSeqRef` to prevent out-of-order async search responses from overwriting newer queries.
- **Option Shuffling Stability:** `optionShuffler.mjs` uses `crypto.getRandomValues` rejection sampling and keys shuffles in `sessionStorage` so options do not reshuffle mid-question on re-render.
