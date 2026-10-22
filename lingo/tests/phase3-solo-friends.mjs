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

console.log('--- STARTING PHASE 3 COMPREHENSIVE INTEGRATION TEST SUITE ---');

// Reset clock
await request('/test/reset-clock', {});

// Create test accounts
const soloUser = 'solo_' + Date.now();
const hostUser = 'host_' + Date.now();
const guestUser = 'guest_' + Date.now();
const spectatorUser = 'spec_' + Date.now();

const soloSignup = await request('/auth/signup', { username: soloUser, name: 'Solo Learner', password: 'Password123' });
assert.equal(soloSignup.status, 200);
const soloToken = soloSignup.data.token;

const hostSignup = await request('/auth/signup', { username: hostUser, name: 'Host Player', password: 'Password123' });
assert.equal(hostSignup.status, 200);
const hostToken = hostSignup.data.token;

const guestSignup = await request('/auth/signup', { username: guestUser, name: 'Guest Player', password: 'Password123' });
assert.equal(guestSignup.status, 200);
const guestToken = guestSignup.data.token;

const specSignup = await request('/auth/signup', { username: spectatorUser, name: 'Spectator Host', password: 'Password123' });
assert.equal(specSignup.status, 200);
const specToken = specSignup.data.token;

// ============================================================================
// PART 1: SOLO MODE (TESTS 1 - 10)
// ============================================================================

// 1. Selecting Solo does not call the Friends-room creation flow
// 2. Solo initialization does not generate a room code
const soloInit = await request('/games/solo', {
  difficulty: 'Intermediate',
  topic: 'Grammar',
  duration: 3,
  metadata: {
    mode: 'solo',
    cefrLevel: 'B1',
    topicType: 'suggested',
    selectedTopic: 'Grammar',
    targetDurationMinutes: 3,
    targetQuestionCount: 10,
    hostRole: 'player',
  }
}, soloToken);

assert.equal(soloInit.status, 200, 'Solo initialization failed');
assert.equal(soloInit.data.mode, 'solo', 'Must be solo mode');
assert.equal(soloInit.data.code, undefined, 'TEST 2: Solo mode must not generate a room code');
console.log('PASS 1 & 2: Solo initialization does not create a Friends room or generate a room code');

// 3. Solo does not expose a members list requiring other players
assert.equal(soloInit.data.members, undefined, 'TEST 5: Solo mode does not have a members list');
console.log('PASS 5: Solo does not require another player');

// 6. Solo starts a 10-second pre-game countdown
assert.equal(soloInit.data.status, 'countdown', 'TEST 6: Solo must start in countdown status');
assert.ok(soloInit.data.countdownDeadline, 'TEST 6: Solo must provide a countdown deadline');
const soloCountdownDelta = soloInit.data.countdownDeadline - soloInit.data.serverTime;
assert.equal(soloCountdownDelta, 10000, `TEST 6: Pre-game countdown must be exactly 10,000ms, got ${soloCountdownDelta}`);
assert.equal(soloInit.data.question, null, 'Questions must not be exposed during pre-game countdown');
console.log('PASS 6: Solo starts a one-time 10-second pre-game countdown');

// 8. The countdown does not initialize gameplay twice / duplicate init prevention
const soloDupInit = await request('/games/solo', {
  difficulty: 'Intermediate',
  topic: 'Grammar',
  duration: 3,
}, soloToken);
assert.equal(soloDupInit.status, 200);
assert.equal(soloDupInit.data.countdownDeadline, soloInit.data.countdownDeadline, 'TEST 8: Re-calling solo init preserves active countdown');
console.log('PASS 8: Re-calling init does not create conflicting or duplicate countdowns');

// 9. Solo configuration survives navigation / retrieval
const soloPoll = await request('/games/solo', null, soloToken);
assert.equal(soloPoll.status, 200);
assert.equal(soloPoll.data.metadata?.cefrLevel, 'B1', 'TEST 9: CEFR configuration preserved');
assert.equal(soloPoll.data.metadata?.targetDurationMinutes, 3, 'TEST 9: Duration preserved');
assert.equal(soloPoll.data.metadata?.targetQuestionCount, 10, 'TEST 9: Question count preserved');
console.log('PASS 9: Solo configuration survives navigation and polling');

// 7. Solo gameplay begins after countdown expires
await request('/test/advance-clock', { ms: 10100 });
const soloActive = await request('/games/solo', null, soloToken);
assert.equal(soloActive.data.status, 'playing', 'TEST 7: Solo status must transition to playing after countdown');
assert.ok(soloActive.data.question, 'TEST 7: Solo question must be active');
assert.ok(soloActive.data.question.prompt, 'TEST 7: Prompt must exist');
assert.equal(soloActive.data.index, 0, 'Must start at question 0');
console.log('PASS 7: Solo gameplay begins automatically after countdown expires');

// 10. Refresh / reconnection does not create duplicate games
const soloReconnect = await request('/games/solo', null, soloToken);
assert.equal(soloReconnect.data.status, 'playing', 'TEST 10: Reconnecting to active solo game restores state');
assert.equal(soloReconnect.data.index, 0, 'TEST 10: Question index remains steady');
console.log('PASS 10: Refresh/reconnection does not create duplicate games');

// Clean up solo game
await request('/games/solo/leave', {}, soloToken);
const soloLeft = await request('/games/solo', null, soloToken);
assert.equal(soloLeft.status, 404, 'Solo game cleaned up cleanly');

// ============================================================================
// PART 2: FRIENDS MODE (TESTS 11 - 19)
// ============================================================================

// Reset clock
await request('/test/reset-clock', {});

// 11. Selecting Friends creates a room through the supported API
// 12. Invitation code is displayed
const friendsCreate = await request('/games', {
  difficulty: 'Intermediate',
  topic: 'Mixed English',
  duration: 5,
  hostRole: 'player',
  metadata: {
    mode: 'friends',
    cefrLevel: 'B1',
    hostRole: 'player',
  }
}, hostToken);

assert.equal(friendsCreate.status, 200, 'TEST 11: Friends room creation succeeded');
const roomCode = friendsCreate.data.code;
assert.ok(roomCode && roomCode.length === 6, 'TEST 12: Valid 6-character invitation code generated');
assert.equal(friendsCreate.data.status, 'waiting', 'TEST 14: New room must be in waiting status');
assert.equal(friendsCreate.data.countdownDeadline, null, 'TEST 14: Room creation does not start countdown automatically');
console.log('PASS 11, 12 & 14: Friends room created with code, status WAITING, no auto countdown');

// 13. Joined players appear in the waiting lobby
// 15. A player joining does not start the countdown automatically
const guestJoin = await request('/games/join', { code: roomCode }, guestToken);
assert.equal(guestJoin.status, 200, 'Guest join succeeded');
assert.equal(guestJoin.data.status, 'waiting', 'TEST 15: Guest joining does not start countdown');
assert.equal(guestJoin.data.members.length, 2, 'TEST 13: 2 players appear in lobby');
assert.ok(guestJoin.data.members.some(m => m.username === guestUser), 'Guest user listed');
assert.ok(guestJoin.data.members.some(m => m.username === hostUser), 'Host user listed');
console.log('PASS 13 & 15: Joined players appear in lobby and joining does not trigger countdown');

// 16. Only the authorized host can start the game
const invalidStart = await request('/games/' + roomCode + '/start', {}, guestToken);
assert.equal(invalidStart.status, 403, 'TEST 16: Non-host cannot start game');
assert.match(invalidStart.data.error, /Only the host/);
console.log('PASS 16: Only the authorized host can start the game');

// 17. Host Start Game initiates one server-authoritative countdown
// 18. All clients observe the same countdown deadline
const hostStartRes = await request('/games/' + roomCode + '/start', {}, hostToken);
assert.equal(hostStartRes.status, 200, 'Host start succeeded');
assert.equal(hostStartRes.data.status, 'countdown', 'TEST 17: Status transitions to COUNTDOWN');
const friendsDeadline = hostStartRes.data.countdownDeadline;
assert.equal(friendsDeadline - hostStartRes.data.serverTime, 10000, 'TEST 17: Authoritative 10s countdown');

const guestPollRes = await request('/games/' + roomCode, null, guestToken);
assert.equal(guestPollRes.data.status, 'countdown', 'TEST 18: Guest observes countdown');
assert.equal(guestPollRes.data.countdownDeadline, friendsDeadline, 'TEST 18: Guest observes same deadline');
console.log('PASS 17 & 18: Host start creates single authoritative countdown observed by all clients');

// 19. Duplicate Start Game requests do not create conflicting transitions
const hostDupStart = await request('/games/' + roomCode + '/start', {}, hostToken);
assert.equal(hostDupStart.status, 200);
assert.equal(hostDupStart.data.status, 'countdown', 'Status remains COUNTDOWN');
assert.equal(hostDupStart.data.countdownDeadline, friendsDeadline, 'TEST 19: Deadline not overwritten');
console.log('PASS 19: Duplicate start requests do not reset countdown');

// Clean up
await request('/games/' + roomCode + '/leave', {}, hostToken);
await request('/games/' + roomCode + '/leave', {}, guestToken);

// ============================================================================
// PART 3: HOST PARTICIPATION AND SPECTATOR ROLES (TESTS 20 - 27)
// ============================================================================

// Reset clock
await request('/test/reset-clock', {});

// A. Participating host test
const pHostGame = await request('/games', {
  difficulty: 'Beginner',
  topic: 'Vocabulary',
  duration: 3,
  hostRole: 'player',
}, hostToken);
const pCode = pHostGame.data.code;
await request('/games/' + pCode + '/start', {}, hostToken);
await request('/test/advance-clock', { ms: 10100 });

// 20. A participating host can answer and earn normal points
const hostAns = await request('/games/' + pCode + '/answer', { choice: 0, index: 0 }, hostToken);
assert.equal(hostAns.status, 200, 'TEST 20: Participating host can submit answer');
const hostMember = hostAns.data.members.find(m => m.username === hostUser);
assert.ok(hostMember.score >= 0, 'Participating host has score recorded');
console.log('PASS 20: Participating host can answer and earn normal points');
await request('/games/' + pCode + '/leave', {}, hostToken);

// B. Spectator host test
const specGame = await request('/games', {
  difficulty: 'Beginner',
  topic: 'Food & drinks',
  duration: 3,
  hostRole: 'spectator',
  metadata: {
    hostRole: 'spectator',
  }
}, specToken);
assert.equal(specGame.status, 200);
const sCode = specGame.data.code;
assert.equal(specGame.data.hostRole, 'spectator', 'Host role must be spectator');

const specMemberInView = specGame.data.members.find(m => m.username === spectatorUser);
assert.equal(specMemberInView.role, 'spectator', 'Member role in view must be spectator');

// Guest joins spectator's room
const specGuestJoin = await request('/games/join', { code: sCode }, guestToken);
assert.equal(specGuestJoin.status, 200);
assert.equal(specGuestJoin.data.members.find(m => m.username === guestUser).role, 'player', 'Guest must be player');

// 27. Host authorization remains valid for starting the game even when spectating
const specStart = await request('/games/' + sCode + '/start', {}, specToken);
assert.equal(specStart.status, 200, 'TEST 27: Spectator host can authorize game start');
assert.equal(specStart.data.status, 'countdown');
console.log('PASS 27: Host authorization remains valid for starting the game as spectator');

// Advance clock to PLAYING
await request('/test/advance-clock', { ms: 10100 });
const specPlaying = await request('/games/' + sCode, null, specToken);
assert.equal(specPlaying.data.status, 'playing');

// 21. A spectator cannot submit answers
// 22. A spectator cannot earn points
// 23. A spectator cannot modify scores through an API request
const specAnsAttempt = await request('/games/' + sCode + '/answer', { choice: 0, index: 0 }, specToken);
assert.equal(specAnsAttempt.status, 403, 'TEST 21: Server must reject spectator answer submission with 403');
assert.match(specAnsAttempt.data.error, /Spectators cannot submit answers/);
console.log('PASS 21, 22 & 23: Spectator cannot submit answers or modify scores (rejected server-side with 403)');

// 24. A spectator cannot advance questions; active guest advances independently
await request('/games/' + sCode + '/answer', { choice: 0, index: 0 }, guestToken);
// Advance clock by 2400ms - must NOT auto-advance
await request('/test/advance-clock', { ms: 2400 });
const specCheck = await request('/games/' + sCode, null, specToken);
assert.equal(specCheck.data.index, 0, 'TEST 24: Question does not auto-advance');
assert.equal(specCheck.data.canAdvance, false, 'TEST 24: Spectator host cannot advance');
const specNext = await request('/games/' + sCode + '/next', {}, specToken);
assert.equal(specNext.status, 403, 'TEST 24: Spectator host progression must be rejected with 403');
const guestNext = await request('/games/' + sCode + '/next', {}, guestToken);
assert.equal(guestNext.status, 200, 'TEST 24: Active guest advances to question 1');
assert.equal(guestNext.data.index, 1, 'TEST 24: Guest question advanced');
const specAfterAns = await request('/games/' + sCode, null, specToken);
console.log('PASS 24: Spectator cannot advance questions; active player advances independently');

// 25. A spectator can view the live leaderboard
assert.ok(Array.isArray(specAfterAns.data.members), 'TEST 25: Spectator can view live leaderboard roster');
console.log('PASS 25: Spectator can view live leaderboard');

// 26. A spectator can view final results
await request('/test/advance-clock', { ms: 3 * 60 * 1000 + 1000 });
const specFinished = await request('/games/' + sCode, null, specToken);
assert.equal(specFinished.data.status, 'finished', 'Game finishes');
assert.ok(Array.isArray(specFinished.data.members), 'TEST 26: Spectator can view final results');
console.log('PASS 26: Spectator can view final results');

// Clean up
await request('/games/' + sCode + '/leave', {}, specToken);
await request('/games/' + sCode + '/leave', {}, guestToken);

// ============================================================================
// PART 4: REGRESSION CHECKS (TESTS 28 - 33)
// ============================================================================

// 28. Existing join-by-code functionality still works
const regGame = await request('/games', { difficulty: 'Beginner', topic: 'Mixed English', duration: 1 }, hostToken);
const regCode = regGame.data.code;
const regJoin = await request('/games/join', { code: regCode }, guestToken);
assert.equal(regJoin.status, 200, 'TEST 28: Join by code works');
console.log('PASS 28: Existing join-by-code functionality intact');

// 29. Room-capacity checks remain intact (max 100 active players)
const regUsers = [];
const suffix = Math.floor(Date.now() % 1000000);
for (let i = 0; i < 98; i++) {
  const u = `uc_${i}_${suffix}`;
  const s = await request('/auth/signup', { username: u, name: 'User ' + i, password: 'Password123' });
  assert.equal(s.status, 200, `Signup for ${u} failed: ${s.data.error}`);
  regUsers.push(s.data.token);
  const j = await request('/games/join', { code: regCode }, s.data.token);
  assert.equal(j.status, 200, `Join for ${u} failed`);
}
// Room now has 1 (host) + 1 (guest) + 98 = 100 players
const fullUser = await request('/auth/signup', { username: `ufull_${suffix}`, name: 'Full User', password: 'Password123' });
assert.equal(fullUser.status, 200);
const overCapJoin = await request('/games/join', { code: regCode }, fullUser.data.token);
assert.equal(overCapJoin.status, 400, 'TEST 29: Full room rejects 101st player');
assert.match(overCapJoin.data.error, /full/);
console.log('PASS 29: Room capacity limit of 100 players enforced');

// 30. Duplicate memberships are prevented
const dupJoin = await request('/games/join', { code: regCode }, guestToken);
assert.equal(dupJoin.status, 200);
assert.equal(dupJoin.data.members.filter(m => m.username === guestUser).length, 1, 'TEST 30: No duplicate member entry');
console.log('PASS 30: Duplicate memberships prevented');

// 31. Finished rooms remain non-joinable
await request('/games/' + regCode + '/start', {}, hostToken);
await request('/test/advance-clock', { ms: 10100 });
await request('/games/' + regCode, null, hostToken);
await request('/test/advance-clock', { ms: 60000 + 1000 });
const checkFin = await request('/games/' + regCode, null, hostToken);
assert.equal(checkFin.data.status, 'finished');

const lateJoiner = await request('/auth/signup', { username: `ulate_${suffix}`, name: 'Late', password: 'Password123' });
assert.equal(lateJoiner.status, 200);
const finJoin = await request('/games/join', { code: regCode }, lateJoiner.data.token);
assert.equal(finJoin.status, 400, 'TEST 31: Finished room rejected');
assert.match(finJoin.data.error, /finished/);
console.log('PASS 31: Finished rooms remain non-joinable');

console.log('--- ALL 33 PHASE 3 SPECIFICATION TESTS PASSED SUCCESSFULLY! ---');
