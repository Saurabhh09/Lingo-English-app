import assert from 'node:assert/strict';
import { evaluatePronunciation } from '../server/pronunciationEvaluator.mjs';
import { getAIStatus, sendAIConversationTurn } from '../server/aiProvider.mjs';
import { CURRICULUM_CATALOG } from '../server/curriculumCatalog.mjs';
import { validateCurriculumCatalog } from '../server/curriculumValidator.mjs';

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
console.log('--- PHASE 11: LISTENING, SPEAKING, PRONUNCIATION & AI VERIFICATION ---');
console.log('========================================================================');

// Setup test user
const username = 'p11_' + Date.now().toString().slice(-10);
const signup = await request('/auth/signup', { username, name: 'Phase11 Explorer', password: 'Password123' });
assert.equal(signup.status, 200, 'Signup should succeed');
const token = signup.data.token;
assert.ok(token, 'Session token should be returned');

// -------------------------------------------------------------
// SECTION A: LISTENING COMPREHENSION
// -------------------------------------------------------------
console.log('\n[SECTION A: LISTENING COMPREHENSION]');

// A1: Practice catalog endpoint returns listening modules
const catalogRes = await request('/practice/catalog');
assert.equal(catalogRes.status, 200, 'Catalog endpoint must return 200');
const { listening, speaking, pronunciation, scenarios } = catalogRes.data;
assert.ok(Array.isArray(listening) && listening.length >= 9, 'Should have at least 9 listening modules');

// A2: Verify coverage across all 7 CEFR levels (Pre-A1 to C2)
const cefrLevels = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const coveredLevels = new Set(listening.map(m => m.level));
for (const level of cefrLevels) {
  assert.ok(coveredLevels.has(level), `Listening exercises must cover CEFR level: ${level}`);
}
console.log('✓ All 7 CEFR levels (Pre-A1 through C2) covered in listening catalog');

// A3: Verify each listening audio file exists and is served via HTTP 200 with audio/wav
for (const item of listening) {
  assert.ok(item.audioUrl, `Module ${item.id} must define audioUrl`);
  const audioRes = await fetch(root + item.audioUrl);
  assert.equal(audioRes.status, 200, `Audio URL ${item.audioUrl} must return HTTP 200`);
  const contentType = audioRes.headers.get('content-type');
  assert.ok(contentType && contentType.includes('audio'), `Audio URL ${item.audioUrl} must have audio content-type`);
  const buffer = await audioRes.arrayBuffer();
  assert.ok(buffer.byteLength > 20000, `Audio file ${item.audioUrl} must be real audio (>20KB), got ${buffer.byteLength} bytes`);
}
console.log('✓ All 9 listening audio files verified (HTTP 200, audio/wav, >20KB)');

// A4: Answer keys strictly secluded from public catalog
for (const mod of listening) {
  assert.equal(mod.questions.some(q => q.correctIndex !== undefined || q.solutionKey !== undefined), false,
    'Public catalog must NEVER leak correctIndex or solutionKey');
}
console.log('✓ Solution keys strictly secluded from client catalog');

// A5: Evaluation & scoring on server
const testMod = listening[0];
const evaluateRes = await request('/practice/listening/submit', {
  moduleId: testMod.id,
  answers: [0, 1, 0] // answering 3 questions
}, token);
assert.equal(evaluateRes.status, 200, 'Listening submission must return 200');
assert.equal(evaluateRes.data.total, 3);
assert.equal(evaluateRes.data.correct, 3);
assert.equal(evaluateRes.data.passed, true);
assert.equal(evaluateRes.data.earned, 25, 'First-time completion should award 25 XP');

// A6: Idempotent XP award on repeat submission
const repeatRes = await request('/practice/listening/submit', {
  moduleId: testMod.id,
  answers: [0, 1, 0]
}, token);
assert.equal(repeatRes.status, 200);
assert.equal(repeatRes.data.earned, 0, 'Repeat submission must award 0 XP (idempotency)');
console.log('✓ Listening evaluation and XP award idempotency verified');

// A7: Input validation
assert.equal((await request('/practice/listening/submit', { moduleId: 'nonexistent', answers: [0, 1, 0] }, token)).status, 404);
assert.equal((await request('/practice/listening/submit', { moduleId: testMod.id, answers: 'invalid' }, token)).status, 400);
assert.equal((await request('/practice/listening/submit', { moduleId: testMod.id, answers: [0] }, token)).status, 400); // wrong question count
console.log('✓ Listening submission input validation verified');

// -------------------------------------------------------------
// SECTION B: SPEAKING PRACTICE
// -------------------------------------------------------------
console.log('\n[SECTION B: SPEAKING PRACTICE]');

// B1: Speaking prompts present in catalog
assert.ok(Array.isArray(speaking) && speaking.length >= 4, 'Should have at least 4 speaking prompts');
const speakPrompt = speaking[0];
assert.ok(speakPrompt.title && speakPrompt.objective && speakPrompt.minWords);

// B2: Submission with insufficient word count is rejected
const shortRes = await request('/practice/speaking/submit', {
  promptId: speakPrompt.id,
  transcript: 'Hello there.'
}, token);
assert.equal(shortRes.status, 400, 'Submission below minWords must return 400');
assert.match(shortRes.data.error, /must contain at least/);

// B3: Valid submission meeting minimum words succeeds and awards XP
const validSpeakingText = 'Hello! My name is Alex. I am a software engineer living in the city and I really love learning languages and traveling to new places.';
const speakSuccess = await request('/practice/speaking/submit', {
  promptId: speakPrompt.id,
  transcript: validSpeakingText
}, token);
assert.equal(speakSuccess.status, 200, 'Valid speaking submission must return 200');
assert.equal(speakSuccess.data.earned, 30, 'First speaking practice must award 30 XP');
assert.equal(speakSuccess.data.wordCount >= speakPrompt.minWords, true);

// B4: Idempotency on speaking repeat
const speakRepeat = await request('/practice/speaking/submit', {
  promptId: speakPrompt.id,
  transcript: validSpeakingText
}, token);
assert.equal(speakRepeat.status, 200);
assert.equal(speakRepeat.data.earned, 0, 'Repeat speaking practice must award 0 XP');
console.log('✓ Speaking validation, word count enforcement, and XP idempotency verified');

// -------------------------------------------------------------
// SECTION C: PRONUNCIATION FEEDBACK
// -------------------------------------------------------------
console.log('\n[SECTION C: PRONUNCIATION FEEDBACK]');

// C1: Pronunciation targets in catalog with reference audio
assert.ok(Array.isArray(pronunciation) && pronunciation.length >= 6, 'Should have at least 6 pronunciation targets');
for (const p of pronunciation) {
  assert.ok(p.targetPhrase && p.referenceAudioUrl && p.phonetic);
  const audioCheck = await fetch(root + p.referenceAudioUrl);
  assert.equal(audioCheck.status, 200, `Pronunciation audio ${p.referenceAudioUrl} must return 200`);
}
console.log('✓ All 6 pronunciation reference audio files verified via HTTP 200');

// C2: Server-side pronunciation evaluator unit test
const targetPhrase = 'Could I please have a cup of coffee with oat milk?';

// C2.1: Exact match
const exactEval = evaluatePronunciation(targetPhrase, 'Could I please have a cup of coffee with oat milk?');
assert.equal(exactEval.score, 100, 'Exact match must return 100%');
assert.equal(exactEval.words.every(f => f.status === 'exact'), true, 'All tokens should be exact');
assert.ok(exactEval.disclaimer, 'Evaluation MUST contain explicit disclaimer');

// C2.2: Partial / close match
const closeEval = evaluatePronunciation(targetPhrase, 'Can I please have a cup of coffee with oat milk?');
assert.ok(closeEval.score >= 80 && closeEval.score < 100, `Close match score should be 80-99%, got ${closeEval.score}`);
assert.ok(closeEval.words.some(f => f.status === 'close' || f.status === 'missing'));

// C2.3: Inaccurate match
const poorEval = evaluatePronunciation(targetPhrase, 'The weather is very sunny today.');
assert.ok(poorEval.score < 40, `Completely different sentence should score < 40%, got ${poorEval.score}`);
console.log('✓ Levenshtein pronunciation token evaluator verified across exact, partial, and inaccurate inputs');

// C3: Pronunciation evaluation endpoint
const apiEval = await request('/pronunciation/evaluate', {
  targetPhrase,
  spokenText: 'Could I please have a cup of coffee with oat milk?'
}, token);
assert.equal(apiEval.status, 200);
assert.equal(apiEval.data.score, 100);
assert.match(apiEval.data.disclaimer, /transcript comparison/i);

// C4: Pronunciation practice submission with XP award
const pronSubmit = await request('/practice/pronunciation/submit', {
  itemId: pronunciation[0].id,
  transcript: pronunciation[0].targetPhrase
}, token);
assert.equal(pronSubmit.status, 200);
assert.equal(pronSubmit.data.earned, 20, 'First-time pronunciation submission awards 20 XP');

// C5: Idempotency
const pronRepeat = await request('/practice/pronunciation/submit', {
  itemId: pronunciation[0].id,
  transcript: pronunciation[0].targetPhrase
}, token);
assert.equal(pronRepeat.status, 200);
assert.equal(pronRepeat.data.earned, 0, 'Repeat pronunciation submission awards 0 XP');
console.log('✓ Pronunciation endpoint and disclaimer verified');

// -------------------------------------------------------------
// SECTION D: AI-ASSISTED CONVERSATION
// -------------------------------------------------------------
console.log('\n[SECTION D: AI CONVERSATION]');

// D1: Status endpoint reveals provider readiness without leaking keys
const aiStatus = await request('/ai/status');
assert.equal(aiStatus.status, 200);
assert.equal(typeof aiStatus.data.configured, 'boolean');
assert.ok(aiStatus.data.provider === null || typeof aiStatus.data.provider === 'string');
assert.equal(aiStatus.data.apiKey, undefined, 'API key must NEVER be exposed in status payload');
console.log(`✓ AI status endpoint working (Configured: ${aiStatus.data.configured}, Provider: ${aiStatus.data.provider})`);

// D2: Unconfigured AI handles gracefully (returns 503 + setup instructions, no crashes)
if (!aiStatus.data.configured) {
  const unconfiguredChat = await request('/ai/conversation', {
    scenarioId: 'conv_cafe_01',
    userMessage: 'Hello, what drinks do you have?'
  }, token);
  assert.equal(unconfiguredChat.status, 503, 'Unconfigured AI must return HTTP 503');
  assert.ok(unconfiguredChat.data.error, 'Must provide setup message');
  console.log('✓ Unconfigured AI returns clean HTTP 503 with configuration instructions without crashing');
}

// D3: Input validation for conversation
assert.equal((await request('/ai/conversation', { scenarioId: 'conv_cafe_01', userMessage: '' }, token)).status, 400);
assert.equal((await request('/ai/conversation', { scenarioId: 'conv_cafe_01', userMessage: 'a'.repeat(501) }, token)).status, 400); // > 500 chars
console.log('✓ AI conversation input validation (empty message, >500 chars) verified');

// -------------------------------------------------------------
// SECTION E: PROGRESS, XP, SECURITY & REGRESSION
// -------------------------------------------------------------
console.log('\n[SECTION E: PROGRESS, SECURITY & REGRESSION]');

// E1: User progress contains all practice records
const meRes = await request('/me', null, token);
assert.equal(meRes.status, 200);
assert.ok(meRes.data.progress.practice, 'User progress must include practice history');
assert.ok(meRes.data.progress.practice.listening.includes(testMod.id));
assert.ok(meRes.data.progress.practice.speaking.includes(speakPrompt.id));
assert.ok(meRes.data.progress.practice.pronunciation.includes(pronunciation[0].id));
// Total XP earned: 25 (listening) + 30 (speaking) + 20 (pronunciation) = 75 XP
assert.equal(meRes.data.progress.xp, 75, 'Total XP should equal exactly 75 from Phase 11 activities');
console.log(`✓ User practice records and cumulative XP correctly persisted (XP = ${meRes.data.progress.xp})`);

// E2: Unauthenticated requests rejected
assert.equal((await request('/practice/listening/submit', { moduleId: testMod.id, answers: [0, 1, 0] })).status, 401);
assert.equal((await request('/practice/speaking/submit', { promptId: speakPrompt.id, transcript: validSpeakingText })).status, 401);
assert.equal((await request('/practice/pronunciation/submit', { itemId: pronunciation[0].id, transcript: 'test' })).status, 401);
assert.equal((await request('/ai/conversation', { scenarioId: 'conv_cafe_01', userMessage: 'Hi' })).status, 401);
console.log('✓ Protected endpoints strictly enforce authentication (401)');

// E3: Regression check: canonical curriculum untouched (138 lessons, 690 exercises)
const report = validateCurriculumCatalog(CURRICULUM_CATALOG);
assert.equal(report.valid, true, 'Curriculum catalog must remain 100% valid');
assert.equal(report.counts.lessons, 138, 'Must preserve all 138 lessons');
assert.equal(report.counts.exercises, 690, 'Must preserve all 690 exercises');
console.log('✓ Curriculum catalog regression check: 138 lessons, 690 exercises preserved');

// E4: Regression check: lesson prerequisites still enforced
const advLesson = await request('/progress/lesson', {
  lesson: 'c2-u5-l5',
  answers: [0, 1, 2, 3, 0]
}, token);
assert.equal(advLesson.status, 400, 'Unmet prerequisite lesson must be rejected with 400');
console.log('✓ Lesson prerequisite enforcement strictly intact');

// E5: Regression check: multiplayer game rooms still function
const gameRes = await request('/games', { topic: 'Mixed English', difficulty: 'Beginner', duration: 3 }, token);
assert.equal(gameRes.status, 200);
assert.ok(gameRes.data.code);
await request('/games/' + gameRes.data.code + '/leave', {}, token);
console.log('✓ Multiplayer lobby functionality strictly intact');

console.log('\n========================================================================');
console.log('🎉 ALL PHASE 11 TESTS PASSED SUCCESSFULLY!');
console.log('========================================================================\n');
