# Lingo Operational Runbook

## 1. Environment Variables (Vercel & Local)

| Variable | Required In Prod | Purpose |
| --- | --- | --- |
| `NODE_ENV` | Yes (`production`) | Disables `/api/test/*` hooks, enforces fail-closed env validation & error redaction. |
| `SUPABASE_URL` | Yes | Supabase project HTTPS URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Private server-side service role key (NEVER expose via `VITE_*`). |
| `GEMINI_API_KEY` | Optional | Primary LLM for custom multiplayer topics and AI conversation tutor. |
| `OPENAI_API_KEY` | Optional | Secondary LLM fallback provider. |
| `ADMIN_USERNAMES` | Recommended | Comma-separated lowercase usernames permitted on `/api/admin/*`. |
| `ALLOWED_ORIGINS` | Optional | Extra comma-separated HTTPS origins permitted by CORS beyond default prod & Capacitor origins. |
| `SENTRY_DSN` | Optional | Enables PII-scrubbed server 5xx error reporting. |
| `MIN_APK_VERSION_CODE` | Optional (default `1`) | Returned by `GET /api/app/version` so mobile clients know when an upgrade is mandatory. |

---

## 2. Database Schema & Pending Migrations

All database mutations are shipped as reviewed SQL scripts — never executed blindly by agents.

1. Ensure base schema `lingo/supabase/schema.sql` and migrations in `lingo/supabase/migrations/` are applied.
2. Review and apply the security hardening migrations in `lingo/supabase/proposed/` via **Supabase SQL Editor** (or `supabase db push`):
   - `001_user_blocks_rls_and_serverless_infra.sql` — adds `ub_own_select` RLS policy on `public.user_blocks`.
   - `002_rate_limits_and_atomic_ops.sql` — creates `public.lingo_rate_limits`, `lingo_consume_rate_limit()` RPC for cross-instance serverless rate limiting, and JSONB lookup indexes on `lingo_accounts`.
3. Each proposed SQL file includes its exact **Rollback SQL** block in its header comments.

---

## 3. Deploying Web & Serverless API (Vercel)

- Production Root Directory in Vercel: `lingo`
- Build command: `npm run build`
- Health / Readiness probe: `GET /api/health` (returns HTTP `200` when Supabase responds cleanly, HTTP `503` if degraded).
- Client version / upgrade check: `GET /api/app/version` (returns `versionCode`, `versionName`, `minVersionCode`, `downloadUrl`, `sha256`).

### Vercel Rollback

1. In Vercel Dashboard → Deployments, select the last healthy deployment → **Instant Rollback**.
2. If a database migration must be reverted simultaneously, run the rollback SQL block at the top of the corresponding file in `lingo/supabase/proposed/`.

---

## 4. Secret & Key Rotation

### Rotating `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY`
1. Generate / regenerate the key in the provider dashboard (Supabase Settings → API, or Google AI Studio).
2. Update the environment variable in Vercel Project Settings (Production + Preview) and in local `.env` (never commit `.env`).
3. Redeploy Vercel immediately so warm serverless instances pick up the new key.
4. Revoke the old key once the new deployment is healthy (`GET /api/health` returns `200`).

### Emergency Session Revocation
- **Single compromised account**: Have the user click **Profile → Sign out everywhere** (`POST /api/auth/logout-all`), which bumps `tokenVersion` on their account and deletes their rows in `lingo_sessions`.
- **Global emergency**: Delete rows from `public.lingo_sessions` in Supabase (`TRUNCATE public.lingo_sessions;`), forcing all users to re-authenticate cleanly.

---

## 5. Supabase Backup & PITR Recovery

1. Verify Point-in-Time Recovery (PITR) or daily automated backups are enabled under **Supabase Project Settings → Database → Backups**.
2. Before applying any schema migration, take a manual snapshot / `pg_dump` backup.
3. For partial data corruption on a single JSONB account/progress record, prefer restoring only the affected `id` row from snapshot rather than full DB rewind.

---

## 6. Android APK Release & Signing

See [docs/ANDROID_SECURITY_PROPOSAL.md](ANDROID_SECURITY_PROPOSAL.md) for:
- Keystore generation & environment variables (`LINGO_KEYSTORE_PATH`, `LINGO_KEYSTORE_PASSWORD`, `LINGO_KEY_ALIAS`, `LINGO_KEY_PASSWORD`)
- Proposed `build.gradle` `signingConfigs.release` and ProGuard/R8 release build configuration
- Proposed `AndroidManifest.xml` hardening (`allowBackup="false"`, `usesCleartextTraffic="false"`)
- Enforcing upgrades via `MIN_APK_VERSION_CODE` + `GET /api/app/version`
