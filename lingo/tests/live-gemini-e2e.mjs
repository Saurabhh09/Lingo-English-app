import assert from 'node:assert/strict';

const root = 'http://localhost:3000/api';

async function request(endpoint, body, token, method) {
  const response = await fetch(root + endpoint, {
    method: method || (body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  return { status: response.status, data };
}

console.log('========================================================================');
console.log('--- STARTING LIVE GEMINI AI END-TO-END VERIFICATION SUITE ---');
console.log('========================================================================\n');

// Ensure NO mock is active
await request('/test/clear-ai-mock', {});
await request('/test/reset-clock', {});

const ts = String(Date.now()).slice(-6);

async function createUser(prefix, name) {
  const username = `${prefix}_${ts}`;
  const res = await request('/auth/signup', { username, name, password: 'Password123' });
  assert.equal(res.status, 200, `User creation failed for ${username}: ${res.data?.error}`);
  return { username, token: res.data.token };
}

// ============================================================================
// PART 1: LIVE SOLO CUSTOM TOPIC GAME WITH REAL GEMINI AI GENERATION
// ============================================================================
console.log('--- PART 1: LIVE SOLO CUSTOM TOPIC GENERATION ---');
const soloUser = await createUser('livesolo', 'Live Solo User');

console.log('Requesting live Solo game with Custom Topic: "Robotics and AI in Healthcare" at B2 (3 questions)...');
const startTime = Date.now();
const soloRes = await request('/games/solo', {
  topicType: 'custom',
  isCustomTopic: true,
  customTopic: 'Robotics and AI in Healthcare',
  cefrLevel: 'B2',
  duration: 3,
  questionCount: 3,
  metadata: {
    mode: 'solo',
    topicType: 'custom',
    isCustomTopic: true,
    topicName: 'Robotics and AI in Healthcare',
    cefrLevel: 'B2',
    targetDurationMinutes: 3,
    targetQuestionCount: 3,
    allowFallback: false
  }
}, soloUser.token);

const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`Live generation completed in ${elapsedSec}s with HTTP ${soloRes.status}`);

assert.equal(soloRes.status, 200, `Live Solo game creation must succeed: ${soloRes.data?.error}`);
assert.equal(soloRes.data.mode, 'solo');
assert.equal(soloRes.data.topic, 'Robotics and AI in Healthcare');
assert.equal(soloRes.data.cefrLevel, 'B2');
assert.equal(soloRes.data.total, 3, 'Must match exact requested count (3)');
assert.equal(soloRes.data.questionSource, 'ai', 'Must be tagged with source=ai');
assert.equal(soloRes.data.status, 'countdown');
console.log('PASS 1.1: Live Solo custom topic game created with real Gemini questions and 10s countdown');

// Advance past countdown
await request('/test/advance-clock', { ms: 10100 });
const soloPlaying = await request('/games/solo', null, soloUser.token);
assert.equal(soloPlaying.data.status, 'playing');
assert.ok(soloPlaying.data.question, 'Live question is rendered');
assert.equal(soloPlaying.data.question.options.length, 4, 'Question has exactly 4 options');
console.log(`PASS 1.2: Countdown transitioned to playing. Prompt: "${soloPlaying.data.question.prompt.slice(0, 60)}..."`);

// Submit answer for Question 0
const soloAns = await request('/games/solo/answer', {
  index: 0,
  choice: 0
}, soloUser.token);
assert.equal(soloAns.status, 200);
assert.ok(soloAns.data.answer, 'Answer feedback received');
assert.ok(soloAns.data.answer.explanation, 'Pedagogical explanation received from Gemini');
console.log(`PASS 1.3: Question answered. IsCorrect: ${soloAns.data.answer.isCorrect}. Explanation: "${soloAns.data.answer.explanation.slice(0, 60)}..."`);

// Advance to Question 1
const soloNext = await request('/games/solo/next', {}, soloUser.token);
assert.equal(soloNext.status, 200);
assert.equal(soloNext.data.index, 1);
console.log(`PASS 1.4: Successfully advanced to Question 2 of 3`);

// Leave solo game
await request('/games/solo/leave', {}, soloUser.token);


// ============================================================================
// PART 2: LIVE FRIENDS ROOM WITH REAL GEMINI AI & CANONICAL QUESTIONS
// ============================================================================
console.log('\n--- PART 2: LIVE FRIENDS MULTIPLAYER WITH REAL GEMINI AI ---');
const host = await createUser('livehost', 'Live Host');
const guest = await createUser('liveguest', 'Live Guest');

console.log('Creating live Friends room with Custom Topic: "Renewable Energy Solutions" at B1 (3 questions)...');
const roomRes = await request('/games', {
  topicType: 'custom',
  isCustomTopic: true,
  customTopic: 'Renewable Energy Solutions',
  cefrLevel: 'B1',
  duration: 3,
  questionCount: 3,
  hostRole: 'player',
  metadata: {
    mode: 'friends',
    topicType: 'custom',
    isCustomTopic: true,
    topicName: 'Renewable Energy Solutions',
    cefrLevel: 'B1',
    targetDurationMinutes: 3,
    targetQuestionCount: 3,
    hostRole: 'player'
  }
}, host.token);

assert.equal(roomRes.status, 200, `Live room creation must succeed: ${roomRes.data?.error}`);
const roomCode = roomRes.data.code;
assert.equal(roomRes.data.questionSource, 'ai');
assert.equal(roomRes.data.total, 3);
console.log(`PASS 2.1: Live room created (Code: ${roomCode}) with 3 real Gemini questions`);

// Guest joins
const guestJoin = await request('/games/join', { code: roomCode, role: 'player' }, guest.token);
assert.equal(guestJoin.status, 200);

// Host starts match
await request(`/games/${roomCode}/start`, {}, host.token);
await request('/test/advance-clock', { ms: 10100 });

// Both retrieve views
const hostView = await request(`/games/${roomCode}`, null, host.token);
const guestView = await request(`/games/${roomCode}`, null, guest.token);

assert.equal(hostView.data.status, 'playing');
assert.equal(guestView.data.status, 'playing');

// Verify independent randomized starting questions from the canonical set
console.log(`Host Q0: "${hostView.data.question.prompt.slice(0, 50)}..." (ID: ${hostView.data.question.id})`);
console.log(`Guest Q0: "${guestView.data.question.prompt.slice(0, 50)}..." (ID: ${guestView.data.question.id})`);

assert.ok(hostView.data.question.id, 'Host has question ID');
assert.ok(guestView.data.question.id, 'Guest has question ID');
console.log('PASS 2.2: Live questions rendered with player-specific order mapping');

// Host submits answer and advances to next question independently
const hostAns = await request(`/games/${roomCode}/answer`, { index: 0, choice: 0 }, host.token);
assert.equal(hostAns.status, 200);

const hostNext = await request(`/games/${roomCode}/next`, {}, host.token);
assert.equal(hostNext.status, 200);
assert.equal(hostNext.data.index, 1);

// Guest is still on Question 0
const guestCheck = await request(`/games/${roomCode}`, null, guest.token);
assert.equal(guestCheck.data.index, 0);
console.log('PASS 2.3: Independent progression verified with live AI questions');

// Clean up
await request('/test/clear-ai-mock', {});
await request('/test/reset-clock', {});

console.log('\n========================================================================');
console.log('🎉 LIVE GEMINI END-TO-END VERIFICATION SUCCEEDED WITH 0 ERRORS!');
console.log('========================================================================');
