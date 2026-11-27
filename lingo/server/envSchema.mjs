/**
 * Startup environment schema validator & PII-safe structured logger.
 */

const isValidHttpUrl = value => {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export function validateRuntimeEnv(env = process.env) {
  const isProd = env.NODE_ENV === 'production';
  const isIsolated = !isProd && Boolean(env.ISOLATED_TEST);
  const errors = [];
  const warnings = [];

  if (env.PORT !== undefined && env.PORT !== '') {
    const p = Number(env.PORT);
    if (!Number.isInteger(p) || p <= 0 || p > 65535) {
      errors.push('PORT must be an integer between 1 and 65535.');
    }
  }

  const hasSupaUrl = Boolean(env.SUPABASE_URL && String(env.SUPABASE_URL).trim());
  const hasSupaKey = Boolean(env.SUPABASE_SERVICE_ROLE_KEY && String(env.SUPABASE_SERVICE_ROLE_KEY).trim());

  if (isProd && (!hasSupaUrl || !hasSupaKey)) {
    errors.push('Production startup aborted: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured when NODE_ENV=production.');
  }
  if (!isIsolated && hasSupaUrl && !isValidHttpUrl(env.SUPABASE_URL)) {
    errors.push('SUPABASE_URL must be a valid HTTP(S) URL.');
  }
  if (!isIsolated && hasSupaKey && String(env.SUPABASE_SERVICE_ROLE_KEY).trim().length < 20) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY looks malformed (too short).');
  }

  if (env.ALLOWED_ORIGINS) {
    for (const origin of String(env.ALLOWED_ORIGINS).split(',').map(s => s.trim()).filter(Boolean)) {
      if (!isValidHttpUrl(origin)) {
        errors.push(`ALLOWED_ORIGINS contains invalid URL "${origin}".`);
      }
    }
  }

  if (env.SENTRY_DSN && !isValidHttpUrl(env.SENTRY_DSN)) {
    errors.push('SENTRY_DSN must be a valid HTTP(S) URL when configured.');
  }

  if (env.MIN_APK_VERSION_CODE !== undefined && env.MIN_APK_VERSION_CODE !== '') {
    const minCode = Number(env.MIN_APK_VERSION_CODE);
    if (!Number.isInteger(minCode) || minCode < 1) {
      errors.push('MIN_APK_VERSION_CODE must be a positive integer.');
    }
  }

  if (isProd && !env.GEMINI_API_KEY && !env.GOOGLE_API_KEY && !env.OPENAI_API_KEY) {
    warnings.push('No LLM API key configured (GEMINI_API_KEY / OPENAI_API_KEY); AI tutor uses guided fallback.');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid runtime environment configuration: ${errors.join(' ')}`);
  }

  return {
    nodeEnv: env.NODE_ENV || 'development',
    isProd,
    isIsolated,
    sentryConfigured: Boolean(env.SENTRY_DSN),
    warnings
  };
}

const REDACT_KEYS = /password|token|authorization|secret|apikey|api_key|service_role|cookie/i;

export function redactLogMeta(meta) {
  if (!meta || typeof meta !== 'object') return {};
  const clean = {};
  for (const [k, v] of Object.entries(meta)) {
    if (REDACT_KEYS.test(k)) continue;
    if (typeof v === 'string') {
      clean[k] = v.slice(0, 240);
    } else if (typeof v === 'number' || typeof v === 'boolean' || v === null) {
      clean[k] = v;
    }
  }
  return clean;
}

export function logStructured(level, event, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...redactLogMeta(meta)
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else if (process.env.NODE_ENV === 'production' || process.env.LINGO_VERBOSE_LOGS === '1') {
    console.log(JSON.stringify(entry));
  }
}

export async function reportErrorToSentry(err, context = {}) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || process.env.NODE_ENV !== 'production') return;
  try {
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.replace(/^\/+|\/+$/g, '');
    const publicKey = parsed.username;
    if (!projectId || !publicKey) return;
    const envelopeUrl = `${parsed.protocol}//${parsed.host}/api/${projectId}/envelope/`;
    const eventId = `${Date.now().toString(16)}0000000000000000`.slice(0, 32);
    const header = JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() });
    const itemHeader = JSON.stringify({ type: 'event' });
    const payload = JSON.stringify({
      event_id: eventId,
      level: 'error',
      platform: 'node',
      environment: process.env.NODE_ENV || 'production',
      message: String(err?.message || 'Unhandled error').slice(0, 300),
      extra: redactLogMeta(context)
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    await fetch(envelopeUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=lingo-server/1.0`
      },
      body: `${header}\n${itemHeader}\n${payload}\n`
    }).finally(() => clearTimeout(timer));
  } catch {
    // Non-fatal observability hook
  }
}
