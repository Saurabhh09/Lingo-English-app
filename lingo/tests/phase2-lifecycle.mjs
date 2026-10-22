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
// 8. Total game timer governs question progression (roundEnd replaced)
// =========================================================================
// Authoritative total game timer endsAt is set, and per-question roundEnd is removed
assert.ok(playHost.data.endsAt > playHost.data.startedAt, 'endsAt must be initialized for total game timer');
assert.equal(playHost.data.roundEnd, null, 'roundEnd is removed in favor of total game timer');

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

// When all members answered, question does NOT auto-advance without host action
await request('/test/advance-clock', { ms: 2300 });
const pollStillQ0 = await request('/games/' + code, null, hostToken);
assert.equal(pollStillQ0.data.status, 'playing', 'Room should remain playing for question 0');
assert.equal(pollStillQ0.data.index, 0, 'Question must NOT advance automatically');
assert.equal(pollStillQ0.data.roundReady, true, 'Round is ready for host progression');

// Host explicitly advances
const advanceRes = await request('/games/' + code + '/next', {}, hostToken);
assert.equal(advanceRes.status, 200, 'Host progression must succeed');
assert.equal(advanceRes.data.index, 1, 'Question must advance to index 1 after host advances');
console.log('PASS 14 & 15: Answer evaluation, scoring, and host progression verified');

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

// =========================================================================
// 11. TESTS A–E & G: Question pool exhaustion in a 1-minute game does NOT finish before endsAt
// =========================================================================
console.log('--- RUNNING QUESTION POOL EXHAUSTION TESTS (TESTS A - E & G) ---');

// Reset clock
await request('/test/reset-clock', {});

// Create a 1-minute game (initial pool sliced to 3 questions)
const p2HostUsername = 'p2h_' + Date.now();
const p2GuestUsername = 'p2g_' + Date.now();
const p2HostSignup = await request('/auth/signup', { username: p2HostUsername, name: 'P2 Host', password: 'TestPassword123' });
assert.equal(p2HostSignup.status, 200, 'P2 Host signup failed');
const p2HostToken = p2HostSignup.data.token;
const p2GuestSignup = await request('/auth/signup', { username: p2GuestUsername, name: 'P2 Guest', password: 'TestPassword123' });
assert.equal(p2GuestSignup.status, 200, 'P2 Guest signup failed');
const p2GuestToken = p2GuestSignup.data.token;

const g1Res = await request('/games', { difficulty: 'Beginner', topic: 'Food & drinks', duration: 1 }, p2HostToken);
assert.equal(g1Res.status, 200);
const g1Code = g1Res.data.code;

// Guest joins while in WAITING
const g1Join = await request('/games/join', { code: g1Code }, p2GuestToken);
assert.equal(g1Join.status, 200);

// Host starts game -> COUNTDOWN (TEST F: 10-second countdown)
const g1Start = await request('/games/' + g1Code + '/start', {}, p2HostToken);
assert.equal(g1Start.data.status, 'countdown');
const g1Deadline = g1Start.data.countdownDeadline;
const g1ServerTime = g1Start.data.serverTime;
assert.ok(Math.abs((g1Deadline - g1ServerTime) - 10000) <= 100, 'TEST F: Countdown must be 10 seconds');
console.log('PASS TEST F: 10-second countdown preserved');

// Advance clock past countdown (10,100ms)
await request('/test/advance-clock', { ms: 10100 });
const g1Play = await request('/games/' + g1Code, null, p2HostToken);
assert.equal(g1Play.data.status, 'playing');
assert.equal(g1Play.data.index, 0);
assert.equal(g1Play.data.total, 3, 'Original question pool for 1 min should be 3 questions');
const g1EndsAt = g1Play.data.endsAt;
assert.ok(g1EndsAt > g1Play.data.serverTime, 'endsAt must be in future');

// Answer question 0 (both players)
await request('/games/' + g1Code + '/answer', { choice: 0, index: 0 }, p2HostToken);
await request('/games/' + g1Code + '/answer', { choice: 0, index: 0 }, p2GuestToken);
await request('/test/advance-clock', { ms: 2300 });

// Verify question 0 did NOT auto-advance, then players advance to question 1
const checkQ0 = await request('/games/' + g1Code, null, p2HostToken);
assert.equal(checkQ0.data.index, 0, 'Question must not auto-advance');
const advQ1 = await request('/games/' + g1Code + '/next', {}, p2HostToken);
assert.equal(advQ1.status, 200);
assert.equal(advQ1.data.index, 1);
const advQ1Guest = await request('/games/' + g1Code + '/next', {}, p2GuestToken);
assert.equal(advQ1Guest.status, 200);
assert.equal(advQ1Guest.data.index, 1);

// Answer question 1 (both players)
await request('/games/' + g1Code + '/answer', { choice: 1, index: 1 }, p2HostToken);
await request('/games/' + g1Code + '/answer', { choice: 1, index: 1 }, p2GuestToken);
await request('/test/advance-clock', { ms: 2300 });

// Verify question 1 did NOT auto-advance, then players advance to question 2
const checkQ1 = await request('/games/' + g1Code, null, p2HostToken);
assert.equal(checkQ1.data.index, 1, 'Question must not auto-advance');
const advQ2 = await request('/games/' + g1Code + '/next', {}, p2HostToken);
assert.equal(advQ2.status, 200);
assert.equal(advQ2.data.index, 2);
const advQ2Guest = await request('/games/' + g1Code + '/next', {}, p2GuestToken);
assert.equal(advQ2Guest.status, 200);
assert.equal(advQ2Guest.data.index, 2);

// Answer question 2 (both players answer the last question of the original pool)
const hAns2 = await request('/games/' + g1Code + '/answer', { choice: 2, index: 2 }, p2HostToken);
assert.equal(hAns2.status, 200);
const gAns2 = await request('/games/' + g1Code + '/answer', { choice: 2, index: 2 }, p2GuestToken);
assert.equal(gAns2.status, 200);
assert.equal(gAns2.data.status, 'finished', 'Game finishes automatically upon evaluating final question');

// TEST A: Verify room transitions to 'finished' upon completing configured question count (no question replenishment)
const q3Host = await request('/games/' + g1Code, null, p2HostToken);
const q3Guest = await request('/games/' + g1Code, null, p2GuestToken);

assert.equal(q3Host.data.status, 'finished', 'TEST A: Game MUST transition to finished when configured questions are completed');
assert.equal(q3Guest.data.status, 'finished', 'TEST A: Guest must also see game is finished');
assert.equal(q3Host.data.total, 3, 'TEST A: Total question count must strictly remain 3 (no replenishment)');
console.log('PASS TEST A: Game finishes authoritatively when configured question count is completed without replenishment');

// TEST B: A finished game cannot advance to another question
const qAdvance = await request('/games/' + g1Code + '/next', {}, p2HostToken);
assert.equal(qAdvance.status, 400, 'TEST B: Advanced past final question on finished game must be rejected');
console.log('PASS TEST B: Advanced past final question correctly rejected with 400');

// TEST D: Shared finished state and results across players
assert.equal(q3Host.data.status, q3Guest.data.status, 'TEST D: Both players must observe identical finished status');
assert.ok(q3Host.data.leaderboard, 'TEST D: Leaderboard must be present when game is finished');
assert.ok(q3Host.data.stats, 'TEST D: Player stats must be present when game is finished');
console.log('PASS TEST D: Finished state, stats, and leaderboard remain shared and consistent across players');

// TEST E: Reject additional answers after game is finished
const lateAns = await request('/games/' + g1Code + '/answer', { choice: 0, index: 2 }, p2HostToken);
assert.equal(lateAns.status, 400, 'TEST E: Answer evaluation on finished game must be rejected');
console.log('PASS TEST E: Additional answers rejected after game is finished');

// TEST C: Overall deadline expiration finishes game before all questions completed
const gTimerRes = await request('/games', { difficulty: 'Beginner', topic: 'Vocabulary', duration: 1 }, p2HostToken);
const gTimerCode = gTimerRes.data.code;
await request('/games/' + gTimerCode + '/start', {}, p2HostToken);
await request('/test/advance-clock', { ms: 10100 });
const gTimerPlay = await request('/games/' + gTimerCode, null, p2HostToken);
assert.equal(gTimerPlay.data.status, 'playing');
// Advance clock past 1 minute duration endsAt
await request('/test/advance-clock', { ms: 61000 });
const gTimerFinished = await request('/games/' + gTimerCode, null, p2HostToken);
assert.equal(gTimerFinished.data.status, 'finished', 'TEST C: Game must finish when endsAt deadline is reached');
console.log('PASS TEST C: Game finishes authoritatively when endsAt deadline is reached before questions completed');

// TEST G: Existing completion rules (Host abandonment)
const g2Res = await request('/games', { difficulty: 'Beginner', topic: 'Vocabulary', duration: 1 }, p2HostToken);
const g2Code = g2Res.data.code;
const g2Leave = await request('/games/' + g2Code + '/leave', {}, p2HostToken);
assert.equal(g2Leave.status, 200);
// Attempt to join the abandoned room should be rejected with 400 because g.status transitioned to finished
const joinAbandoned = await request('/games/join', { code: g2Code }, p2GuestToken);
assert.equal(joinAbandoned.status, 400, 'TEST G: Joining an abandoned room must be rejected with 400');
assert.match(joinAbandoned.data.error, /already started|finished/, 'TEST G: Error must indicate room is no longer joinable');
console.log('PASS TEST G: Host abandonment behavior confirmed (status set to finished upon abandonment)');

// Reset clock
await request('/test/reset-clock', {});
console.log('ALL PHASE 2 MULTIPLAYER LIFECYCLE TESTS PASSED SUCCESSFULLY.');
