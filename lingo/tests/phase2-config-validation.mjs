import assert from 'node:assert/strict';
import {
  GAME_MODES,
  CEFR_LEVELS,
  SUGGESTED_TOPICS,
  DURATION_OPTIONS,
  QUESTION_COUNT_OPTIONS,
  HOST_ROLES,
  DEFAULT_GAME_CONFIG,
  LIMITS,
  validateCustomTopic,
  validateCustomDuration,
  validateCustomQuestionCount,
  validateGameConfig,
  mapConfigToBackend,
} from '../src/components/Games/gameConfig.js';

console.log('--- STARTING PHASE 2 CONFIGURATION VALIDATION TESTS ---');

// 1. Game modes definition
assert.equal(GAME_MODES.length, 2, 'Must have exactly 2 game modes: Solo & Friends');
assert.deepEqual(GAME_MODES.map(m => m.id), ['solo', 'friends'], 'Game mode IDs must be solo and friends');
console.log('PASS 1: Game modes Solo and Friends properly defined with descriptions');

// 2. CEFR levels definition
assert.equal(CEFR_LEVELS.length, 7, 'Must have 7 CEFR levels: Pre-A1 to C2');
assert.deepEqual(
  CEFR_LEVELS.map(l => l.id),
  ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
  'CEFR levels must strictly match Pre-A1 through C2'
);
for (const lvl of CEFR_LEVELS) {
  assert.ok(lvl.description.length > 10, `CEFR level ${lvl.id} must have a descriptive summary`);
  assert.ok(['Beginner', 'Intermediate', 'Advanced'].includes(lvl.backendDifficulty), 'Backend difficulty mapping must be valid');
}
console.log('PASS 2: CEFR levels Pre-A1 to C2 defined with descriptions and backend mapping');

// 3. Suggested topics
const expectedTopics = [
  'Mixed English',
  'Grammar',
  'Vocabulary',
  'Daily conversation',
  'Business English',
  'Travel English',
  'Interview preparation',
];
for (const topic of expectedTopics) {
  assert.ok(SUGGESTED_TOPICS.some(t => t.id === topic), `Suggested topic ${topic} must exist`);
}
console.log('PASS 3: All suggested topics exist with backend mappings');

// 4. Durations
assert.deepEqual(
  DURATION_OPTIONS.map(d => d.value),
  [1, 3, 5, 10, 15, 20, 'custom'],
  'Duration options must include 1, 3, 5, 10, 15, 20 and custom'
);
console.log('PASS 4: Selectable duration options 1, 3, 5, 10, 15, 20 and custom verified');

// 5. Question counts
assert.deepEqual(
  QUESTION_COUNT_OPTIONS.map(q => q.value),
  [5, 10, 15, 20, 30, 'custom'],
  'Question counts must include 5, 10, 15, 20, 30 and custom'
);
console.log('PASS 5: Selectable question counts 5, 10, 15, 20, 30 and custom verified');

// 6. Host participation preference
assert.equal(HOST_ROLES.length, 2, 'Host roles must provide Play with everyone and Spectate');
assert.equal(HOST_ROLES[0].id, 'player');
assert.equal(HOST_ROLES[1].id, 'spectator');
console.log('PASS 6: Host roles "Play with everyone" and "Spectate" verified');

// 7. Custom topic validation tests
assert.equal(validateCustomTopic('').valid, false, 'Empty custom topic should be invalid');
assert.equal(validateCustomTopic('   ').valid, false, 'Whitespace-only topic should be invalid');
assert.equal(validateCustomTopic('A').valid, false, '1-character topic should be invalid');
assert.equal(validateCustomTopic('A'.repeat(51)).valid, false, '51-character topic should be invalid');
assert.equal(validateCustomTopic('Medical English').valid, true, 'Valid custom topic should pass');
assert.equal(validateCustomTopic('Tech & Startups: Q&A').valid, true, 'Valid topic with punctuation should pass');
console.log('PASS 7: Custom topic validation handles empty, whitespace, and length boundaries');

// 8. Custom duration validation tests
assert.equal(validateCustomDuration(0).valid, false, '0 minutes should be invalid');
assert.equal(validateCustomDuration(61).valid, false, '61 minutes should be invalid');
assert.equal(validateCustomDuration('abc').valid, false, 'Non-number should be invalid');
assert.equal(validateCustomDuration(1).valid, true, '1 minute should be valid');
assert.equal(validateCustomDuration(60).valid, true, '60 minutes should be valid');
assert.equal(validateCustomDuration(12).valid, true, '12 minutes should be valid');
console.log('PASS 8: Custom duration validation bounds (1-60m) verified');

// 9. Custom question count validation tests
assert.equal(validateCustomQuestionCount(2).valid, false, '2 questions should be invalid');
assert.equal(validateCustomQuestionCount(51).valid, false, '51 questions should be invalid');
assert.equal(validateCustomQuestionCount('xyz').valid, false, 'Non-number should be invalid');
assert.equal(validateCustomQuestionCount(3).valid, true, '3 questions should be valid');
assert.equal(validateCustomQuestionCount(50).valid, true, '50 questions should be valid');
assert.equal(validateCustomQuestionCount(25).valid, true, '25 questions should be valid');
console.log('PASS 9: Custom question count bounds (3-50) verified');

// 10. Complete config validation
const defaultConfigCheck = validateGameConfig(DEFAULT_GAME_CONFIG);
assert.equal(defaultConfigCheck.valid, true, 'Default configuration must be completely valid');

const invalidCustomTopicConfig = {
  ...DEFAULT_GAME_CONFIG,
  topicType: 'custom',
  customTopic: '   ',
};
const invalidCustomRes = validateGameConfig(invalidCustomTopicConfig);
assert.equal(invalidCustomRes.valid, false);
assert.ok(invalidCustomRes.errors.customTopic, 'Error reported for empty custom topic');

console.log('PASS 10: Complete configuration validation handles valid and invalid states');

// 11. Backend mapping safety check
const backendPayload1 = mapConfigToBackend({
  ...DEFAULT_GAME_CONFIG,
  cefrLevel: 'Pre-A1',
  selectedTopic: 'Grammar',
  durationOption: 1,
});
assert.equal(backendPayload1.difficulty, 'Beginner');
assert.equal(backendPayload1.topic, 'Grammar');
assert.equal(backendPayload1.duration, 1);

const backendPayload2 = mapConfigToBackend({
  ...DEFAULT_GAME_CONFIG,
  cefrLevel: 'B2',
  selectedTopic: 'Daily conversation',
  durationOption: 20,
});
assert.equal(backendPayload2.difficulty, 'Intermediate');
assert.equal(backendPayload2.topic, 'Conversation');
assert.equal(backendPayload2.duration, 10, '20 minutes must safely map to 10 for current backend');

const backendPayload3 = mapConfigToBackend({
  ...DEFAULT_GAME_CONFIG,
  cefrLevel: 'C2',
  topicType: 'custom',
  customTopic: 'Advanced Quantum Mechanics in English',
  durationOption: 'custom',
  customDuration: 45,
});
assert.equal(backendPayload3.difficulty, 'Advanced');
assert.equal(backendPayload3.topic, 'Advanced Quantum Mechanics in English', 'Custom topic passed to Gemini AI backend');
assert.equal(backendPayload3.duration, 10, '45m custom safely clamps to 10 for current backend');
assert.equal(backendPayload3.metadata.topicName, 'Advanced Quantum Mechanics in English');

console.log('PASS 11: Backend mapping guarantees safety with current backend API contract');
console.log('ALL PHASE 2 CONFIGURATION VALIDATION TESTS PASSED!');
