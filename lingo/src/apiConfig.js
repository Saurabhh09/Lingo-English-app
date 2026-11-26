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

export async function requestApi(path, { body, method, token } = {}) {
  const cleanPath = path.startsWith('/api') ? path : '/api' + (path.startsWith('/') ? path : '/' + path);
  const fullUrl = getApiUrl(cleanPath);
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: 'Bearer ' + token } : {})
  };
  const httpMethod = method || (body ? 'POST' : 'GET');

  if (isNativePlatform()) {
    try {
      const response = await CapacitorHttp.request({
        url: fullUrl,
        method: httpMethod,
        headers,
        data: body,
      });
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
        const err = new Error(data.error || 'Something went wrong. Please try again.');
        err.status = response.status;
        throw err;
      }
      return data;
    } catch (e) {
      if (e.status) throw e;
      // Fallback to fetch if native call fails
      console.warn('Native CapacitorHttp request failed, falling back to fetch:', e.message);
    }
  }

  const r = await fetch(fullUrl, {
    method: httpMethod,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const text = await r.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || 'Unexpected response from server' };
  }

  if (data.serverTime) data.clientReceivedAt = Date.now();
  if (!r.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.');
    err.status = r.status;
    throw err;
  }
  return data;
}
