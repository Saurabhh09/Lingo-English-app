// Centralized API configuration for Lingo Play & Learn
// In web mode (Vercel / localhost), relative URLs (/api) are used seamlessly.
// In mobile APK mode (Capacitor), VITE_API_BASE_URL routes requests to the production backend.
import { Capacitor, CapacitorHttp } from '@capacitor/core';

export function isNativePlatform() {
  return typeof window !== 'undefined' && !!(
    Capacitor.isNativePlatform() ||
    window.Capacitor?.isNativePlatform?.() ||
    window.Capacitor?.platform === 'android' ||
    window.Capacitor?.platform === 'ios'
  );
}

const rawEnvBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const isLiveDevOrigin = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
) && window.location.port === '5173';

export const API_BASE = (!isLiveDevOrigin && isNativePlatform())
  ? (rawEnvBase || 'https://lingo-ruby-three.vercel.app')
  : '';

export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  if (!API_BASE) return cleanPath;
  return `${API_BASE}${cleanPath}`;
}

function getClientTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export async function requestApi(path, { body, method, token, timeoutMs = 15000 } = {}) {
  const cleanPath = path.startsWith('/api') ? path : '/api' + (path.startsWith('/') ? path : '/' + path);
  const fullUrl = getApiUrl(cleanPath);
  const httpMethod = (method || (body !== undefined ? 'POST' : 'GET')).toUpperCase();
  const hasBody = body !== undefined && httpMethod !== 'GET' && httpMethod !== 'HEAD';
  const headers = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    'X-Timezone': getClientTimezone(),
    ...(token ? { Authorization: 'Bearer ' + token } : {})
  };
  const maxAttempts = httpMethod === 'GET' ? 2 : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (isNativePlatform() && fullUrl.startsWith('http')) {
      try {
        const reqOpts = {
          url: fullUrl,
          method: httpMethod,
          headers,
          connectTimeout: Math.min(timeoutMs, 10000),
          readTimeout: timeoutMs
        };
        if (hasBody) reqOpts.data = body;
        const response = await CapacitorHttp.request(reqOpts);
        let data = response.data || {};
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            data = { error: data };
          }
        }
        if (data.serverTime) data.clientReceivedAt = Date.now();
        if (response.status >= 400) {
          if (attempt < maxAttempts && response.status >= 502 && response.status <= 504) {
            await new Promise(r => setTimeout(r, 250));
            continue;
          }
          const err = new Error(data.error || 'Something went wrong. Please try again.');
          err.status = response.status;
          throw err;
        }
        return data;
      } catch (e) {
        if (e.status) throw e;
        const msg = String(e?.message || '').toLowerCase();
        if (msg.includes('timeout') || msg.includes('timed out')) {
          if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, 250));
            continue;
          }
          const timeoutErr = new Error('Request timed out. Please check your connection and try again.');
          timeoutErr.status = 408;
          throw timeoutErr;
        }
        console.warn('Native CapacitorHttp request failed, falling back to fetch:', e.message);
      }
    }

    const fetchTimeoutMs = isNativePlatform() ? Math.min(timeoutMs, 8000) : timeoutMs;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), fetchTimeoutMs) : null;
    let r;
    try {
      r = await fetch(fullUrl, {
        method: httpMethod,
        headers,
        ...(controller ? { signal: controller.signal } : {}),
        ...(hasBody ? { body: JSON.stringify(body) } : {})
      });
    } catch (err) {
      if (timer) clearTimeout(timer);
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 250));
        continue;
      }
      if (err?.name === 'AbortError') {
        const timeoutErr = new Error('Request timed out. Please check your connection and try again.');
        timeoutErr.status = 408;
        throw timeoutErr;
      }
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }

    const text = await r.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text || 'Unexpected response from server' };
    }

    if (data.serverTime) data.clientReceivedAt = Date.now();
    if (!r.ok) {
      if (attempt < maxAttempts && r.status >= 502 && r.status <= 504) {
        await new Promise(r => setTimeout(r, 250));
        continue;
      }
      const err = new Error(data.error || 'Something went wrong. Please try again.');
      err.status = r.status;
      throw err;
    }
    return data;
  }
}
