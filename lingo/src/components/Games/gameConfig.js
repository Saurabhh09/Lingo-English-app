/**
 * gameConfig.js
 *
 * Phase 2 Game-Creation Configuration Model & API Compatibility Layer.
 * Defines game modes, CEFR levels, suggested/custom topics, durations,
 * question counts, host roles, validation routines, and mapping to current backend.
 */

export const GAME_MODES = [
  {
    id: 'solo',
    label: 'Solo',
    tagline: 'Single Player',
    description: 'Play independently without creating a room.',
    badge: 'Focused practice',
    icon: 'User',
  },
  {
    id: 'friends',
    label: 'Friends',
    tagline: 'Multiplayer Lobby',
    description: 'Create a room and invite friends using a code.',
    badge: 'Up to 100 players',
    icon: 'Users',
  },
];

export const CEFR_LEVELS = [
  {
    id: 'Pre-A1',
    label: 'Pre-A1',
    title: 'First Steps',
    description: 'Simple everyday words, numbers, and basic symbols.',
    color: '#8da96b',
    backendDifficulty: 'Beginner',
  },
  {
    id: 'A1',
    label: 'A1',
    title: 'Beginner',
    description: 'Basic phrases and familiar everyday expressions.',
    color: '#627b4e',
    backendDifficulty: 'Beginner',
  },
  {
    id: 'A2',
    label: 'A2',
    title: 'Elementary',
    description: 'Routine interactions, family, shopping, and surroundings.',
    color: '#557242',
    backendDifficulty: 'Beginner',
  },
  {
    id: 'B1',
    label: 'B1',
    title: 'Intermediate',
    description: 'Standard work, school, and leisure topics in travel.',
    color: '#7c6d8e',
    backendDifficulty: 'Intermediate',
  },
  {
    id: 'B2',
    label: 'B2',
    title: 'Upper-Intermediate',
    description: 'Complex technical texts and spontaneous discussions.',
    color: '#5c4e70',
    backendDifficulty: 'Intermediate',
  },
  {
    id: 'C1',
    label: 'C1',
    title: 'Advanced',
    description: 'Flexible, fluent, and nuanced expression across contexts.',
    color: '#c27d38',
    backendDifficulty: 'Advanced',
  },
  {
    id: 'C2',
    label: 'C2',
    title: 'Mastery',
    description: 'Effortless native-level precision and complex semantics.',
    color: '#9d5a45',
    backendDifficulty: 'Advanced',
  },
];

export const SUGGESTED_TOPICS = [
  {
    id: 'Mixed English',
    label: 'Mixed English',
    icon: '✨',
    description: 'Balanced variety across grammar, vocabulary, and culture.',
    backendTopic: 'Mixed English',
  },
  {
    id: 'Grammar',
    label: 'Grammar',
    icon: '🧩',
    description: 'Verb tenses, prepositions, and sentence structure.',
    backendTopic: 'Grammar',
  },
  {
    id: 'Vocabulary',
    label: 'Vocabulary',
    icon: '📖',
    description: 'Rich descriptive words, idioms, and synonyms.',
    backendTopic: 'Vocabulary',
  },
  {
    id: 'Daily conversation',
    label: 'Daily conversation',
    icon: '💬',
    description: 'Everyday dialogues, greetings, and casual phrasing.',
    backendTopic: 'Conversation',
  },
  {
    id: 'Business English',
    label: 'Business English',
    icon: '💼',
    description: 'Workplace emails, formal presentations, and negotiations.',
    backendTopic: 'Mixed English',
  },
  {
    id: 'Travel English',
    label: 'Travel English',
    icon: '✈️',
    description: 'Airports, hotels, transit, asking directions, and dining.',
    backendTopic: 'Food & drinks',
  },
  {
    id: 'Interview preparation',
    label: 'Interview preparation',
    icon: '🎯',
    description: 'Behavioral responses, career phrasing, and professional confidence.',
    backendTopic: 'Mixed English',
  },
];

export const DURATION_OPTIONS = [
  { value: 1, label: '1 minute', minutes: 1, backendValue: 1 },
  { value: 3, label: '3 minutes', minutes: 3, backendValue: 3 },
  { value: 5, label: '5 minutes', minutes: 5, backendValue: 5 },
  { value: 10, label: '10 minutes', minutes: 10, backendValue: 10 },
  { value: 15, label: '15 minutes', minutes: 15, backendValue: 10 },
  { value: 20, label: '20 minutes', minutes: 20, backendValue: 10 },
  { value: 'custom', label: 'Custom duration', minutes: null, backendValue: null },
];

export const QUESTION_COUNT_OPTIONS = [
  { value: 5, label: '5 questions', count: 5 },
  { value: 10, label: '10 questions', count: 10 },
  { value: 15, label: '15 questions', count: 15 },
  { value: 20, label: '20 questions', count: 20 },
  { value: 30, label: '30 questions', count: 30 },
  { value: 'custom', label: 'Custom count', count: null },
];

export const HOST_ROLES = [
  {
    id: 'player',
    title: 'Play with everyone',
    tagline: 'Participating host',
    description: 'The host participates as an active player, answers questions, and earns points.',
    icon: 'Gamepad2',
  },
  {
    id: 'spectator',
    title: 'Spectate',
    tagline: 'Observer only',
    description: 'The host does not participate in answering questions or earning points, but views the leaderboard and final results.',
    icon: 'Eye',
  },
];

export const DEFAULT_GAME_CONFIG = {
  mode: 'friends',
  cefrLevel: 'B1',
  topicType: 'suggested', // 'suggested' | 'custom'
  selectedTopic: 'Mixed English',
  customTopic: '',
  durationOption: 3,
  customDuration: 3,
  questionCountOption: 10,
  customQuestionCount: 10,
  hostRole: 'player', // 'player' | 'spectator'
};

/**
 * Validation rules and limits
 */
export const LIMITS = {
  CUSTOM_TOPIC_MIN_LEN: 2,
  CUSTOM_TOPIC_MAX_LEN: 50,
  CUSTOM_DURATION_MIN: 1,
  CUSTOM_DURATION_MAX: 60,
  CUSTOM_QUESTIONS_MIN: 3,
  CUSTOM_QUESTIONS_MAX: 50,
};

/**
 * Validates custom topic text.
 * Returns { valid: boolean, error: string | null }
 */
export function validateCustomTopic(topic) {
  if (typeof topic !== 'string') {
    return { valid: false, error: 'Custom topic must be a text value.' };
  }
  const trimmed = topic.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Please enter a topic name.' };
  }
  if (trimmed.length < LIMITS.CUSTOM_TOPIC_MIN_LEN) {
    return {
      valid: false,
      error: `Topic must be at least ${LIMITS.CUSTOM_TOPIC_MIN_LEN} characters.`,
    };
  }
  if (trimmed.length > LIMITS.CUSTOM_TOPIC_MAX_LEN) {
    return {
      valid: false,
      error: `Topic must be ${LIMITS.CUSTOM_TOPIC_MAX_LEN} characters or fewer.`,
    };
  }
  // Sanity check: allow letters, numbers, spaces, and safe punctuation
  if (!/^[\p{L}\p{N}\s\-.,'’&!?:()]+$/u.test(trimmed)) {
    return {
      valid: false,
      error: 'Topic contains special symbols that are not supported.',
    };
  }
  return { valid: true, error: null };
}

/**
 * Validates custom duration input.
 * Returns { valid: boolean, error: string | null, value: number }
 */
export function validateCustomDuration(duration) {
  const num = Number(duration);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return { valid: false, error: 'Duration must be a whole number of minutes.', value: null };
  }
  if (num < LIMITS.CUSTOM_DURATION_MIN || num > LIMITS.CUSTOM_DURATION_MAX) {
    return {
      valid: false,
      error: `Duration must be between ${LIMITS.CUSTOM_DURATION_MIN} and ${LIMITS.CUSTOM_DURATION_MAX} minutes.`,
      value: num,
    };
  }
  return { valid: true, error: null, value: num };
}

/**
 * Validates custom question count.
 * Returns { valid: boolean, error: string | null, value: number }
 */
export function validateCustomQuestionCount(count) {
  const num = Number(count);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return { valid: false, error: 'Question count must be a whole number.', value: null };
  }
  if (num < LIMITS.CUSTOM_QUESTIONS_MIN || num > LIMITS.CUSTOM_QUESTIONS_MAX) {
    return {
      valid: false,
      error: `Question count must be between ${LIMITS.CUSTOM_QUESTIONS_MIN} and ${LIMITS.CUSTOM_QUESTIONS_MAX}.`,
      value: num,
    };
  }
  return { valid: true, error: null, value: num };
}

/**
 * Validates full configuration state.
 * Returns { valid: boolean, errors: Record<string, string> }
 */
export function validateGameConfig(config) {
  const errors = {};

  if (!['solo', 'friends'].includes(config.mode)) {
    errors.mode = 'Please select a valid game mode (Solo or Friends).';
  }

  const cefrValid = CEFR_LEVELS.some(lvl => lvl.id === config.cefrLevel);
  if (!cefrValid) {
    errors.cefrLevel = 'Please select a valid CEFR level (Pre-A1 to C2).';
  }

  if (config.topicType === 'custom') {
    const topicRes = validateCustomTopic(config.customTopic);
    if (!topicRes.valid) {
      errors.customTopic = topicRes.error;
    }
  } else {
    const topicValid = SUGGESTED_TOPICS.some(t => t.id === config.selectedTopic);
    if (!topicValid) {
      errors.selectedTopic = 'Please select a valid suggested topic.';
    }
  }

  if (config.durationOption === 'custom') {
    const durRes = validateCustomDuration(config.customDuration);
    if (!durRes.valid) {
      errors.customDuration = durRes.error;
    }
  }

  if (config.questionCountOption === 'custom') {
    const countRes = validateCustomQuestionCount(config.customQuestionCount);
    if (!countRes.valid) {
      errors.customQuestionCount = countRes.error;
    }
  }

  if (config.mode === 'friends') {
    if (!['player', 'spectator'].includes(config.hostRole)) {
      errors.hostRole = 'Please choose a host participation role.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Maps the rich Phase 2 UI configuration safely to the current backend API contract.
 *
 * Current backend requires:
 *   difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
 *   topic: 'Mixed English' | 'Grammar' | 'Vocabulary' | 'Food & drinks' | 'Conversation'
 *   duration: 1 | 3 | 5 | 10
 *
 * Returns: {
 *   difficulty: string,
 *   topic: string,
 *   duration: number,
 *   configMetadata: object
 * }
 */
export function mapConfigToBackend(config) {
  // 1. CEFR Mapping
  const cefrItem = CEFR_LEVELS.find(l => l.id === config.cefrLevel);
  const mappedDifficulty = cefrItem ? cefrItem.backendDifficulty : 'Intermediate';

  // 2. Topic Mapping
  const isCustomTopic = config.topicType === 'custom';
  let mappedTopic = 'Mixed English';
  if (isCustomTopic) {
    mappedTopic = config.customTopic.trim() || 'Custom topic';
  } else {
    const topicItem = SUGGESTED_TOPICS.find(t => t.id === config.selectedTopic);
    if (topicItem) {
      mappedTopic = topicItem.backendTopic;
    }
  }

  // 3. Duration Mapping (backend strictly enforces 1, 3, 5, 10)
  let actualDurationMinutes;
  if (config.durationOption === 'custom') {
    actualDurationMinutes = Number(config.customDuration) || 3;
  } else {
    actualDurationMinutes = Number(config.durationOption) || 3;
  }

  // Clamped safe backend value
  let mappedDuration = 3;
  if (actualDurationMinutes <= 1) mappedDuration = 1;
  else if (actualDurationMinutes <= 3) mappedDuration = 3;
  else if (actualDurationMinutes <= 7) mappedDuration = 5;
  else mappedDuration = 10;

  // 4. Effective Question Count
  const actualQuestions = config.questionCountOption === 'custom'
    ? (Number(config.customQuestionCount) || 10)
    : Number(config.questionCountOption);

  return {
    difficulty: mappedDifficulty,
    cefrLevel: config.cefrLevel,
    topic: mappedTopic,
    customTopic: isCustomTopic ? mappedTopic : undefined,
    topicType: config.topicType,
    duration: mappedDuration,
    questionCount: actualQuestions,
    isCustomTopic,
    allowFallback: !isCustomTopic,
    // Preserve full rich configuration metadata for frontend state & subsequent phases
    metadata: {
      mode: config.mode,
      cefrLevel: config.cefrLevel,
      topicType: config.topicType,
      isCustomTopic,
      topicName: isCustomTopic ? config.customTopic.trim() : config.selectedTopic,
      targetDurationMinutes: actualDurationMinutes,
      targetQuestionCount: actualQuestions,
      hostRole: config.mode === 'friends' ? config.hostRole : 'player',
      allowFallback: !isCustomTopic,
      createdAt: Date.now(),
    },
  };
}
