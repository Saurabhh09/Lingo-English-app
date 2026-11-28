/**
 * Lightweight In-Memory + Persistent Cache for Fast Screen Launches & API Deduping.
 */

import { isNativePlatform } from '../apiConfig.js';

const memCache = new Map();
const inFlight = new Map();
const STORAGE_PREFIX = 'lingo-swr:';
let prefsPromise = null;

async function getPrefsHolder() {
  if (!isNativePlatform()) return null;
  if (!prefsPromise) {
    prefsPromise = import('@capacitor/preferences')
      .then(m => (m?.Preferences ? { plugin: m.Preferences } : null))
      .catch(() => null);
  }
  return Promise.race([
    prefsPromise,
    new Promise(resolve => setTimeout(() => resolve(null), 300))
  ]);
}

async function readPersistent(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw) return JSON.parse(raw);
  } catch { }
  try {
    const holder = await getPrefsHolder();
    const prefs = holder?.plugin || null;
    if (prefs) {
      const result = await Promise.race([
        prefs.get({ key: STORAGE_PREFIX + key }),
        new Promise(resolve => setTimeout(() => resolve(null), 300))
      ]);
      return result?.value ? JSON.parse(result.value) : null;
    }
  } catch { }
  return null;
}

async function writePersistent(key, record) {
  try {
    const serialized = JSON.stringify(record);
    if (serialized.length > 120000) return;
    try { localStorage.setItem(STORAGE_PREFIX + key, serialized); } catch { }
    const holder = await getPrefsHolder();
    const prefs = holder?.plugin || null;
    if (prefs) {
      await Promise.race([
        prefs.set({ key: STORAGE_PREFIX + key, value: serialized }),
        new Promise(resolve => setTimeout(resolve, 500))
      ]).catch(() => { });
    }
  } catch { }
}

export function getSyncCache(key) {
  const entry = memCache.get(key);
  if (entry) return entry.data;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.data !== undefined) {
        memCache.set(key, parsed);
        return parsed.data;
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

export async function fetchWithSWR(key, fetcher, { maxAgeMs = 5 * 60 * 1000, forceRefresh = false, staleWhileRevalidate = false } = {}) {
  const cached = memCache.get(key) || (await readPersistent(key).catch(() => null));
  if (cached?.data !== undefined) {
    memCache.set(key, cached);
    const isFresh = (Date.now() - (cached.ts || 0)) < maxAgeMs;
    if (isFresh && !forceRefresh) {
      return cached.data;
    }
    if (staleWhileRevalidate && !forceRefresh) {
      if (!inFlight.has(key)) {
        const bg = Promise.resolve()
          .then(() => fetcher())
          .then(data => {
            if (data !== undefined && data !== null) setCacheValue(key, data);
            return data;
          })
          .catch(() => null)
          .finally(() => {
            if (inFlight.get(key) === bg) inFlight.delete(key);
          });
        inFlight.set(key, bg);
      }
      return cached.data;
    }
  }
  if (!forceRefresh && inFlight.has(key)) return inFlight.get(key);

  const req = Promise.resolve()
    .then(() => fetcher())
    .then(data => {
      if (data !== undefined && data !== null) setCacheValue(key, data);
      return data;
    })
    .finally(() => {
      if (inFlight.get(key) === req) inFlight.delete(key);
    });

  inFlight.set(key, req);
  return req;
}

export function clearUserScopedCaches() {
  for (const key of Array.from(memCache.keys())) {
    if (key.startsWith('me:') || key.startsWith('social:') || key.startsWith('rewards:')) {
      memCache.delete(key);
    }
  }
  try {
    if (typeof localStorage !== 'undefined') {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (
          k.startsWith(STORAGE_PREFIX + 'me:') ||
          k.startsWith(STORAGE_PREFIX + 'social:') ||
          k.startsWith(STORAGE_PREFIX + 'rewards:')
        )) {
          localStorage.removeItem(k);
        }
      }
    }
  } catch { }
}
