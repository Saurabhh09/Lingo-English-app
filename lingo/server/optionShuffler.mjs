/**
 * Unbiased Dynamic Answer-Option Shuffling Utility (Phase 2-6)
 *
 * Uses Fisher-Yates with cryptographically uniform random integers where available
 * and preserves stable per-option identity (`id`, `originalIndex`, `isCorrect`)
 * plus sessionStorage attempt stability so options never reshuffle mid-question.
 */

const distributionStats = {
  counts: [0, 0, 0, 0],
  total: 0
};

/**
 * Unbiased integer in [0, maxExclusive) using rejection sampling over crypto.getRandomValues
 * (falls back to Math.random if Web/Node crypto is unavailable).
 */
export function unbiasedRandomInt(maxExclusive) {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 1) return 0;

  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
    const buf = new Uint32Array(1);
    while (true) {
      cryptoObj.getRandomValues(buf);
      if (buf[0] < limit) {
        return buf[0] % maxExclusive;
      }
    }
  }

  return Math.floor(Math.random() * maxExclusive);
}

/**
 * Pure Fisher-Yates (Knuth) shuffle returning a new array without mutating input.
 */
export function fisherYatesShuffle(items, rng = unbiasedRandomInt) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeRawOptions(rawOptions = []) {
  return rawOptions.map((opt, idx) => {
    if (opt && typeof opt === 'object' && !Array.isArray(opt) && 'text' in opt) {
      return {
        id: opt.id ?? `opt_${idx}`,
        originalIndex: Number.isInteger(opt.originalIndex) ? opt.originalIndex : idx,
        text: String(opt.text ?? ''),
        ...(opt.isCorrect !== undefined ? { isCorrect: Boolean(opt.isCorrect) } : {})
      };
    }
    return {
      id: `opt_${idx}`,
      originalIndex: idx,
      text: String(opt ?? '')
    };
  });
}

function buildShuffleResult(orderedOptions) {
  const options = orderedOptions.map((opt, displayIndex) => ({
    ...opt,
    displayIndex
  }));
  const displayToOriginal = options.map(opt => opt.originalIndex);
  const originalToDisplay = new Map();
  for (const opt of options) {
    originalToDisplay.set(opt.originalIndex, opt.displayIndex);
  }
  return {
    options,
    displayToOriginal,
    originalToDisplay
  };
}

/**
 * Shuffles complete option objects while preserving original identity & metadata.
 */
export function createShuffledOptions(rawOptions = [], rng = unbiasedRandomInt) {
  if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
    return buildShuffleResult([]);
  }
  const normalized = normalizeRawOptions(rawOptions);
  const shuffled = fisherYatesShuffle(normalized, rng);
  return buildShuffleResult(shuffled);
}

function isValidPermutation(perm, length) {
  if (!Array.isArray(perm) || perm.length !== length) return false;
  const seen = new Set();
  for (const v of perm) {
    if (!Number.isInteger(v) || v < 0 || v >= length || seen.has(v)) return false;
    seen.add(v);
  }
  return seen.size === length;
}

/**
 * Retrieves or creates an attempt-stable option ordering in sessionStorage so timers,
 * re-renders, option selections, and page refreshes never reshuffle active options.
 */
export function getOrCreateStableShuffle(storageKey, rawOptions = [], rng = unbiasedRandomInt) {
  if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
    return buildShuffleResult([]);
  }

  const normalized = normalizeRawOptions(rawOptions);

  if (storageKey && typeof sessionStorage !== 'undefined') {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const perm = JSON.parse(saved);
        if (isValidPermutation(perm, normalized.length)) {
          const ordered = perm.map(origIdx => normalized[origIdx]);
          return buildShuffleResult(ordered);
        }
      }
    } catch { }
  }

  const result = createShuffledOptions(normalized, rng);

  if (storageKey && typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(result.displayToOriginal));
    } catch { }
  }

  return result;
}

/**
 * Clears cached shuffles matching a prefix (e.g., when retrying a quiz or starting fresh).
 */
export function clearStableShufflesByPrefix(prefix) {
  if (!prefix || typeof sessionStorage === 'undefined') return;
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    for (const k of keys) sessionStorage.removeItem(k);
  } catch { }
}

/**
 * Translates a displayed UI choice index (0..3) back to the original canonical option index.
 */
export function toOriginalIndex(shuffle, displayIndex) {
  if (!Number.isInteger(displayIndex)) return displayIndex;
  if (!shuffle || !Array.isArray(shuffle.displayToOriginal)) return displayIndex;
  const mapped = shuffle.displayToOriginal[displayIndex];
  return Number.isInteger(mapped) ? mapped : displayIndex;
}

/**
 * Translates a canonical option index from server validation back to its displayed index (0..3).
 */
export function toDisplayIndex(shuffle, originalIndex) {
  if (!Number.isInteger(originalIndex)) return originalIndex;
  if (!shuffle || !(shuffle.originalToDisplay instanceof Map)) return originalIndex;
  const mapped = shuffle.originalToDisplay.get(originalIndex);
  return Number.isInteger(mapped) ? mapped : originalIndex;
}

/**
 * Lightweight internal position distribution analytics for auditing balance across A/B/C/D.
 */
export function recordCorrectPositionMetric(displayIndex) {
  if (Number.isInteger(displayIndex) && displayIndex >= 0 && displayIndex < 4) {
    distributionStats.counts[displayIndex] += 1;
    distributionStats.total += 1;
  }
}

export function getShuffleDistributionStats() {
  const [a, b, c, d] = distributionStats.counts;
  return {
    total: distributionStats.total,
    A: a,
    B: b,
    C: c,
    D: d
  };
}
