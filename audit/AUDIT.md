# Lingo Front-End & Responsive Architecture Audit

> Strictly read-only audit of the workspace (`c:\Users\saura\Downloads\lingo-source`) conducted against the current codebase and live Playwright measurements on an isolated test server. No source files were modified.

---

## Summary

- Desktop (`1024px–1920px`) renders as a centered `500px` phone column because `.workspace` is unconditionally locked to `max-width: 500px !important` (`lingo/src/style.css:820`), `.sidebar` is globally hidden via `display: none !important` (`lingo/src/style.css:624`) with no sidebar JSX rendered, and `.mobile-nav` is pinned fixed bottom via `display: flex !important` (`lingo/src/style.css:2008`).
- Home `.topbar` overflows horizontally on every tested width: at `360px`–`1024px`, `overflow: hidden` clips `.header-profile`, `.topbar-bell-btn`, and `.download-apk-pill` off the right edge; at `1440px`–`1920px`, `.topbar-actions` (`533px` wide) spills `145px` outside the `500px` topbar border.
- Practice Lab (`1440px` & `1920px`) breaks visually because `.practice-grid` uses a `max-width: 1080px` breakpoint—so on desktop it renders a `320px` + `1fr` 2-column grid crammed inside the `428px`-inner `.workspace`, squashing passage cards to `~84px` wide (`audit/screenshots/practice-1440.png`).
- Styling is 7 plain global CSS files (`17,759` total lines across `lingo/src/`), with `13` `position: fixed`, `51` `position: absolute`, `12` `100vh`/`100dvh`, `11` `vw` rules, and mobile-centric `max-width` overrides sprinkled with `!important`.
- A `66.12 MB` Android APK (`lingo/public/lingo.apk`) is copied verbatim into `lingo/dist/lingo.apk` by Vite (`npm run build`), with no `.vercelignore` excluding it from Vercel static uploads.
- All 6 Playwright UI suites currently fail on clean startup due to removed `.sidebar` (`Play & learn`) text, the newer demo-first `Get started` gate (`handleStartDemo`), and absent self-hosted test server orchestration (tests hardcode `http://localhost:3000`).
- Separating web vs. Capacitor Android safely can rely largely on `html[data-platform="web"]` CSS scoping for responsive cards/grids, paired with a dedicated Web Desktop Navigation Shell (`sidebar` / responsive top bar) and build/deploy exclusion for `lingo.apk`.

---

## 1. Project Map

### Folder Structure
- **Monorepo-like root (`c:\Users\saura\Downloads\lingo-source`)**:
  - `package.json`: Root npm workspace proxy delegating `dev`, `build`, `build:mobile`, `build:apk`, `app:dev`, `cap:sync`, and `test:*` to `lingo/`. Root `build` copies `lingo/dist` -> root `dist/` for Vercel.
  - `api/index.js` & `vercel.json`: Root Vercel serverless adapter (`import app from '../lingo/server.mjs'`) + rewrite rules (`/api/(.*)` -> `/api/index.js`, `/(.*)` -> `/index.html`).
  - `tests/`: Legacy root-level API routing test (`test-serverless-routing.mjs`) + screenshots.
- **App Workspace (`lingo/`)**:
  - `index.html`: Single Vite HTML entry. Viewport meta tag (`lingo/index.html:1`):
    ```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    ```
    > **Accessibility/Web note:** `maximum-scale=1.0, user-scalable=no` blocks pinch-zoom on mobile web browsers.
  - `src/main.jsx` (`2,909` lines): Monolithic root React 19 entry (`createRoot`), holding `App()`, `Auth()`, and `Lesson()`, all tab state, API client calls, modal state, notifications polling, and curriculum/lesson runners.
  - `src/apiConfig.js`: Platform detection (`isNativePlatform`), API base resolution, `CapacitorHttp` vs `fetch`.
  - `src/services/deviceNotifications.js`: Native `@capacitor/local-notifications` + Web `Notification` API bridge.
  - `src/Art.jsx`, `src/curriculumData.js`, `content.js`: Inline SVG art/mascot, client curriculum hierarchy (`138` lessons + `33` checkpoints), and lesson pools.
  - `src/components/`: Feature folders:
    - `Learn/`: `Learn.jsx`, `WindingPathMap.jsx`, `CEFRLevelCard.jsx`, `CourseHeader.jsx`, `CourseLevelSelector.jsx`, `CoursePath.jsx`, `CourseProgressOverview.jsx`, `ContinueLearningBanner.jsx`, `LearnHeader.jsx`, `LearningHeader.jsx`, `LessonNode.jsx`, `LessonPreviewModal.jsx`, `SectionCard.jsx`, `SectionJourneyCard.jsx`, `UnitGroup.jsx`, `UnitNodeRow.jsx`, `learn.css`
    - `Practice/`: `PracticeHub.jsx`, `ListeningLab.jsx`, `SpeakingStudio.jsx`, `PronunciationCoach.jsx`, `AIConversationTutor.jsx`, `AudioPlayer.jsx`, `MicrophoneRecorder.jsx`, `practice.css`
    - `Games/`: `GamesSetup.jsx`, `WaitingLobby.jsx`, `CountdownLobby.jsx`, `GameRoom.jsx`, `SoloGameRoom.jsx`, `SpectatorDashboard.jsx`, `FinishedGame.jsx`, `PlayerList.jsx`, `gameConfig.js`, `games.css`
    - `Social/`: `FriendsPage.jsx`, `SocialModals.jsx`, `GameInvitePanel.jsx`, `RemindersSettingsPage.jsx`, `social.css`
    - `Achievements/`: `AchievementsSection.jsx`, `BadgeArtwork.jsx`, `BadgeUnlockModal.jsx`, `achievements.css`
    - `Rewards/`: `RewardChestNode.jsx`, `RewardHistorySection.jsx`, `RewardOpeningModal.jsx`, `rewards.css`
  - `server/` + `server.mjs`: Express 5 backend + isomorphic game/social/badge/reward/curriculum/shuffler/reminder engines.
  - `android/`: Capacitor 7 Android Gradle project (`com.lingoplay.app`).
  - `public/`: Static audio `.wav` assets, DM Sans `.ttf` fonts, `favicon.svg`, `mascot.png`, and **`lingo.apk` (`66.12 MB`)**.
  - `supabase/`: `schema.sql` + 4 SQL migrations.
  - `tests/`: 43 `.mjs` verification & Playwright scripts.

### Router & Shell Connection
- **No URL Router (`react-router` is not used)**: `App()` (`lingo/src/main.jsx:54`) switches views solely via React state `page` from `const pages = ['home', 'learn', 'friends', 'practice', 'games', 'profile', 'reminders']` (`lingo/src/main.jsx:57`). URL deep links are limited to reading `?invite=LNG-...` once inside `initialize()` (`lingo/src/main.jsx:470`).
- **App Shell Hierarchy (`lingo/src/main.jsx:1174-2061`)**:
  - `.app-shell` > `.workspace`
  - Header: Conditional `<header className="topbar">` rendered **only** when `page === 'home'` (`lingo/src/main.jsx:1178`).
  - Main container: `<main className="app-main ...">` with `.page-heading` (`page !== 'home' && page !== 'learn' && page !== 'reminders'`) and `.page-content` switching active components.
  - Bottom Navigation: `<nav className="mobile-nav">` rendered outside `.workspace` (`lingo/src/main.jsx:1961-2003`), fixed to the bottom of the viewport across **all screens and widths** except when `!user` or `activeLessonPage` is open.
  - **No JSX `<aside className="sidebar">` exists** in `lingo/src/main.jsx` — only legacy `.sidebar` CSS rules remain in `lingo/src/style.css:623-791`.

---

## 2. Why Desktop Looks Like a Phone

Desktop renders as a narrow centered `500px` phone column for three compounding CSS/markup reasons:

1. **Unconditional `.workspace` width cap (`lingo/src/style.css:817-828`)**:
   ```css
   .workspace {
     margin-left: 0 !important;
     width: 100% !important;
     max-width: 500px !important;
     min-height: 100vh;
     margin: 0 auto !important;
     ...
   }
   ```
   Using `!important` directly on `.workspace` forces a `500px` column even at `1440px` (`workspaceLeft: 470px`) and `1920px` (`workspaceLeft: 710px`).
2. **Global hiding of legacy desktop chrome + missing sidebar markup**:
   - `lingo/src/style.css:623-625`: `.sidebar { display: none !important; }`
   - `lingo/src/style.css:848-850`: `.mobile-brand-mark { display: flex !important; }`
   - `lingo/src/style.css:880-884`: `.breadcrumb, .topbar-crumb, .search-wrap { display: none !important; }`
   - `lingo/src/style.css:1995-2019`: `.mobile-nav { display: flex !important; position: fixed; max-width: 452px; ... }`
   - Moreover, `main.jsx` does not render any `<aside className="sidebar">` or desktop header navigation.
3. **Secondary inner container caps (`500px–540px`) & mismatched desktop grid breakpoints**:
   - Even if `.workspace` is widened, screens cap themselves internally: `.learn-redesign-journey` (`max-width: 540px`, `learn.css:3244`), `.winding-path-wrapper` (`max-width: 480px`, `learn.css:2820`), `.learn-gamified-view` (`max-width: 520px`, `learn.css:2486`), `.social-page-wrap` (`max-width: 540px`, `social.css:7`), `.reminders-page-view` (`max-width: 540px`, `style.css:2229`), and `.solo-flow-page` (`max-width: 520px`, `games.css:2758`).
   - Conversely, `.practice-grid` (`practice.css:186-205`) uses `grid-template-columns: minmax(0, 320px) minmax(0, 1fr)` above `1080px`—so inside the `500px` workspace (`428px` content area after `main` padding), it forces 2 columns and crushes `.practice-main-card` horizontally (`audit/screenshots/practice-1440.png`).

---

## 3. Styling System

- **Approach**: Plain global CSS imported once at app root (`lingo/src/main.jsx:17-22`). **Zero** CSS Modules, Tailwind, or CSS-in-JS. One minor exception: scoped inline styles exist for dynamic SVG stroke offsets / widths / grid column template in `WaitingLobby.jsx:157`.
- **Global Stylesheets (`17,759` lines total)**:
  1. `lingo/src/style.css` (`4,901` lines)
  2. `lingo/src/components/Learn/learn.css` (`4,580` lines)
  3. `lingo/src/components/Games/games.css` (`4,379` lines)
  4. `lingo/src/components/Practice/practice.css` (`1,215` lines)
  5. `lingo/src/components/Social/social.css` (`1,053` lines)
  6. `lingo/src/components/Achievements/achievements.css` (`848` lines)
  7. `lingo/src/components/Rewards/rewards.css` (`783` lines)
- **Design Tokens (`lingo/src/style.css:109-153`)**:
  - Surfaces/text: `--ink: #202f36`, `--ink-dark: #141c20`, `--muted: #77858d`, `--cream: #faf8f0`, `--white: #ffffff`, `--border: #e8e8dc`, `--card-border: 2px solid #e5e5d8`, `--card-shadow: 0 4px 0 #e5e5d8`
  - Accents: `--duo-green: #58cc02`, `--duo-green-dark: #46a302`, `--duo-green-light: #ddf4b8`, `--blue: #1cb0f6`, `--purple: #ce82ff`, `--yellow: #ffc800`, `--coral: #ff4b4b`, `--peach: #ff9600`, `--mint: #2dd4bf`
  - Safe-area tokens: `--safe-top: max(38px, env(safe-area-inset-top, 38px))`, `--safe-bottom: max(16px, env(safe-area-inset-bottom, 16px))`
- **Fonts (`lingo/src/style.css:1-15, 110`)**: Self-hosted `DM` font (`/dm-sans.ttf` weights `400 600`, `/dm-sans-bold.ttf` weights `650 900`), fallback system UI stack.

### Complete `@media` Query Inventory (All 31 Rules)

| File & Line | Query | Primary Effect |
| :--- | :--- | :--- |
| `achievements.css:840` | `@media (prefers-reduced-motion: reduce)` | Disables badge celebration animations |
| `games.css:102` | `@media (min-width: 768px)` | `.game-banner` row flex + `200px` art |
| `games.css:1540` | `@media (max-width: 1080px)` | Legacy game room 2-col -> 1-col stack |
| `games.css:1566` | `@media (max-width: 600px)` | Answer options grid, timer font scaling |
| `games.css:1632` | `@media (max-width: 400px)` | Compact lobby spacing |
| `games.css:1644` | `@media (prefers-reduced-motion: reduce)` | Stops pulse animations |
| `games.css:2453` | `@media (max-width: 640px)` | Setup step cards & buttons |
| `games.css:2559` | `@media (max-width: 640px)` | Spectator dashboard adjustments |
| `games.css:3534` | `@media (prefers-reduced-motion: reduce)` | Disables solo floating animation |
| `learn.css:369` | `@media (max-width: 1080px)` | `.learn-banner` 2-col -> 1-col |
| `learn.css:377` | `@media (prefers-reduced-motion: reduce)` | Removes progress bar transitions |
| `learn.css:1611` | `@media (max-width: 1030px)` | `.level-tabs-scroll` 4-col scroll, un-staggers path nodes |
| `learn.css:1635` | `@media (max-width: 768px)` | Heavy `!important` overrides on `.learn-banner`, level tabs & path |
| `learn.css:1981` | `@media (max-width: 480px)` | Smaller lesson preview modal & path spacing |
| `learn.css:2513` | `@media (max-width: 768px)` | Gamified learn header sizing |
| `learn.css:2827` | `@media (min-width: 769px)` | Re-enables horizontal path curve (`max-width: 480px`) |
| `learn.css:4264` | `@media (max-width: 480px)` | Unit node card typography compacting |
| `practice.css:202` | `@media (max-width: 1080px)` | `.practice-grid` `320px 1fr` -> `1fr` |
| `practice.css:478` | `@media (max-width: 600px)` | Practice tabs `repeat(4,1fr)` -> `repeat(2,1fr)` + card stacking |
| `practice.css:940` | `@media (max-width: 768px)` | Practice banner stacking & padding |
| `rewards.css:773` | `@media (prefers-reduced-motion: reduce)` | Stops reward chest wobble |
| `style.css:2820` | `@media (min-width: 720px)` | `.daily-reminders-grid` 2-col (unused CSS left over) |
| `style.css:3061` | `@media (max-width: 1024px)` | `.topbar` `overflow: hidden` + `padding-top: max(42px, var(--safe-top))` |
| `style.css:3087` | `@media (max-width: 768px)` | Resets `.home-main` / `.interior-main` / `.learn-main` paddings; shows/hides `.page-heading` (`display: none !important`) |
| `style.css:3191` | `@media (max-width: 520px)` | `.stats-row-4` 4-col -> 2-col |
| `style.css:3210` | `@media (max-width: 480px)` | Hides `.streak-pill span` (`day streak`) & `.header-profile svg` (chevron) |
| `style.css:3300` | `@media (max-width: 380px)` | `.explore-grid-3` 3-col -> 1-col |
| `style.css:3648` | `@media (prefers-reduced-motion: reduce)` | Disables all CSS transitions/animations |
| `style.css:4028` | `@media (max-width: 768px)` | Modal bottom sheet/card adjustments |
| `style.css:4527` | `@media (max-width: 680px)` | `.install-apk-banner` column + hides `"Get App"` text on APK pill |
| `style.css:4545` | `@media (max-width: 768px)` | Adds bottom padding for `.mobile-nav` + `padding-top: max(54px, ...)` on Practice/Games |

### Viewport Units & Positioning Metrics
- **`vh` / `dvh` occurrences (`13` total, `12` are `100vh` / `100dvh`)**: `.loading-screen`, `.app-shell`, `.unauth-screen`, `.workspace`, `.lesson-page-screen`, `.modal`, `.solo-results-stage`, `.reward-opening-modal`, `.social-modal-card`.
- **`vw` occurrences (`11` total)**: Mainly responsive typography `clamp(..., Xvw, ...)` in banners/prompts + `.loading-screen { width: 100vw }`, `.lesson-modal { max-width: 95vw }` (`learn.css:2024`), and `.modal { max-width: calc(100vw - 32px) !important }` (`style.css:4576`).
- **`position: fixed` (`13` rules)** and **`position: absolute` (`51` rules)**.
- **Fixed `px` Width/Height Counts**: `145` fixed `width: Npx` rules and `167` fixed `height: Npx` rules across all CSS files.
- **Worst Offenders**:
  1. `style.css:820, 3099`: `.workspace { max-width: 500px !important; width: 100% !important; }`
  2. `style.css:2001`: `.mobile-nav { max-width: 452px; }`
  3. `practice.css:188, 723`: `.practice-grid { grid-template-columns: minmax(0, 320px) minmax(0, 1fr); }` (breaks at `1081px+` inside `500px` workspace); `.ai-chat-container { height: 480px; }`
  4. `learn.css:1276, 2023`: `.lesson-node-card { width: 285px; }`; `.lesson-modal { width: 660px; }`
  5. `style.css:911, 3352`: `.search-results { width: 340px; }`; `.modal { width: 480px; max-height: min(88vh, calc(100dvh - 36px)); }`
  6. `rewards.css:294-295`: `.reward-modal-sunbeams { width: 340px; height: 340px; }`

---

## 4. Layout Shell Details

### Floating Pill Bottom Nav (`.mobile-nav`, `lingo/src/style.css:1995-2095`)
- **Structure**: `position: fixed; left: 50%; transform: translateX(-50%); bottom: max(16px, env(safe-area-inset-bottom, 16px)); width: calc(100% - 20px); max-width: 452px; height: 66px; z-index: 1000; display: flex !important; border-radius: 9999px`.
- **Items (6 tabs)**: `Home | Learn | Friends (with red unread badge) | Practice | Play | Profile`, rendered cleanly across `360px`–`1920px` with `flex: 1; min-width: 0; font-size: 9.5px`.
- **Bottom Padding Reservation**:
  - `style.css:4561` reserves `padding-bottom: calc(78px + env(safe-area-inset-bottom, 16px)) !important;` on `.workspace, .dashboard-page, .learn-page, .practice-page, .games-page` **only under `@media (max-width: 768px)`**.
  - On desktop (`>768px`), `.mobile-nav` STILL floats at bottom (`z-index: 1000`), while `main` only has `padding: 32px 36px 40px` (`style.css:970`), leaving `40px` vs `82px` nav height -> footer / bottom buttons can sit under the floating dock until scrolled past.
  - `.social-page-wrap` (`social.css:9`) and `.reminders-page-view` (`style.css:2231`) reserve `padding-bottom: max(108px–112px, ...)` unconditionally so they clear the pill dock safely.

### Header (`.topbar`, `lingo/src/style.css:830-965, 3061-3126`) & Clipping Root Cause
- `.topbar` only renders when `page === 'home'` (`lingo/src/main.jsx:1178`). It is `position: sticky; top: 0; z-index: 25; width: 100%;`.
- Inside `.topbar`, `.mobile-brand-mark` (`~86px` wide) sits on the left and `.topbar-actions` (`flex-direction: row; flex-wrap: nowrap`) sits on the right with **6 horizontal children**:
  1. `.streak-pill` (`"0"` on `<480px`, `"0 day streak"` on `>=480px`)
  2. `.gem-pill` (XP count)
  3. `.gem-currency-pill` (Gems count)
  4. `.download-apk-pill` (`"APK"` on `<=680px`, `"Get App APK"` on `>680px`) — rendered whenever `!isNativePlatform()`!
  5. `.topbar-bell-btn` (`36px` wide)
  6. `.header-profile` (`34px` avatar on `<=480px`, `57px` avatar + chevron above)
- **Exact Reason Avatar Is Clipped on Phone & Spills on Desktop**:
  - At `360px` (`audit/screenshots/home-360.png`): `.mobile-brand-mark` ends at `x=102px`, `.topbar-actions` requires `328px` (`x=112..440`, `scrollWidth: 463px`). Because `@media (max-width: 1024px)` applies `.topbar { overflow: hidden }` (`style.css:3066`), `.download-apk-pill` (`300..377`), `.topbar-bell-btn` (`385..421`), and `.header-profile` (`429..463`) are clipped off-screen.
  - At `412px` (`audit/screenshots/home-412.png`): `.topbar-actions` spans `x=112..463`, so half of `.topbar-bell-btn` and **100% of `.header-profile` (`429..463`)** are clipped off-screen.
  - At `768px` & `1024px`: `.workspace` is `500px` wide while `.topbar-actions` jumps to `468px` (`day streak` + `Get App` labels re-appear at `480px`/`680px`), clipping `Get App`, Bell, and Profile inside the centered `500px` column.
  - At `1440px` & `1920px` (`audit/screenshots/home-1440.png`): `.topbar` no longer has `overflow: hidden`, so `.topbar-actions` (`scrollWidth: 645px` inside `500px` `.topbar`) visually overflows `145px` right past the `.topbar` bottom divider!

### Page Container & Safe-Area Handling
- `<main className="app-main ...">` (`style.css:966-972` desktop `padding: 32px 36px 40px`; `<=768px` overrides `.home-main` (`12px 16px ...`), `.interior-main` (`var(--safe-top, 38px) 16px ...`), `.learn-main` (`max(54px, ...)`)).
- Notice `--safe-top: max(38px, env(safe-area-inset-top, 38px))` (`style.css:151`): on **desktop and mobile web browsers** where `env(safe-area-inset-top)` is `0px`, `max(38px, 0px)` **forces `38px–54px` of wasted empty top padding** on `.topbar`, `.interior-main`, `.learn-page`, `.practice-page`, `.games-page`, and `.lesson-page-screen`!
- On native Android (`lingo/src/main.jsx:514-518`), `StatusBar.setOverlaysWebView({ overlay: false })` already pushes WebView below the status bar, while Capacitor config still mixes `server.androidScheme: 'https'` with live-reload URL during dev.

---

## 5. Platform Detection Today

| Location | Mechanism | Purpose & Effect |
| :--- | :--- | :--- |
| `lingo/src/apiConfig.js:4-25` | `Capacitor.isNativePlatform() \|\| window.Capacitor?.isNativePlatform?.() \|\| window.Capacitor?.platform === 'android' \|\| 'ios'` + `isLiveDevOrigin` (`localhost:5173` / `127.0.0.1:5173`) | Decides `API_BASE` (`VITE_API_BASE_URL` / `https://lingo-ruby-three.vercel.app` for APK, `''` relative for web & live-reload) & toggles `CapacitorHttp.request` vs `fetch`. |
| `lingo/src/main.jsx:302` | `const isNative = isNativePlatform()` | Controls rendering of **both** Android download CTAs. |
| `lingo/src/main.jsx:514` | `if (isNativePlatform())` | Dynamically imports `@capacitor/status-bar` on boot. |
| `lingo/src/services/deviceNotifications.js:121` | `if (!isNativePlatform()) return null` | Dynamically imports `@capacitor/local-notifications`; falls back to `window.Notification` on web. |
| `lingo/src/components/Rewards/RewardOpeningModal.jsx:35` | `window.matchMedia?.('(prefers-reduced-motion: reduce)').matches` | Only `matchMedia` usage in JS; **zero `navigator.userAgent` checks** in codebase. |

### Android APK Promotion & Delivery
- **Shown when `!isNative`** (`lingo/src/main.jsx:1211-1223`, `1323-1342`):
  1. Topbar `.download-apk-pill`: `<a href="/lingo.apk" download="lingo.apk">` (`Get App / APK`). (Note: even causes extra clipping on mobile browsers!)
  2. Home Dashboard `.install-apk-banner`: `"Install Lingo on your Android Phone"` + `<a href="/lingo.apk" download="lingo.apk">Download APK</a>`.
- **Where the APK is stored & served**:
  - `lingo/scripts/build-apk.mjs:38-53` copies `app-debug.apk` to `lingo/public/lingo.apk`, `lingo/dist/lingo.apk`, and root `dist/lingo.apk`.
  - Current sizes on disk: `lingo/public/lingo.apk` (`66.12 MB`), `lingo/dist/lingo.apk` (`66.12 MB`), root `dist/lingo.apk` (`17.40 MB`, stale copy from earlier build).
  - **No dedicated `/lingo.apk` route exists in `lingo/server.mjs`**: Vite copies `lingo/public/*` into `lingo/dist/`, and `server.mjs:2745` (`express.static`) or Vercel CDN serves `/lingo.apk` statically.
  - **Vercel inclusion risk**: Neither `.vercelignore` nor `lingo/.vercelignore` exists. Root `npm run build` copies `lingo/dist` -> `dist/` (which embeds the `66.12 MB` `lingo.apk` unless ignored!). On Vercel (`vercel.json` SPA catch-all + static output), uploading a `66 MB` binary on every static deployment wastes CDN bandwidth/upload time and risks hitting deployment file limits.

---

## 6. Native Plugin & Device API Usage

### Capacitor Plugins (`lingo/package.json:33-38`, `capacitor.config.json`)
| Package | Where Imported | Guard / Web Behavior |
| :--- | :--- | :--- |
| `@capacitor/core` (`Capacitor`, `CapacitorHttp`) | `lingo/src/apiConfig.js:4` (static import) | Safe on web; `Capacitor.isNativePlatform()` returns `false`, `fetch` is used. Notice `CapacitorHttp` is bundled even in web chunks. |
| `@capacitor/status-bar` (`StatusBar`, `Style`) | `lingo/src/main.jsx:515` (dynamic `import()` behind `if (isNativePlatform())`) | Completely skipped on web; safe fallback with `.catch(() => {})`. |
| `@capacitor/local-notifications` (`LocalNotifications`) | `lingo/src/services/deviceNotifications.js:123` (dynamic `import()` behind `if (!isNativePlatform()) return null`) | Skipped on web; `deviceNotifications.js` falls back to `window.Notification`. Android uses channels + `AlarmManager`. |
| `@capacitor/preferences` (`^7.0.4`) | **Not imported anywhere in `src/`** (installed + synced in `android/`, unused; app uses `localStorage`). | Dead native dependency / APK weight; no web impact. |
| `@capacitor/splash-screen` (`^7.0.5`) | Configured in `lingo/capacitor.config.json:12-16` only; **not imported in `src/`**. | Managed by Capacitor Android native shell automatically; safe on web. |
| `@capacitor/android` / `@capacitor/cli` | Android native shell & build CLI only. | N/A on web. |

### Browser & Device Web APIs
- **Speech Recognition (`SpeechRecognition || webkitSpeechRecognition`)**: `AIConversationTutor.jsx:62,77`, `MicrophoneRecorder.jsx:22,75` — guarded, falls back cleanly when unsupported (e.g. Firefox/Safari WebKit edge cases).
- **Text-to-Speech (`window.speechSynthesis`)**: `AIConversationTutor.jsx:53`, `PronunciationCoach.jsx:34`, `main.jsx:706,2354` — guarded (`if (!('speechSynthesis' in window)) return`).
- **Microphone (`navigator.mediaDevices.getUserMedia({ audio: true })`)**: `MicrophoneRecorder.jsx:23,63,70` — guarded; note desktop browsers require HTTPS or `localhost`.
- **Notifications (`window.Notification`)**: `services/deviceNotifications.js:140-392` — guarded (`'Notification' in window`), prompts on user action (`Enable Alerts`), supports daily fallback + social alerts.
- **Clipboard (`navigator.clipboard.writeText`)**: `SpectatorDashboard.jsx:69`, `WaitingLobby.jsx:38`, `FriendsPage.jsx:98`, `main.jsx:880,1618` — guarded with `try/catch` toast fallback.
- **Web Share (`navigator.share && navigator.canShare`)**: `WaitingLobby.jsx:56`, `FriendsPage.jsx:111` — guarded, falls back to clipboard copy on desktop browsers without Share API.
- **Vibration & Camera**: **Not used anywhere** in the codebase (`vibrate`, `getUserMedia({ video })` absent).

---

## 7. Screen, Overlay, & Interaction Inventory

### Main Screens & Sub-Flows
| Screen / Route | File(s) | Layout Approach | Hardcoded Widths / Heights | Desktop Risk |
| :--- | :--- | :--- | :--- | :--- |
| **Welcome / Auth** (`!user`) | `main.jsx:965-1060` (`Auth`) | Centered flex `.unauth-screen` (`100dvh`) | `.welcome-screen-container { max-width: 440px }`, `.welcome-hero-art { height: 205px }` | **Low** (clean centered card, though could offer optional 2-col hero on wide screens) |
| **Home Dashboard** (`home`) | `main.jsx:1178-1370` | Single-col flex `.dashboard-grid` (forced by `500px` `.workspace`) | `.workspace { max-width: 500px !important }`, `.topbar-actions` overflows `500px` at `>=768px` | **High** (wasted 65–74% horizontal viewport on desktop + topbar spill/clipping + Android APK banner shown prominently) |
| **Learn Path** (`learn`) | `Learn.jsx`, `WindingPathMap.jsx`, `UnitNodeRow.jsx`, `learn.css` | Vertical path + unit cards + dropdown selector | `.learn-gamified-view { max-width: 520px }`, `.learn-redesign-journey { max-width: 540px }`, `.winding-path-wrapper { max-width: 480px }`, `.lesson-node-card { width: 285px }` | **Medium** (winding map stays readable centered, but level overview & cards cannot use multi-column desktop grid) |
| **Friends & Communities** (`friends`) | `FriendsPage.jsx`, `social.css` | Flex stack + 3-col stat bar + `overflow-x: auto` subtabs | `.social-page-wrap { max-width: 540px }`, `.social-friend-card` single column | **High** (wide desktop sits in `500px` strip instead of 2-column Friends/Communities split) |
| **Practice Lab** (`practice`) | `PracticeHub.jsx`, `ListeningLab.jsx`, `SpeakingStudio.jsx`, `PronunciationCoach.jsx`, `AIConversationTutor.jsx`, `practice.css` | 4-tab switcher + `.practice-grid` (`320px 1fr` `>1080px`, `1fr` `<=1080px`) | `.practice-grid` `minmax(0,320px) minmax(0,1fr)` vs `500px` workspace; `.ai-chat-container { height: 480px }` | **Critical/High** (visibly broken in `audit/screenshots/practice-1440.png` — list crushes detail pane to `~84px`!) |
| **Play & Learn Setup** (`games`, no room) | `GamesSetup.jsx`, `games.css` | Flex stack (`01 Join` + `02 Create` accordion) | Inherited `500px` workspace (`padding-top: 54px` on `<=768px` via safe-top) | **Medium** (Join & Create stack vertically instead of 2-col desktop layout) |
| **Friends Waiting / Countdown / Play / Podium** (`games` active) | `GameRoom.jsx`, `WaitingLobby.jsx`, `CountdownLobby.jsx`, `SpectatorDashboard.jsx`, `FinishedGame.jsx`, `GameInvitePanel.jsx` | Stacked flex cards (`Solo` & `Friends` card decks) | Inherited `500px` workspace; `.friends-players-grid` inline 4-col CSS grid | **Low–Medium** (card deck centered nicely, spectator/leaderboard could widen slightly on desktop) |
| **Solo Countdown / Quiz / Results** (`games` solo) | `SoloGameRoom.jsx`, `games.css` | Flex card stack (`solo-flow-page`) | `.solo-flow-page { max-width: 520px }`, `.solo-results-stage { min-height: calc(100dvh - 64px) }` | **Low** |
| **Profile** (`profile`) | `main.jsx:1600-1890`, `AchievementsSection.jsx`, `RewardHistorySection.jsx` | Vertical stack + 2-col stats grid (`profile-stats-grid`) + hub cards + badge library (`6,060px` tall at `412px`!) | Inherited `500px` workspace; `.achievements-grid` cramped vertically (`~5936px` tall on desktop!) | **High** (`5,936px` tall single-column scroll on `1440px` desktop!) |
| **Reminders & Alerts** (`reminders`) | `RemindersSettingsPage.jsx`, `style.css:2225-2535` | Vertical card list + switches | `.reminders-page-view { max-width: 540px }` | **Low–Medium** |
| **Lesson / Milestone Fullscreen** (`activeLessonPage`) | `main.jsx:1068-1155, 2333+` (`Lesson`) | Fullscreen `.lesson-page-workspace` (`100dvh`, hides `.mobile-nav`) | Reuses `.workspace { max-width: 500px !important }` + `.lesson-modal { width: 580px/660px }` legacy selectors | **Low** (focused single-column quiz is good UX centered up to ~`680px`, though `.workspace` `500px` cap pinches vocabulary grids) |

### Modals, Overlays, `<dialog>`, & Toasts
1. **`App` Generic Dialogs (`main.jsx:1970`)**: `.modal-overlay` (`fixed`, `z-index: 2500`) + `.modal` (`width: 480px`) hosting `auth`, `goal`, `library`, `word`, `topic`, `progress`.
2. **Lesson Preview Modal (`LessonPreviewModal.jsx:28-29`)**: `.modal-overlay` + `.lesson-preview-modal` (`width: 520px`, mobile sheet adjustments `<=768px`).
3. **Confirm Leave Lesson (`main.jsx:1119`)**: `.confirm-leave-overlay` (`fixed`, `z-index: 3000`, `role="alertdialog"`) + `.confirm-leave-card` (`max-width: 340px`).
4. **Native `<dialog>` Exit Modals**: Used in `GameRoom.jsx:301`, `SoloGameRoom.jsx:344`, `SpectatorDashboard.jsx:257` (`showModal()` browser top-layer).
5. **Social Modals (`SocialModals.jsx:53,172,378,557`)**: `FriendProfileModal`, `CreateCommunityModal`, `CommunityDetailModal`, `NotificationsModal` rendered with `.social-modal-overlay` (`fixed`) + `.social-modal-card` (`max-width: 390px/450px`).
6. **Custom Time Picker (`RemindersSettingsPage.jsx:58`)**: `.lingo-time-picker-overlay` (`fixed`, `z-index: 1350`) + `.ltp-card` (`max-width: 360px`).
7. **Achievement & Reward Overlays**: `BadgeUnlockModal.jsx:16` (`.badge-unlock-overlay`), `AchievementsSection.jsx:222` (`.badge-detail-card` inside fixed overlay), `RewardOpeningModal.jsx:56` (`.reward-open-overlay`), `CourseHeader` dropdown backdrop (`.course-dropdown-backdrop`, `fixed`).
8. **Toasts & Live Banners**: `.toast` (`main.jsx:1053,1151,1894`, `fixed; bottom: 84px; z-index: 150` — clears `.mobile-nav` at `bottom: 16px + 66px`) & `.global-game-invite-toast` (`main.jsx:1923`, `fixed; top: max(14px, var(--safe-top)); z-index: 1250`).

### Touch / Swipe-Only Interactions
- **Global Horizontal Swipe Navigation (`lingo/src/main.jsx:1247-1263`)**: `onTouchStart` / `onTouchEnd` on `<main>` checks `Math.abs(dx) > 110` to swipe between `pages` (`Home -> Learn -> Friends -> Practice -> Play -> Profile -> Reminders`), disabled inside `.practice-nav-tabs, .practice-page, .horizontal-scroll, [data-no-swipe]`. Mouse drag does not trigger it (desktop already has `ArrowLeft`/`ArrowRight` keyboard shortcut at `main.jsx:544-552` and click nav). No drag-and-drop exercises exist.
- **Horizontal Scroll Strips**: `.social-subtabs` (`FriendsPage`), `.ach-filter-bar` (`AchievementsSection`), and `.level-tabs-scroll` (`CourseLevelSelector`) rely on horizontal touch/trackpad scroll (`overflow-x: auto`) at `360px–412px`.

---

## 8. Live Measurements (`360px` to `1920px`)

Measured against isolated test build on `http://localhost:3000` (2 seeded users, 1 friend, 1 completed lesson). Screenshots saved in `audit/screenshots/<screen>-<width>.png`.

| Width × Height | Screen | `docScrollW` / `innerW` | Workspace W (`x`) | `.topbar` W / `scrollW` | Clipped / Broken Elements | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `360 × 800` | `home` | `360 / 360` | `360` (`0`) | `360 / 463` | **`.download-apk-pill`, `.topbar-bell-btn`, `.header-profile` 100% clipped off-screen (`right=463`)** | [home-360.png](file:///c:/Users/saura/Downloads/lingo-source/audit/screenshots/home-360.png) |
| `360 × 800` | `friends` | `360 / 360` | `360` (`0`) | — | `.social-tab-pill` scrolls internally (`right=447`), card clean | [friends-360.png](file:///c:/Users/saura/Downloads/lingo-source/audit/screenshots/friends-360.png) |
| `360 × 800` | `profile` | `360 / 360` | `360` (`0`) | — | `.ach-filter-pill` scrolls internally (`right=453`); `6,155px` tall | [profile-360.png](file:///c:/Users/saura/Downloads/lingo-source/audit/screenshots/profile-360.png) |
| `360 × 800` | `games`, `learn`, `practice`, `reminders` | `360 / 360` | `360` (`0`) | — | Clean mobile stack; zero page overflow or bottom-nav overlap | [games-360.png](file:///c:/Users/saura/Downloads/lingo-source/audit/screenshots/games-360.png) |
| `412 × 915` | `home` | `412 / 412` | `412` (`0`) | `412 / 479` | **Bell half-clipped (`385..421`); `.header-profile` 100% clipped (`429..463`)** | [home-412.png](file:///c:/Users/saura/Downloads/lingo-source/audit/screenshots/home-412.png) |
| `412 × 915` | `learn`, `friends`, `practice`, `games`, `profile`, `reminders` | `412 / 412` | `412` (`0`) | — | `.social-tab-pill` / `.ach-filter-pill` internal scroll; no page overflow | [reminders-360.png](file:///c:/Users/saura/Downloads/lingo-source/audit/screenshots/reminders-360.png) |
| `768 × 1024` | `home` | `768 / 768` | **`500`** (`134`) | `500 / 618` | **`.workspace` locks to `500px`; APK pill (`643`), Bell (`687`), Profile (`752`) clipped at `x=634`** | [home-768.png](file:///c:/Users/saura/Downloads/lingo-source/audit/screenshots/home-768.png) |
| `1024 × 768` | `home` | `1024 / 1024` | **`500`** (`262`) | `500 / 618` | **Still locked to `500px` centered column; Profile/Bell clipped at `x=762` (`overflow: hidden`)** | [home-1024.png](file:///c:/Users/saura/Downloads/lingo-source/audit/screenshots/home-1024.png) |
| `1440 × 900` | `home` | `1440 / 1440` | **`500`** (`470`) | `500 / 645` | **Phone strip with `940px` blank margins; `.topbar-actions` spills `145px` right outside `.topbar` border** | [home-1440.png](file:///c:/Users/saura/Downloads/lingo-source/audit/screenshots/home-1440.png) |
| `1440 × 900` | `practice` | `1440 / 1440` | **`500`** (`470`) | — | **BROKEN GRID**: `.practice-grid` switches to 2 columns (`320px 1fr`) inside `428px` content, crushing detail cards! | [practice-1440.png](file:///c:/Users/saura/Downloads/lingo-source/audit/screenshots/practice-1440.png) |
| `1440 × 900` | `learn`, `friends`, `games`, `profile`, `reminders`, `welcome` | `1440 / 1440` | **`500`** (`470`) | — | All locked to `500px` width (`440px` welcome); Profile renders `5,936px` tall; mobile pill nav floats at bottom | [learn-1440.png](file:///c:/Users/saura/Downloads/lingo-source/audit/screenshots/learn-1440.png) / [friends-1440.png](file:///c:/Users/saura/Downloads/lingo-source/audit/screenshots/friends-1440.png) |
| `1920 × 1080` | `home` | `1920 / 1920` | **`500`** (`710`) | `500 / 645` | **`1,420px` unused horizontal space (`74%` empty); topbar actions overflow `145px` right of `.topbar`** | [home-1920.png](file:///c:/Users/saura/Downloads/lingo-source/audit/screenshots/home-1920.png) |
| `1920 × 1080` | `practice` | `1920 / 1920` | **`500`** (`710`) | — | **BROKEN GRID** (`320px 1fr` crammed inside `428px` workspace) | [practice-1920.png](file:///c:/Users/saura/Downloads/lingo-source/audit/screenshots/practice-1920.png) |

*(All `bottomOverlap` checks on leaf buttons at scroll bottom passed `false`, though `.main-footer` and bottom margins sit visually behind the `66px` `.mobile-nav` at intermediate scroll positions on desktop because `main` lacks `>768px` bottom dock padding).*

---

## 9. Tests

### Playwright Setup & Breakage Risks
- **Playwright Config**: **No `playwright.config.*` exists** anywhere in the repo. All Playwright scripts are standalone `.mjs` files launching `chromium.launch({ headless: true })` manually against hardcoded `http://localhost:3000`.
- **Tests Assuming Mobile Viewports**:
  - `lingo/tests/audit-all-viewports.mjs`: tests 11 viewports (`320`–`1920`); explicitly switches selectors at `vp.width <= 768` (`.mobile-nav` vs `.sidebar`)!
  - `lingo/tests/e2e.mjs`: starts at `1440×1000` (`1280×900` friend), then resizes to **`390×844`** (`line 42`) and simulates `touchstart`/`touchend` horizontal swipe (`main`) from `Home` -> `Let’s learn`.
  - `lingo/tests/phase1-multiplayer-ui.mjs`, `phase2-game-creation-ui.mjs`: end with `1440`, `768`, `375` overflow checks.
  - `lingo/tests/visual.mjs`: captures `1440×1100` & `390×844` screenshots using `.click()` on `Let’s learn`, `Play & learn`, `Home`, `Learn`.
- **Selectors That Break Under Responsive Web Layout Changes**:
  1. Legacy desktop tests (`audit-all-viewports.mjs:139`, `e2e.mjs:15,22`, `phase1:16`, `phase2:16`, `phase3:22`, `phase5:33`, `visual.mjs`) select `button` named `'Play & learn'` or `'Let’s learn'` or `.sidebar` — which do not exist today (`mobile-nav` uses `'Play'` / `'Learn'`). If web restores desktop sidebar with `Play` vs `Play & learn`, align text or add `data-testid` attributes.
  2. `audit-all-viewports.mjs` asserts `.profile-modal-view` inside `.modal`, whereas Profile moved from a modal to a full tab (`page === 'profile'`).
  3. `e2e.mjs` & `audit-all-viewports.mjs` click `'Get started'` expecting Signup (`What should we call you?`), whereas `Get started` invokes `/api/auth/demo` in local demo mode.
- **How Tests Start the Server**:
  - **All 7 Playwright scripts do NOT start a server** — they require `server.mjs` already running on `http://localhost:3000`.
  - Meanwhile, newer verification scripts (`social-system-verify.mjs`, `option-shuffling-verify.mjs`, `friends-flow-verify.mjs`, `solo-flow-verify.mjs`, `rewards-system.mjs`, `achievements-system.mjs`) spawn an isolated `server.mjs` (`ISOLATED_TEST=1`) on ephemeral ports (`3458`–`3461`) using temp JSON files.

### Playwright Suite Execution Results (Run Once Without Fixing Anything)
Executed sequentially against isolated `server.mjs` on `:3000`:

| Test File | Result | Failure Cause Observed |
| :--- | :--- | :--- |
| `lingo/tests/audit-all-viewports.mjs` | **FAIL (exit 1)** | `TimeoutError: waiting for getByLabel('What should we call you?')` — clicking `Get started` enters Demo mode instead of Signup modal (`audit-all-viewports.mjs:108`). |
| `lingo/tests/e2e.mjs` | **FAIL (exit 1)** | `TimeoutError: waiting for getByLabel('What should we call you?')` at `e2e.mjs:12` (same Demo-vs-Signup mismatch + downstream selectors `.sidebar`/`Play & learn` stale). |
| `lingo/tests/phase1-multiplayer-ui.mjs` | **FAIL (exit 1)** | Expects `getByRole('button', { name: 'Play & learn', exact: true })` immediately at `/` without onboarding gate; stuck on Welcome screen (`phase1-multiplayer-ui.mjs:16`). |
| `lingo/tests/phase2-game-creation-ui.mjs` | **FAIL (exit 1)** | Same: stuck on Welcome screen waiting for `'Play & learn'` (`phase2-game-creation-ui.mjs:16`). |
| `lingo/tests/phase3-solo-friends-ui.mjs` | **FAIL (exit 1)** | Same: stuck on Welcome screen waiting for `'Play & learn'` (`phase3-solo-friends-ui.mjs:22`). |
| `lingo/tests/phase5-friends-ui.mjs` | **FAIL (exit 1)** | `TimeoutError: waiting for getByRole('button', { name: 'Play & learn', exact: true })` at `phase5-friends-ui.mjs:33`. |

*(Note: `visual.mjs` was not executed directly as it writes PNGs directly into `lingo/tests/`. Node API verification suites `social-system-verify.mjs`, `option-shuffling-verify.mjs`, `friends-flow-verify.mjs`, and `solo-flow-verify.mjs` are self-contained and passed prior to audit.)*

---

## 10. Build and Deploy

- **`lingo/vite.config.js`**: Minimal React plugin (`@vitejs/plugin-react`), no explicit `base` (defaults `'/'`), dev/preview proxy `/api` -> `process.env.VITE_DEV_API_PROXY || 'http://127.0.0.1:3000'`, no manual rollup code-splitting (`index-Ck8juB9p.js` bundle is `1,393.47 kB` / `405.86 kB` gzip).
- **Build Scripts (`package.json` & `lingo/package.json`)**:
  - `npm run build` (root): runs `npm --prefix lingo run build` (`vite build` -> `lingo/dist/`) then recursively copies `lingo/dist` -> root `dist/` (which currently includes `lingo.apk`).
  - `npm run build:mobile`: runs `vite build --mode production` (loads `.env.production` if needed) + `npx cap sync android` (copies `lingo/dist` into `android/app/src/main/assets/public/` and updates Capacitor native plugins).
  - `npm run build:apk`: runs `build:mobile` then `scripts/build-apk.mjs` (`gradlew.bat assembleDebug`) and **copies `app-debug.apk` into `lingo/public/lingo.apk`, `lingo/dist/lingo.apk`, and root `dist/lingo.apk`**.
- **Vercel Deployment (`vercel.json`, `api/index.js`, `lingo/server.mjs`)**:
  - `api/index.js` sets `process.env.VERCEL = '1'` and exports Express `app` from `lingo/server.mjs`.
  - `lingo/server.mjs:76-78` normalizes `/api` URLs on Vercel; `lingo/server.mjs:2741` skips `app.listen()` when `VERCEL` is set; static files come from root `dist/` via Vercel's `vercel.json` rewrites (`/(.*)` -> `/index.html`). Local dev (`node server.mjs`) mounts Vite middleware or serves `dist/` directly.
- **Blockers for Clean Web-vs-Android Separation**:
  1. **`lingo/public/lingo.apk` (`66.12 MB`)** gets bundled into `dist/` and `android/app/src/main/assets/public/lingo.apk` inside the APK itself if rebuilt without exclusion! Both `build:mobile` (putting APK inside the APK's web assets!) and Vercel web builds pick up `public/lingo.apk`.
  2. **`isLiveDevOrigin` in `apiConfig.js`**: checks `window.location.port === '5173'` — works for `app:dev` (`localhost:5173`), but any web preview server on `:4173`/`:3000` has `isNativePlatform() === false` already. However, **explicit compile-time or DOM attribute (`html[data-platform="web" | "native"]`) is currently absent**.
  3. **Top-level `!important` overrides in `style.css` (`818-822`, `624`, `2008`, `849`)**: prevent desktop overrides unless either removed or strictly scoped cleanly under native/mobile vs web selectors.

---

## 11. Shared-Code Risk

Because Android APK and Web share the exact same React + CSS build, setting `document.documentElement.dataset.platform = isNativePlatform() ? 'native' : 'web'` at boot lets us preserve **100% pixel parity on Android** while adapting Web:

### Safe via CSS-Only Scoping (`html[data-platform="web"]` + `@media`)
- `.workspace`, `main`, `.dashboard-grid` (2-col desktop Dashboard rail + wide container)
- `.topbar` & `.topbar-actions` responsiveness (even on `native` mobile phones at `360px–412px` if carefully adjusted—wait: user wants Android untouched except intentional web fixes, so keeping `html[data-platform="web"]` guarantees zero Android shift!)
- `.learn-banner`, `.course-level-selector`, `.unit-scenic-banner-card`, `.path-nodes-flow`
- `.practice-grid` (**must** switch `.practice-grid` or widen `.workspace` on web so `practice-1440.png` stops crushing!)
- `.social-page-wrap`, `.friends-list`, `.reminders-page-view`, `.profile-page-view` (2-column grids for stats, hub cards, achievements, and rewards on desktop)
- `.games-page` (`Join` + `Create` side-by-side 2-column grid on desktop)
- `.modal` sizes & overlay layout

### Requires Conditional / Web-Only React Component Changes (`!isNativePlatform()`)
1. **Desktop Navigation Rail / Header Nav (`App` in `lingo/src/main.jsx`)**: Currently `<aside className="sidebar">` does **not exist in JSX**. Implementing a desktop sidebar (`>=1024px`) or top nav bar while keeping `.mobile-nav` hidden on `>=768px` (on web only) requires rendering a Web navigation component (`WebSidebar` or top tabs) only when `!isNativePlatform()`, while Android keeps `.mobile-nav` unconditionally.
2. **APK Promotion Removal on Web (`main.jsx:1211-1223`, `1323-1342`)**: Currently `getApp` pill and `install-apk-banner` render whenever `!isNative`. To cut Android-only features on Web (and reclaim crucial mobile-web topbar width so avatar clipping stops!), remove both JSX blocks or move APK download solely outside the primary app shell/landing page (plus stop storing a `66 MB` binary inside `lingo/public/`).
3. **`LessonPreviewModal` / `Lesson` / `GameRoom` / `SoloGameRoom` wrappers**: Should stay centered/focused (`max-width: 680px–780px`) inside the wider web shell; optional CSS tweaks only unless adding desktop breadcrumb headers.

---

## Risk Register (What Could Break Android, Ranked)

1. **CRITICAL — Removing `.workspace { max-width: 500px !important }` or changing `.mobile-nav` globally without `html[data-platform="web"]` scoping**: Android tablets/foldables (`>=600px–800px` wide) or WebViews could accidentally trigger desktop sidebar CSS and lose the mobile floating pill nav or shift safe-area padding.
2. **HIGH — Removing `--safe-top` (`38px`) globally**: Eliminates wasted top whitespace on web browsers, **but** would crash Android header/screen content behind status bars or rounded corners if removed on native. Must keep `--safe-top` on `html[data-platform="native"]`.
3. **HIGH — Editing `lingo/public/lingo.apk` / `apiConfig.js` carelessly**: Moving `lingo.apk` out of `public/` breaks `/lingo.apk` downloads unless replaced with an external release URL (GitHub Releases / Supabase Storage); meanwhile keeping it in `public/` bloats both Vercel deploys AND Capacitor Android APK (`assets/public/lingo.apk` bundled inside the APK itself!).
4. **MEDIUM — Hiding `.page-heading` or altering `touchstart/touchend` swipe handler globally**: Removing swipe nav blindly removes Android gesture navigation; scope desktop layout changes cleanly (`!isNative` or pointer/width queries where appropriate).
5. **MEDIUM — Changing `index.html` `<meta name="viewport">` (`user-scalable=no`)**: Safe and beneficial for Web accessibility, minimal Android WebView risk (double-check Android inputs don't auto-zoom if fonts `<16px`).
6. **LOW — Removing unused `.daily-reminders-grid` / legacy `.sidebar` dead CSS**: Low risk once checked that no active class relies on them.

---

## Open Questions for You

1. **APK Hosting / "Get App" Removal**: You mentioned cutting Android-only features on web—should we **completely remove** the `"Get App APK"` header pill and `"Install Lingo on your Android Phone"` banner from the website and delete `lingo/public/lingo.apk` (`66 MB`), or host the APK externally (e.g., GitHub Releases) with a footer link only?
2. **Desktop Navigation Style**: Above `1024px` (web), do you prefer a **fixed left Duolingo-style Sidebar** (`240px–260px` wide) with brand logo + 6 nav links + mini user card, or a **sticky Top Header Navigation** + single centered container?
3. **Tablet Width (`768px–1023px`) Behavior**: Should iPad/tablet web (`768px–1023px`) use the floating mobile bottom pill with a wider `680px–740px` fluid content width, or switch to a collapsed left rail at `768px`?
4. **Test Suite Modernization**: Should we update the 6 broken legacy Playwright tests (`e2e.mjs`, `phase1–5`) and add a `playwright.config.mjs` with auto-start `ISOLATED_TEST=1` server as part of the responsive refactor, or treat responsive web first?

---

## Recommendations

### Proposed Breakpoint Plan (Scoped to `html[data-platform="web"]`)
- **Mobile Web (`0 – 767px`)**: Fluid `100%` width, `16px` horizontal padding, zero `38px` forced `--safe-top`, compact `.topbar` (without APK pill, freeing `77–137px` so Bell & Profile avatar never clip even at `360px`), bottom pill `.mobile-nav`.
- **Tablet Web (`768 – 1023px`)**: Fluid content container `max-width: 740px` (`padding: 20px 24px 104px`), 2-column grids on Home / Learn / Friends / Profile, 1-column stacked `.practice-grid` (fix Practice breakpoint mismatch!), bottom pill `.mobile-nav`.
- **Desktop Web (`1024 – 1279px`)**: Persistent Left Sidebar (`220px`) OR clean Top Nav + expanded Workspace (`max-width: 1080px`), hide `.mobile-nav`, reveal `.topbar` on **all** pages (or unified persistent header + left sidebar), 2-col `.dashboard-grid`, 2-col `.practice-grid`, multi-col Badges & Friends grids.
- **Wide Desktop (`1280px+`)**: `256px` Left Sidebar + main canvas `max-width: 1200px` centered in remaining space, 2-col Games (`Join` left / `Create` right), 2-col Dashboard (`Main` + `Daily Goal / Streak` side rail), crisp readable widths (`max-width: 760px`) for focused Lesson/Quiz views.

### Desktop Navigation Approach & Trade-Offs
- **Recommended: Fixed Left Sidebar (`>=1024px`) + Floating Bottom Pill (`<1024px`) on `web`, Android untouched.**
  - *Pros*: Matches Duolingo & language-app mental models, reuses Lingo's cream/green design language (already sketched in `.sidebar` CSS!), keeps header free for streak/XP/gems/bell/profile, cleanly scales 6 nav items + profile shortcut.
  - *Cons*: Requires adding `<aside className="web-sidebar">` in React (`!isNative`) and ensuring bottom `<nav className="mobile-nav">` hides cleanly above `1024px` on `web`.
- *Alternative (Top Navbar)*: Simpler vertical space, less custom layout, but competes horizontally with Streak/XP/Gems/Bell/Profile pills at `1024px`.

### Suggested Order of Work & Effort Estimates
- **Phase 1 — Platform Scoping & Build Hygiene (~0.5 day)**: Inject `html[data-platform="web"|"native"]` in `main.jsx`, exclude `lingo.apk` from Vite/Capacitor web assets & `.vercelignore`, cut APK banner/pill on web (`--safe-top: 0px` on web), split legacy monolith CSS tokens cleanly.
- **Phase 2 — Responsive App Shell & Desktop Navigation (~1 day)**: Introduce `WebSidebar` + responsive `Topbar` (`!isNative`), lift `.workspace` `500px !important` cap on `html[data-platform="web"]`, hide `.mobile-nav` above `1024px` on web, fix `.topbar` overflow on `360px` & `412px`.
- **Phase 3 — Feature Screen Grids (`Home`, `Practice`, `Friends`, `Profile`, `Games`, `Learn`) (~1.5–2 days)**: Fix `.practice-grid` breakpoint, build 2-column layouts for Home + Rail, Friends + Communities, Profile + Badges/Rewards, Games Join+Create, and centered `720px` Learn path / Lesson view.
- **Phase 4 — Verification & Playwright Suite Modernization (~1 day)**: Create `lingo/playwright.config.mjs` with isolated auto-server, add `data-testid` / viewport matrix (`360, 412, 768, 1024, 1440, 1920`), verify Android APK visual regression zero-diff.

---

## 10 Most Important Facts an Implementation Prompt Must Include

1. **Exact Root Blocker**: `lingo/src/style.css:817-828` sets `.workspace { max-width: 500px !important; width: 100% !important; margin: 0 auto !important; }`, line `624` sets `.sidebar { display: none !important; }`, and line `2008` forces `.mobile-nav { display: flex !important; }`.
2. **No JSX Sidebar Exists**: Despite `.sidebar` rules in `style.css:623-791`, `lingo/src/main.jsx` has **no** `<aside>` sidebar component rendered—a web sidebar must be created in JSX.
3. **Always Scope Web Desktop Changes**: Use `html[data-platform="web"]` (driven by `!isNativePlatform()` in `lingo/src/apiConfig.js`) for every desktop/responsive override so Capacitor Android stays 100% untouched.
4. **Topbar Clipping/Overflow Root Cause**: Home `.topbar` packs 6 flex-nowrap items; on `<=1024px` `.topbar { overflow: hidden }` clips Bell & `.header-profile` off-screen (`360px`–`1024px`), while on `1440px`–`1920px` it spills `145px` right outside `.topbar`. Removing the APK pill on web + wrapping/responsive spacing fixes mobile & desktop header clipping.
5. **Practice Lab Desktop Grid Bug**: `.practice-grid` (`practice.css:186-205`) activates `320px 1fr` above `1080px`—making `practice-1440` & `practice-1920` visibly broken inside any `<750px` container.
6. **APK Asset Bloat**: `lingo/public/lingo.apk` (`66.12 MB`) gets copied into `lingo/dist/lingo.apk`, `dist/lingo.apk`, and even `android/app/src/main/assets/public/lingo.apk`; no `.vercelignore` exists.
7. **State-Driven Routing (`pages` array)**: Navigation uses React state `page` in `lingo/src/main.jsx:57` (`['home','learn','friends','practice','games','profile','reminders']`), not URL routes.
8. **Forced Top Notch Spacing on Web**: `--safe-top: max(38px, env(safe-area-inset-top, 38px))` (`style.css:151`) adds `38px–54px` dead top margin on web browsers; reset `--safe-top: 0px` (or `env(...)` fallback `0px`) under `html[data-platform="web"]`.
9. **Mobile Gesture & Native Plugin Guards**: `main.jsx:1247-1263` attaches touch swipe nav on `<main>`; `@capacitor/status-bar` & `@capacitor/local-notifications` are dynamically imported cleanly, while `@capacitor/core` (`CapacitorHttp`) is statically imported in `apiConfig.js`.
10. **Playwright Baseline**: No `playwright.config.*` exists, all 6 Playwright UI tests hardcode `http://localhost:3000` without starting the server, and all 6 currently fail due to demo onboarding vs signup changes and removed `.sidebar` (`Play & learn`) selectors.
