# Lingo Production Readiness Report

**Branch:** `security-hardening` (branched from `main`)  
**Verification Scope:** Local isolated server (`ISOLATED_TEST=1`, temporary JSON store), in-memory Postgres (`@electric-sql/pglite`), Vite production build (`lingo/dist/`), Playwright Chromium UI tests, and static/dependency scans. Live production Vercel/Supabase endpoints were **never** attacked or mutated.

---

## 1. Before / After Severity Summary

### Security Findings (`audit/SECURITY.md`)

| Severity | Before Audit | Fixed in Code / Config | Pending Owner Action (`NEEDS-ME`) | Remaining Open |
|---|---:|---:|---:|---:|
| **Critical** | 1 | 1 (`SEC-01`) | 0 | 0 |
| **High** | 7 | 6 (`SEC-02`..`SEC-07`) | 1 (`SEC-08` Android release signing/manifest; proposal + `.gitignore` ready) | 0 unaddressed |
| **Medium** | 3 | 3 (`SEC-09`, `SEC-10`, `SEC-11`) | 0 | 0 |
| **Low** | 1 | 1 (`SEC-12`) | 0 | 0 |
| **Total** | **12** | **11** | **1** | **0** |

### Bug Findings (`audit/BUGS.md`)

| Severity | Before Audit | Fixed in Code | Pending Owner Action (`NEEDS-ME`) | Remaining Open |
|---|---:|---:|---:|---:|
| **Critical** | 1 | 1 (`BUG-01`) | 0 | 0 |
| **High** | 5 | 4 (`BUG-02`..`BUG-04`, `BUG-06`) | 1 (`BUG-05` `@capacitor/app` back button; proposal ready) | 0 unaddressed |
| **Medium** | 4 | 4 (`BUG-07`..`BUG-10`) | 0 | 0 |
| **Low** | 1 | 1 (`BUG-11`) | 0 | 0 |
| **Total** | **11** | **10** | **1** | **0** |

---

## 2. Production Readiness Checklist

| Area | Status | Evidence / Notes |
|---|---|---|
| Checkpoint & XP anti-cheat (`SEC-01`) | **PASS** | `POST /api/progress/checkpoint` validates canonical unit IDs, unit prerequisites, and grades answers server-side; `security-audit-matrix.mjs` verifies `forged=400`, `unprereq=400`, `legitEarned=40`. |
| Serverless scaling & rate limiting (`SEC-02`) | **PASS** (code) / **NEEDS-ME** (SQL apply) | Replaced 5,000-row table scans with indexed/batch queries (`getBatchAccountsAndProgress`, `searchAccountsDirect`, `findAccountByLingoId`) and unified distributed `lingo_consume_rate_limit` RPC with memory fallback; `002_rate_limits_and_atomic_ops.sql` verified in `PGlite` (`allowed=[true,true,false]`). |
| Auth on grading & speech routes (`SEC-03`) | **PASS** | `POST /api/curriculum/exercises/check` and `POST /api/pronunciation/evaluate` sit behind `/api` auth middleware and enforce prerequisites (`401`/`403`). |
| Social IDOR & enumeration (`SEC-04`) | **PASS** | Stranger profile & search strip `lastActiveAt`, `earnedBadgeIds`, `xp`, `isOnline`; search rate-limited (`429` verified). |
| Block enforcement (`SEC-05`) | **PASS** (code) / **NEEDS-ME** (SQL apply) | Blocks cancel community & game invites and return `403` on owner communities & room joins; `001_user_blocks_rls_and_serverless_infra.sql` drafted. |
| AI tutor anti-forge & prompt safety (`SEC-06`) | **PASS** | Strict `scenarioId` validation, sanitized history, server-side turn counter before 30 XP payout, 15/min burst + 60/day quota, capped `maxOutputTokens`. |
| CORS, CSP, security headers & dotfiles (`SEC-07`) | **PASS** | Explicit allowlist (Vercel prod, Capacitor, localhost), `nosniff`, `DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS, CSP (`lingo/vercel.json` + `lingo/server.mjs`), `GET /.env` returns `404`. |
| Android release signing & manifest (`SEC-08`, `BUG-05`) | **NEEDS-ME** | `.gitignore` updated for keystores; APK `sha256` exposed in UI download tooltip & `/api/app/version`; `lingo/android/` left untouched per rules. Proposals documented in `docs/ANDROID_SECURITY_PROPOSAL.md`. |
| Room codes, join rate limit & TTL (`SEC-09`) | **PASS** | 6-char 32-alphabet room codes, 15/min join rate limit (`429` verified), 2h idle waiting-room TTL. |
| Tracked env/cache cleanup & CVEs (`SEC-10`) | **PASS** | Untracked `.env` & `node_modules/.vite/deps/_metadata.json`; pinned `vite` & `@vitejs/plugin-react`; `npm --prefix lingo audit` reports **0 vulnerabilities**. |
| Auth timing, fail-closed boot, revocation & deletion (`SEC-11`) | **PASS** | Constant-time dummy `scryptSync` on missing user, fail-closed `NODE_ENV=production` env validation (`lingo/server/envSchema.mjs`), `POST /api/auth/logout-all`, `DELETE /api/me` + Profile UI modal. |
| Client progress integrity (`SEC-12`) | **PASS** | Removed `localStorage` `extraXp`/`extraGems` synthesis in `mergeCheckpoints`. |
| Crash & UI stability (`BUG-01`, `BUG-02`, `BUG-07`..`BUG-09`) | **PASS** | Root `ErrorBoundary` verified via Vite/Playwright crash test; `LessonPreviewModal` hooks reordered; empty practice catalog fallbacks verified; safe `localStorage` helpers + 15s `AbortController` API timeout; `SpeechRecognition` unmount abort & zero-goal guards. |
| Serverless timers & timezone dates (`BUG-03`, `BUG-04`) | **PASS** | `setTimeout` guarded on `VERCEL`; `X-Timezone` sent by client and applied server-side (`TIMEZONE_DATE_ROLLOVER: Kiritimati=2026-11-28, Niue=2026-11-26`). |
| Cross-user state & null safety (`BUG-06`, `BUG-10`, `BUG-11`) | **PASS** | Per-user `lingo-custom-name:<username>` & `clearUserScopedCaches()`; explicit username in `refreshSocial()`; deterministic `e2e.mjs` prompt pool (`2/2` runs). |
| Production hardening, CI & Docs | **PASS** | `sourcemap: false` (0 `.map` files in `dist`), structured PII-free logging, optional `SENTRY_DSN` hook, `/api/health` readiness, `/api/app/version`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `README.md`, `docs/RUNBOOK.md`, `docs/PRIVACY_POLICY_DRAFT.md`. |

---

## 3. Verification Results (Latest Run)

- **Syntax & Build:** `node --check lingo/server.mjs` and all 17 files in `lingo/server/*.mjs` passed; `npm --prefix lingo run build` succeeded (`4.90s`, 0 `.map` files, 0 secret patterns in `lingo/dist/`, 0 forbidden tracked files in Git).
- **Dependency Audit:** `npm --prefix lingo audit` -> **0 vulnerabilities**.
- **SQL / Postgres RPC (`@electric-sql/pglite`):** `002_rate_limits_and_atomic_ops.sql` executed cleanly; `lingo_consume_rate_limit('test:user', 2, 60000)` returned `allowed=[true,true,false]`.
- **Standalone & Playwright UI Suites (13/13 PASS):**
  `security-audit-matrix.mjs`, `bug-hunt-repros.mjs`, `load-test-isolated.mjs`, `social-system-verify.mjs`, `rewards-system.mjs`, `option-shuffling-verify.mjs`, `test:e2e`, `test:matrix` (6 viewports), `test:phase1`, `test:phase2-config`, `test:phase2-ui`, `test:phase3-ui`, `test:phase5-ui`.
- **Server-Backed Isolated Suites (`ISOLATED_TEST=1`, 16/16 PASS):**
  `api.mjs`, `curriculum.mjs`, `phase10-lesson-engine.mjs`, `phase11.mjs`, `phase12-release-readiness.mjs`, `phase2-lifecycle.mjs`, `phase3-solo-friends.mjs`, `phase3-acceptance.mjs`, `phase4-llm-questions.mjs`, `phase5-multiplayer-sync.mjs`, `shared-learning-experience.mjs`, `curriculum-reconciliation.mjs`, `b1-curriculum.mjs`, `b2-curriculum.mjs`, `c1-curriculum.mjs`, `c2-curriculum.mjs`.
- **Isolated Load Benchmark (`load-test-isolated.mjs`, 12 concurrent workers × 180 requests/endpoint, 0 errors):**
  - `GET /api/health`: `390.2 rps`, p50 `25.07ms`, p95 `60.34ms`, p99 `74.12ms`
  - `GET /api/curriculum/levels`: `143.9 rps`, p50 `56.84ms`, p95 `197.03ms`, p99 `211.86ms`
  - `GET /api/me`: `164.7 rps`, p50 `49.24ms`, p95 `168.95ms`, p99 `201.17ms`
  - `GET /api/social/overview`: `583.7 rps`, p50 `18.41ms`, p95 `26.95ms`, p99 `33.03ms`
  - `POST /api/curriculum/exercises/check`: `417.7 rps`, p50 `25.57ms`, p95 `53.04ms`, p99 `54.41ms`

---

## 4. Remaining Architectural Risks

1. **Social State Single-Row Contention:** `getSocialState()` / `saveSocialState()` still serializes social mutations through `__lingo_social_state__` JSONB in `lingo_progress`. Batch queries (`SEC-02`) eliminate 5,000-row account scans, but at high concurrent social write volume, migrating writes fully onto the normalized relational social tables (`friendships`, `communities`, `notifications`) is the next scale milestone.
2. **LLM Cost Spikes Under Valid Accounts:** AI conversation is capped at 15 turns/min and 60 turns/day per user, and custom multiplayer rooms use Gemini/OpenAI. Monitor Gemini API billing quotas and set hard project-level budget alerts in Google Cloud / AI Studio.

---

## 5. Manual Actions for the Owner

1. **Rotate Credentials:** Rotate `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in Google AI Studio / Supabase Dashboard and update them in Vercel Project Settings and local `lingo/.env` (note `.env` is no longer tracked by Git, though prior git history remains unless rewritten).
2. **Verify Vercel Environment Variables:** Confirm `NODE_ENV=production`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_USERNAMES`, and optionally `GEMINI_API_KEY`, `ALLOWED_ORIGINS`, `SENTRY_DSN`, and `MIN_APK_VERSION_CODE` are set in Vercel.
3. **Apply Proposed Supabase SQL Migrations:** Review and run both files in `lingo/supabase/proposed/` via the Supabase SQL Editor (each file includes rollback SQL at the top):
   - `lingo/supabase/proposed/001_user_blocks_rls_and_serverless_infra.sql`
   - `lingo/supabase/proposed/002_rate_limits_and_atomic_ops.sql`
4. **Supabase Dashboard Settings:** Enable Point-in-Time Recovery (PITR) / automated backups under **Database → Backups**.
5. **Android Release Build & Play Console:**
   - Apply the Gradle signing, ProGuard/R8 minification, `AndroidManifest.xml` hardening (`allowBackup="false"`, `usesCleartextTraffic="false"`), and `@capacitor/app` back-button handler described in [docs/ANDROID_SECURITY_PROPOSAL.md](../docs/ANDROID_SECURITY_PROPOSAL.md).
   - Generate a release upload keystore outside the repo, build the signed release AAB/APK, and re-run `npm --prefix lingo run build:apk` / `deploy:apk`.
   - Finalize and host [docs/PRIVACY_POLICY_DRAFT.md](../docs/PRIVACY_POLICY_DRAFT.md), add a support contact email, and complete Google Play Data Safety + age-rating declarations (noting the in-app `Profile → Delete account` / `DELETE /api/me` deletion path).
6. **Merge & Deploy:** Review `git diff main..security-hardening`, merge `security-hardening` into `main`, and verify `GET https://lingo-ruby-three.vercel.app/api/health` returns `200`.
