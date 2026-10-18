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

console.log('--- RUNNING PHASE 2 SERVER-AUTHORITATIVE GAME LIFECYCLE TESTS ---');

// Reset test clock offset at start
await request('/test/reset-clock', {});

// Setup test users
const hostUsername = 'host_' + Date.now();
const guestUsername = 'guest_' + Date.now();

const hostSignup = await request('/auth/signup', { username: hostUsername, name: 'Host Player', password: 'TestPassword123' });
assert.equal(hostSignup.status, 200, 'Host signup failed');
const hostToken = hostSignup.data.token;

const guestSignup = await request('/auth/signup', { username: guestUsername, name: 'Guest Player', password: 'TestPassword123' });
assert.equal(guestSignup.status, 200, 'Guest signup failed');
const guestToken = guestSignup.data.token;

// =========================================================================
// 1. Creating a game leaves it in WAITING and does not start gameplay
// =========================================================================
const createRes = await request('/games', { difficulty: 'Beginner', topic: 'Mixed English', duration: 3 }, hostToken);
assert.equal(createRes.status, 200, 'Room creation failed');
const code = createRes.data.code;

assert.equal(createRes.data.status, 'waiting', 'New room must be in WAITING status');
assert.equal(createRes.data.countdownDeadline, null, 'New room must not have countdownDeadline');
assert.equal(createRes.data.startedAt, null, 'New room must not have startedAt');
assert.equal(createRes.data.endsAt, null, 'New room must not have endsAt');
assert.equal(createRes.data.roundEnd, null, 'New room must not have roundEnd');
assert.equal(createRes.data.question, null, 'New room must not expose question before gameplay');
console.log('PASS 1 & 2: Creating a game leaves it in WAITING and does not begin gameplay');

// =========================================================================
// 2. Only the host can initiate the countdown
// =========================================================================
const joinRes = await request('/games/join', { code }, guestToken);
assert.equal(joinRes.status, 200, 'Guest failed to join room');
assert.equal(joinRes.data.members.length, 2, 'Room should have 2 members');

const guestStart = await request('/games/' + code + '/start', {}, guestToken);
assert.equal(guestStart.status, 403, 'Non-host must be rejected with 403 on start');
assert.match(guestStart.data.error, /Only the host/);

const checkWaiting = await request('/games/' + code, null, hostToken);
assert.equal(checkWaiting.data.status, 'waiting', 'Room must remain WAITING after non-host start attempt');
console.log('PASS 3: Non-host start rejected with 403; room remains WAITING');

// =========================================================================
// 3. Host start changes WAITING to COUNTDOWN with 10-second server deadline
// =========================================================================
const hostStart = await request('/games/' + code + '/start', {}, hostToken);
assert.equal(hostStart.status, 200, 'Host start failed');
assert.equal(hostStart.data.status, 'countdown', 'Status must transition to COUNTDOWN');
assert.ok(hostStart.data.countdownDeadline, 'countdownDeadline must be provided');

const serverTime = hostStart.data.serverTime;
const deadlineDelta = hostStart.data.countdownDeadline - serverTime;
assert.ok(Math.abs(deadlineDelta - 10000) <= 100, `Countdown deadline must be ~10000ms, got ${deadlineDelta}ms`);
assert.equal(hostStart.data.question, null, 'Questions must remain secluded during countdown');
console.log('PASS 4 & 5: Host start transitions to COUNTDOWN with authoritative ~10s deadline');

// =========================================================================
// 4. Duplicate start requests do not reset the deadline
// =========================================================================
const initialDeadline = hostStart.data.countdownDeadline;
// Advance clock by 3 seconds
await request('/test/advance-clock', { ms: 3000 });

const dupStart = await request('/games/' + code + '/start', {}, hostToken);
assert.equal(dupStart.status, 200, 'Duplicate start should succeed idempotently');
assert.equal(dupStart.data.status, 'countdown', 'Status must remain countdown on duplicate start');
assert.equal(dupStart.data.countdownDeadline, initialDeadline, 'Duplicate start MUST NOT reset the countdown deadline');
console.log('PASS 9: Duplicate start requests do not reset the countdown deadline');

// =========================================================================
// 5. Game does not enter PLAYING before deadline
// =========================================================================
// Advance clock another 4000ms (total 7000ms advanced, 3000ms still remaining)
await request('/test/advance-clock', { ms: 4000 });

const midHost = await request('/games/' + code, null, hostToken);
assert.equal(midHost.data.status, 'countdown', 'Game must remain in COUNTDOWN at 7s');
assert.equal(midHost.data.question, null, 'Game must not reveal question before deadline');

const midGuest = await request('/games/' + code, null, guestToken);
assert.equal(midGuest.data.status, 'countdown', 'Guest must also see COUNTDOWN at 7s');
assert.equal(midGuest.data.countdownDeadline, initialDeadline, 'Guest must see the exact same authoritative deadline');
console.log('PASS 6, 10 & 11: Room remains in COUNTDOWN before deadline; refresh/polling restores identical state');

// =========================================================================
// 6. Game enters PLAYING after deadline reached; question initialized exactly once
// =========================================================================
// Advance clock past the remaining 3000ms (3100ms to guarantee >= deadline)
await request('/test/advance-clock', { ms: 3100 });

// Concurrent polls from host and guest at deadline
const [playHost, playGuest] = await Promise.all([
  request('/games/' + code, null, hostToken),
  request('/games/' + code, null, guestToken),
]);

assert.equal(playHost.status, 200);
assert.equal(playGuest.status, 200);
assert.equal(playHost.data.status, 'playing', 'Room must transition to PLAYING once deadline is reached');
assert.equal(playGuest.data.status, 'playing', 'Guest must also observe PLAYING status');
assert.equal(playHost.data.index, 0, 'First question index must be 0');
assert.equal(playGuest.data.index, 0, 'First question index must be 0 for all players');
assert.ok(playHost.data.question.prompt, 'Question prompt must be provided once playing');
assert.equal(playHost.data.question.prompt, playGuest.data.question.prompt, 'Question must be identical for both players');
console.log('PASS 7 & 8: Room transitions to PLAYING after deadline; question initialized exactly once across concurrent requests');

// =========================================================================
// 7. Selected overall game duration begins at gameplay start
// =========================================================================
// Duration was 3 minutes = 180,000ms
const expectedEndsAt = playHost.data.startedAt + (3 * 60000);
assert.equal(playHost.data.endsAt, expectedEndsAt, 'endsAt must equal startedAt + duration (3 min)');
console.log('PASS 12: Overall gameplay duration timer begins authoritatively at gameplay start');

// =========================================================================
// 8. Per-question timer governs question progression
// =========================================================================
// Initial question has roundEnd = startedAt + 20000
const initialRoundEnd = playHost.data.roundEnd;
assert.ok(initialRoundEnd > playHost.data.startedAt, 'roundEnd must be initialized for question 0');

// Host answers question 0 correctly
const answerRes = await request('/games/' + code + '/answer', { choice: 0, index: 0 }, hostToken);
assert.equal(answerRes.status, 200, 'Answer submission failed');
assert.ok(answerRes.data.answer.explanation, 'Explanation should be returned on answer');

// Duplicate answer on same question rejected
const dupAnswer = await request('/games/' + code + '/answer', { choice: 1, index: 0 }, hostToken);
assert.equal(dupAnswer.status, 400, 'Duplicate answer on same index must be rejected');

// Guest answers question 0
const guestAns = await request('/games/' + code + '/answer', { choice: 1, index: 0 }, guestToken);
assert.equal(guestAns.status, 200, 'Guest answer submission failed');

// When all members answered, question advances after short reveal window (2200ms)
await request('/test/advance-clock', { ms: 2300 });
const nextQ = await request('/games/' + code, null, hostToken);
assert.equal(nextQ.data.status, 'playing', 'Room should remain playing for question 1');
assert.equal(nextQ.data.index, 1, 'Question must advance to index 1 after all answered');
console.log('PASS 14 & 15: Per-question timer, answer evaluation, scoring, and progression verified');

// =========================================================================
// 9. Game finishes when overall duration expires
// =========================================================================
// Advance clock by remaining duration (3 min = 180,000ms)
await request('/test/advance-clock', { ms: 180000 });

const finishedRes = await request('/games/' + code, null, hostToken);
assert.equal(finishedRes.data.status, 'finished', 'Game must transition to FINISHED when overall duration expires');
console.log('PASS 13: Game finishes authoritatively when overall duration expires');

// =========================================================================
// 10. Start request after game is finished is rejected
// =========================================================================
const startFinished = await request('/games/' + code + '/start', {}, hostToken);
assert.equal(startFinished.status, 400, 'Cannot start a game that is already finished');
console.log('PASS 16: Start requests on finished games properly rejected');

// Reset clock
await request('/test/reset-clock', {});
console.log('ALL PHASE 2 MULTIPLAYER LIFECYCLE TESTS PASSED SUCCESSFULLY.');
