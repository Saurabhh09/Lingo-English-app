/**
 * Lingo. Pronunciation & Speech Recognition Transcript Evaluator
 *
 * Evaluates spoken transcripts against reference target phrases.
 * NOTE: As documented, speech recognition transcript similarity measures recognized lexical tokens,
 * NOT acoustic/phonetic articulation accuracy. This module provides objective, honest feedback
 * without fabricating acoustic phoneme scores.
 */

export function normalizeText(text) {
  if (typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Evaluates a spoken transcript against a target phrase.
 */
export function evaluatePronunciation(targetPhrase, spokenTranscript) {
  if (typeof targetPhrase !== 'string' || !targetPhrase.trim()) {
    throw new Error('Target phrase is required.');
  }

  const cleanTarget = normalizeText(targetPhrase);
  const cleanSpoken = normalizeText(spokenTranscript || '');

  const targetWords = cleanTarget.split(' ').filter(Boolean);
  const spokenWords = cleanSpoken.split(' ').filter(Boolean);

  if (targetWords.length === 0) {
    throw new Error('Invalid target phrase.');
  }

  // Check word-by-word alignment
  const wordDetails = targetWords.map((word, idx) => {
    // Check if word appears in spoken words
    const exactMatch = spokenWords.includes(word);
    
    // Check if a fuzzy match (1 edit distance for words > 3 chars) is present
    let fuzzyMatch = false;
    if (!exactMatch) {
      fuzzyMatch = spokenWords.some(sw => {
        if (Math.abs(sw.length - word.length) > 2) return false;
        const dist = levenshteinDistance(word, sw);
        return dist === 1;
      });
    }

    return {
      word,
      index: idx,
      matched: exactMatch || fuzzyMatch,
      status: exactMatch ? 'exact' : fuzzyMatch ? 'close' : 'missing'
    };
  });

  const matchedCount = wordDetails.filter(w => w.matched).length;
  const wordAccuracy = Math.round((matchedCount / targetWords.length) * 100);

  // String level similarity
  const maxLen = Math.max(cleanTarget.length, cleanSpoken.length);
  const charDistance = levenshteinDistance(cleanTarget, cleanSpoken);
  const stringSimilarity = maxLen === 0 ? 100 : Math.max(0, Math.round((1 - charDistance / maxLen) * 100));

  // Weighted overall transcript recognition score
  const transcriptScore = Math.round((wordAccuracy * 0.7) + (stringSimilarity * 0.3));

  let assessment = 'needs_practice';
  let message = 'Keep practicing! Focus on pronouncing each word clearly.';

  if (transcriptScore >= 90) {
    assessment = 'excellent';
    message = 'Brilliant clarity! The speech recognizer captured all target words accurately.';
  } else if (transcriptScore >= 70) {
    assessment = 'good';
    message = 'Good effort! Most target words were recognized correctly.';
  }

  const missingWords = wordDetails.filter(w => !w.matched).map(w => w.word);

  return {
    targetPhrase,
    spokenTranscript: cleanSpoken,
    score: transcriptScore,
    wordAccuracy,
    stringSimilarity,
    assessment,
    message,
    words: wordDetails,
    missingWords,
    passed: transcriptScore >= 70,
    disclaimer: 'Speech recognition transcript comparison. Evaluates word-level recognition accuracy, not acoustic phoneme articulation.'
  };
}
