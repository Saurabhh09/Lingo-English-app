# Lingo — Play & Learn

An English learning platform spanning Web (React 19 + Vite), Express 5 API (deployed on Vercel Functions), Supabase PostgreSQL storage, and Capacitor 7 Android APK.

## Architecture

- **Frontend (`lingo/src/`)**: Single-page React 19 UI with level-based CEFR lessons (`Pre-A1` through `C2`, 138 lessons / 690 exercises), Milestone Checkpoints, Practice Lab (Listening, Speaking, Pronunciation, AI Conversation Tutor), Achievements/Rewards/Gems, and Social (Friends, Private Communities, Multiplayer Room Invites, Push Reminders).
- **Backend API (`lingo/server.mjs`, `lingo/api/index.js`, `lingo/server/`)**: Stateless Express 5 application handling scrypt auth, SHA-256 hashed 30-day revocable tokens (`tokenVersion`), server-side lesson/checkpoint grading, social graph, distributed rate limiting (`lingo_consume_rate_limit`), and Gemini/OpenAI integration with guided fallbacks.
- **Database (`lingo/supabase/`)**: JSONB tables (`lingo_accounts`, `lingo_sessions`, `lingo_progress`, `lingo_games`, `lingo_solo`) plus relational achievements, rewards, social, and rate-limit migrations.
- **Mobile (`lingo/android/`, `lingo/releases/`)**: Capacitor 7 Android wrapper pointing to `https://lingo-ruby-three.vercel.app` via `CapacitorHttp`. Staged release APKs are tracked via `lingo/releases/apk-manifest.json` and served at `/downloads/<filename>` and `/lingo.apk`.

## Quick Local Setup

1. Copy environment template (never commit real `.env` files):
   ```bash
   cp lingo/.env.example lingo/.env
   ```
2. Install dependencies:
   ```bash
   npm --prefix lingo ci
   ```
3. Run isolated local server + Vite dev/UI tests (no live Supabase required in `ISOLATED_TEST=1` mode):
   ```bash
   ISOLATED_TEST=1 npm --prefix lingo run dev
   ```
4. Build production bundle (stages latest APK & metadata into `lingo/dist/downloads/`, with `sourcemap: false`):
   ```bash
   npm --prefix lingo run build
   ```

## Security & Privacy Controls

- **Fail-closed production boot**: When `NODE_ENV=production`, startup aborts if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing or malformed (`lingo/server/envSchema.mjs`).
- **CORS & Security Headers**: Restricted to explicit Vercel, Capacitor, and localhost origins with `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `HSTS`, and strict `Content-Security-Policy` (`lingo/vercel.json` & `lingo/server.mjs`).
- **Account Control & Play Compliance**: Users can revoke all active sessions (`POST /api/auth/logout-all`) or permanently erase their account and relational records (`DELETE /api/me` or via **Profile → Delete account**).

## Testing

All verification runs against isolated temporary JSON storage (`ISOLATED_TEST=1`):

```bash
node lingo/tests/security-audit-matrix.mjs
node lingo/tests/bug-hunt-repros.mjs
npm --prefix lingo run test:e2e
```

See [docs/RUNBOOK.md](docs/RUNBOOK.md) for deployment, SQL migration, key rotation, incident rollback, and Android signing procedures, and [docs/PRIVACY_POLICY_DRAFT.md](docs/PRIVACY_POLICY_DRAFT.md) for privacy/data-deletion documentation.
