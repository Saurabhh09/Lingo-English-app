/**
 * Lightweight In-Memory + Persistent Cache for Fast Screen Launches & API Deduping.
 */

import { isNativePlatform } from '../apiConfig.js';

const memCache = new Map();
const inFlight = new Map();
const STORAGE_PREFIX = 'lingo-swr:';
let prefsPromise = null;

async function getPrefsPlugin() {
  if (!isNativePlatform()) return null;
  if (!prefsPromise) {
    prefsPromise = import('@capacitor/preferences').then(m => m.Preferences).catch(() => null);
  }
  return prefsPromise;
}

async function readPersistent(key) {
  try {
    const prefs = await getPrefsPlugin();
    if (prefs) {
      const { value } = await prefs.get({ key: STORAGE_PREFIX + key });
      return value ? JSON.parse(value) : null;
    }
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writePersistent(key, record) {
  try {
    const serialized = JSON.stringify(record);
    if (serialized.length > 120000) return;
    const prefs = await getPrefsPlugin();
    if (prefs) {
      await prefs.set({ key: STORAGE_PREFIX + key, value: serialized });
      return;
    }
    localStorage.setItem(STORAGE_PREFIX + key, serialized);
  } catch { }
}

export function getSyncCache(key) {
  const entry = memCache.get(key);
  if (entry) return entry.data;
  try {
    if (!isNativePlatform()) {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data !== undefined) {
          memCache.set(key, parsed);
          return parsed.data;
        }
      }
    }
  } catch { }
  return null;
}

export function setCacheValue(key, data) {
  const record = { ts: Date.now(), data };
  memCache.set(key, record);
  writePersistent(key, record);
  return data;
}

export async function fetchWithSWR(key, fetcher, { maxAgeMs = 5 * 60 * 1000, forceRefresh = false } = {}) {
  const cached = memCache.get(key) || (await readPersistent(key).catch(() => null));
  if (cached?.data !== undefined) {
    memCache.set(key, cached);
    if ((Date.now() - (cached.ts || 0)) < maxAgeMs && !forceRefresh) {
      return cached.data;
    }
  }
  if (inFlight.has(key)) return inFlight.get(key);

  const req = Promise.resolve()
    .then(() => fetcher())
    .then(data => {
      if (data !== undefined && data !== null) setCacheValue(key, data);
      return data;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, req);
  return req;
}

export function clearUserScopedCaches() {
  for (const key of Array.from(memCache.keys())) {
    if (key.startsWith('me:') || key.startsWith('social:') || key.startsWith('rewards:')) {
      memCache.delete(key);
    }
  }
}
