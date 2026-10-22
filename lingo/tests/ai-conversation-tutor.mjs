import assert from 'node:assert/strict';

const root = 'http://localhost:3000';
const apiRoot = root + '/api';

async function request(endpoint, body, token, method) {
  const response = await fetch(apiRoot + endpoint, {
    method: method || (body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

console.log('========================================================================');
console.log('--- AI CONVERSATION TUTOR COMPREHENSIVE VERIFICATION SUITE ---');
console.log('========================================================================\n');

// 1. Setup Test User
const username = 'tutor_' + Date.now().toString().slice(-8);
const signup = await request('/auth/signup', { username, name: 'Tutor Student', password: 'Password123' });
assert.equal(signup.status, 200, 'Signup should succeed');
const token = signup.data.token;
assert.ok(token, 'Valid JWT token returned');
console.log(`[PASS] 1. Test user authenticated: ${username}`);

// 2. AI Status and Secret Protection
const statusRes = await request('/ai/status');
assert.equal(statusRes.status, 200, 'Status endpoint returns 200');
assert.equal(typeof statusRes.data.configured, 'boolean');
assert.equal(statusRes.data.provider, 'gemini');
assert.equal(statusRes.data.apiKey, undefined, 'API key must never be exposed');
const rawStatusString = JSON.stringify(statusRes.data);
assert.ok(!rawStatusString.toLowerCase().includes('aiza'), 'No API key fragment in status response');
console.log(`[PASS] 2. /api/ai/status verified (configured: ${statusRes.data.configured}, model: ${statusRes.data.model}, key seclusion verified)`);

// 3. Input Validation and Auth Security
const unauthRes = await request('/ai/conversation', { scenarioId: 'conv_cafe_01', userMessage: 'Hi' });
assert.equal(unauthRes.status, 401, 'Unauthenticated request rejected with 401');

const emptyRes = await request('/ai/conversation', { scenarioId: 'conv_cafe_01', userMessage: '   ' }, token);
assert.equal(emptyRes.status, 400, 'Empty userMessage rejected with 400');

const overlongRes = await request('/ai/conversation', { scenarioId: 'conv_cafe_01', userMessage: 'X'.repeat(501) }, token);
assert.equal(overlongRes.status, 400, 'Overlong message (>500 chars) rejected with 400');
console.log('[PASS] 3. Security & input validation verified (401 unauthenticated, 400 empty, 400 >500 chars)');

// 4. Live / Graceful Conversational Response (Cafe Scenario - A2)
console.log('\n--- Testing Conversational Response (Turn 1: Typed Order) ---');
const turn1Res = await request('/ai/conversation', {
  scenarioId: 'conv_cafe_01',
  userMessage: 'Hello Charlie! I would like to order a large latte with oat milk, please.',
  history: [
    { role: 'assistant', content: 'Good morning! Welcome to Oak & Bean Cafe. What can I brew for you today?' }
  ],
  level: 'A2'
}, token);

assert.equal(turn1Res.status, 200, 'Conversation turn should return 200');
assert.ok(turn1Res.data.reply, 'Should return non-empty reply');
assert.ok(turn1Res.data.reply.length > 5, 'Reply should be meaningful');
assert.ok(['gemini', 'fallback'].includes(turn1Res.data.source), 'Source must be gemini or fallback');
if (turn1Res.data.source === 'gemini') {
  console.log(`[PASS] 4. Live Gemini AI Turn 1:`);
} else {
  console.log(`[PASS] 4. Guided Fallback Turn 1 (Quota exceeded gracefully handled):`);
}
console.log(`   Partner reply: "${turn1Res.data.reply}"`);
console.log(`   Source: ${turn1Res.data.source} (${turn1Res.data.model || 'guided'})`);

// 5. Suggested Reply Usage
console.log('\n--- Testing Suggested Reply ---');
const suggestedReply = 'Do you have any vegan pastries available today?';
const turn2Res = await request('/ai/conversation', {
  scenarioId: 'conv_cafe_01',
  userMessage: suggestedReply,
  history: [
    { role: 'assistant', content: 'Good morning! Welcome to Oak & Bean Cafe. What can I brew for you today?' },
    { role: 'user', content: 'Hello Charlie! I would like to order a large latte with oat milk, please.' },
    { role: 'assistant', content: turn1Res.data.reply }
  ],
  level: 'A2'
}, token);

assert.equal(turn2Res.status, 200);
assert.ok(turn2Res.data.reply);
console.log(`[PASS] 5. Suggested reply processed seamlessly:`);
console.log(`   User said: "${suggestedReply}"`);
console.log(`   Partner reply: "${turn2Res.data.reply}"`);

// 6. Routine Mock Tests (Testing All Requirements Deterministically)
console.log('\n--- Routine Mock Testing: Live AI Simulation ---');
await request('/test/set-ai-convo-mock', {
  mockType: 'success',
  reply: 'Certainly! A large latte with oat milk and a vegan blueberry muffin comes to $8.50. Will you be paying by card or cash?',
  grammarCorrection: 'Tip: Say "I would like" rather than "I wants" when making polite requests.',
  vocabularyTips: [
    { term: 'oat milk', definition: 'a plant-based milk alternative made from oats' },
    { term: 'receipt', definition: 'a written acknowledgment that a specified article or sum of money has been received' }
  ]
}, null, 'POST');

const mockTurnRes = await request('/ai/conversation', {
  scenarioId: 'conv_cafe_01',
  userMessage: 'I wants two coffee please',
  history: [
    { role: 'assistant', content: 'Good morning! Welcome to Oak & Bean Cafe. What can I brew for you today?' }
  ],
  level: 'A2'
}, token);

assert.equal(mockTurnRes.status, 200);
assert.equal(mockTurnRes.data.source, 'gemini');
assert.equal(mockTurnRes.data.isFallback, undefined);
assert.ok(mockTurnRes.data.grammarCorrection.includes('I would like'));
assert.equal(mockTurnRes.data.vocabularyTips.length, 2);
console.log('[PASS] 6. Mocked Live Gemini turn verified:');
console.log(`   Partner reply: "${mockTurnRes.data.reply}"`);
console.log(`   Grammar feedback: "${mockTurnRes.data.grammarCorrection}"`);
console.log(`   Vocabulary tips: ${mockTurnRes.data.vocabularyTips.length} tips provided`);

// 7. Multi-Turn Context Retention with CEFR Levels
console.log('\n--- Routine Mock Testing: CEFR Level B2 Hotel Check-In ---');
await request('/test/set-ai-convo-mock', {
  mockType: 'success',
  reply: 'Welcome, Mr. Doe. We have your executive suite ready on the fourteenth floor overlooking the harbor. May I present your keycards?',
  grammarCorrection: null,
  vocabularyTips: [
    { term: 'executive suite', definition: 'a premium collection of hotel rooms with dedicated workspace' },
    { term: 'keycard', definition: 'a plastic card containing digital encoded data to unlock doors' }
  ]
}, null, 'POST');

const hotelRes = await request('/ai/conversation', {
  scenarioId: 'conv_hotel_01',
  userMessage: 'Good evening! I have an executive reservation under John Doe.',
  history: [
    { role: 'assistant', content: 'Good evening, welcome to the Grand View Hotel. How may I assist you tonight?' }
  ],
  level: 'B2'
}, token);

assert.equal(hotelRes.status, 200);
assert.equal(hotelRes.data.source, 'gemini');
assert.ok(hotelRes.data.reply.includes('executive suite'));
console.log(`[PASS] 7. Switched to Hotel scenario with CEFR B2:`);
console.log(`   Partner (Maya): "${hotelRes.data.reply}"`);

// 8. Guided Fallback Behavior & Distinction (Mocking AI Quota / Network Failure)
console.log('\n--- Routine Mock Testing: Guided Fallback on AI Failure ---');
await request('/test/set-ai-convo-mock', {
  mockType: 'error',
  errorStatus: 429,
  errorMessage: 'Resource has been exhausted (quota limit reached).'
}, null, 'POST');

const fallbackRes = await request('/ai/conversation', {
  scenarioId: 'conv_cafe_01',
  userMessage: 'Could you recommend something refreshing?',
  history: [
    { role: 'assistant', content: 'Good morning! Welcome to Oak & Bean Cafe. What can I brew for you today?' }
  ],
  level: 'A2'
}, token);

assert.equal(fallbackRes.status, 200, 'Server must return 200 with fallback rather than crashing');
assert.equal(fallbackRes.data.source, 'fallback', 'Source MUST explicitly be "fallback", never claiming live AI');
assert.equal(fallbackRes.data.isFallback, true);
assert.ok(fallbackRes.data.reply.length > 5, 'Must provide in-character fallback reply');
assert.ok(fallbackRes.data.fallbackReason.includes('Rate limit'), 'Reason indicates rate limit exceeded');
console.log(`[PASS] 8. Fallback behavior verified:`);
console.log(`   Fallback response: "${fallbackRes.data.reply}"`);
console.log(`   Source: ${fallbackRes.data.source} (isFallback: ${fallbackRes.data.isFallback})`);
console.log(`   Fallback reason: ${fallbackRes.data.fallbackReason}`);

// Clear mock to restore live provider
await request('/test/clear-ai-convo-mock', {}, null, 'POST');
console.log('   Cleared test mock. Live AI restored.');

// 9. Play & Learn Question Generation Regression
console.log('\n--- Testing Play & Learn AI Question Generation Regression ---');
// 9.1 Suggested topic creation (curated catalog fallback)
const suggestedTopicRes = await request('/games', {
  topic: 'Daily Conversation',
  difficulty: 'Intermediate',
  duration: 3
}, token);
assert.equal(suggestedTopicRes.status, 200);
assert.ok(suggestedTopicRes.data.code);
await request(`/games/${suggestedTopicRes.data.code}/leave`, {}, token);
console.log('[PASS] 9.1 Suggested topic multiplayer game lobby created successfully');

// 9.2 Custom topic creation (Gemini question generator with mock)
const mockQ = (prompt) => ({
  prompt,
  options: ['Option A', 'Option B', 'Option C', 'Option D'],
  correctIndex: 0,
  explanation: 'Standard professional business phrasing.'
});
await request('/test/set-ai-mock', {
  questions: Array.from({ length: 9 }, (_, i) => mockQ(`Business negotiation question ${i + 1}`))
});
const customTopicRes = await request('/games', {
  topic: 'Business Negotiations',
  difficulty: 'Intermediate',
  duration: 3,
  isCustomTopic: true
}, token);
assert.equal(customTopicRes.status, 200);
assert.ok(customTopicRes.data.code);
await request(`/games/${customTopicRes.data.code}/leave`, {}, token);
await request('/test/clear-ai-mock', {});
console.log('[PASS] 9.2 Custom topic AI game creation intact and functional');

console.log('\n========================================================================');
console.log('🎉 ALL AI CONVERSATION TUTOR TESTS PASSED WITH 100% SUCCESS!');
console.log('========================================================================\n');
