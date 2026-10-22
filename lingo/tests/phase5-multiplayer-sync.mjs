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

console.log('============================================================');
console.log('--- STARTING PHASE 5 INDEPENDENT PROGRESSION REGRESSION SUITE ---');
console.log('============================================================');

await request('/test/reset-clock', {});

// ============================================================================
// TEST 23: SOLO PROGRESSION REMAINS UNCHANGED
// ============================================================================
console.log('\n--- VERIFYING REQUIREMENT 23: SOLO PROGRESSION REMAINS UNCHANGED ---');
const soloUser = `p5solo_${String(Date.now()).slice(-6)}`;
const soloReg = await request('/auth/signup', { username: soloUser, name: 'Solo Learner', password: 'Password123' });
assert.equal(soloReg.status, 200);
const soloToken = soloReg.data.token;

const soloInit = await request('/games/solo', {
  difficulty: 'Beginner',
  topic: 'Grammar',
  duration: 3,
  metadata: { mode: 'solo', cefrLevel: 'A1', targetQuestionCount: 3 }
}, soloToken);
assert.equal(soloInit.status, 200);
await request('/test/advance-clock', { ms: 10100 });

const soloActive = await request('/games/solo', null, soloToken);
assert.equal(soloActive.data.status, 'playing');
assert.equal(soloActive.data.index, 0);

// Answer question 0 in solo
const soloAns = await request('/games/solo/answer', { index: 0, choice: 0 }, soloToken);
assert.equal(soloAns.status, 200);
assert.ok(soloAns.data.answer);

// Advance question in solo
const soloNext = await request('/games/solo/next', {}, soloToken);
assert.equal(soloNext.status, 200);
assert.equal(soloNext.data.index, 1);
await request('/games/solo/leave', {}, soloToken);
console.log('PASS 23: Solo progression remains completely unchanged and functional');

// ============================================================================
// TESTS 1 - 8: INDEPENDENT TWO-PLAYER PROGRESSION & ANSWER STATES
// ============================================================================
console.log('\n--- VERIFYING REQUIREMENTS 1 - 8: INDEPENDENT TWO-PLAYER PROGRESSION ---');
await request('/test/reset-clock', {});
const uid = String(Date.now()).slice(-6);
const hostUser = `host_${uid}`;
const guestUser = `guest_${uid}`;

const hReg = await request('/auth/signup', { username: hostUser, name: 'Host Player', password: 'Password123' });
const gReg = await request('/auth/signup', { username: guestUser, name: 'Guest Player', password: 'Password123' });
const hToken = hReg.data.token;
const gToken = gReg.data.token;

const gameRes = await request('/games', {
  difficulty: 'Intermediate',
  topic: 'Vocabulary',
  duration: 5,
  questionCount: 3,
  hostRole: 'player'
}, hToken);
assert.equal(gameRes.status, 200);
const code = gameRes.data.code;

const joinRes = await request('/games/join', { code }, gToken);
assert.equal(joinRes.status, 200);

// Start game and advance past countdown
await request(`/games/${code}/start`, {}, hToken);
await request('/test/advance-clock', { ms: 10100 });

// 1. Two players start at Question 1 (index 0)
const hPollQ0 = await request(`/games/${code}`, null, hToken);
const gPollQ0 = await request(`/games/${code}`, null, gToken);
assert.equal(hPollQ0.data.index, 0, 'Host starts at Question 1 (index 0)');
assert.equal(gPollQ0.data.index, 0, 'Guest starts at Question 1 (index 0)');
assert.equal(hPollQ0.data.question.id, gPollQ0.data.question.id, 'Canonical questions are identical');
console.log('PASS 1: Two players start at Question 1 with identical canonical questions');

// 2. Player A (Host) submits an answer
const hAnsQ0 = await request(`/games/${code}/answer`, { index: 0, choice: 0 }, hToken);
assert.equal(hAnsQ0.status, 200, 'Player A submits answer');

// 3. Player A sees feedback
assert.ok(hAnsQ0.data.answer, 'Player A receives feedback');
assert.notEqual(hAnsQ0.data.answer.correct, undefined, 'Player A sees correctness');
assert.ok(typeof hAnsQ0.data.answer.pointsEarned === 'number', 'Player A receives points');
const hScoreQ0 = hAnsQ0.data.score;
console.log('PASS 2 & 3: Player A submits an answer and sees immediate feedback and score');

// 4. Player A advances to Question 2 without Player B answering
const hAdvQ1 = await request(`/games/${code}/next`, {}, hToken);
assert.equal(hAdvQ1.status, 200, 'Player A can advance independently to Question 2');
assert.equal(hAdvQ1.data.index, 1, 'Player A is now on Question 2 (index 1)');
console.log('PASS 4: Player A advances to Question 2 without Player B answering');

// 5. Player B remains on Question 1
const gPollStillQ0 = await request(`/games/${code}`, null, gToken);
assert.equal(gPollStillQ0.data.index, 0, 'Player B remains on Question 1 (index 0)');
assert.equal(gPollStillQ0.data.answer, null, 'Player B has not submitted Question 1');
console.log('PASS 5: Player B remains on Question 1 while Player A is on Question 2');

// 6. Player B can submit Question 1 after Player A advances
const gAnsQ0 = await request(`/games/${code}/answer`, { index: 0, choice: 1 }, gToken);
assert.equal(gAnsQ0.status, 200, 'Player B submits Question 1 successfully');
assert.ok(gAnsQ0.data.answer, 'Player B sees feedback for Question 1');
const gScoreQ0 = gAnsQ0.data.score;
console.log('PASS 6: Player B can submit Question 1 after Player A advances');

// 7. Player B can independently advance to Question 2
const gAdvQ1 = await request(`/games/${code}/next`, {}, gToken);
assert.equal(gAdvQ1.status, 200, 'Player B independently advances to Question 2');
assert.equal(gAdvQ1.data.index, 1, 'Player B is now on Question 2 (index 1)');
console.log('PASS 7: Player B can independently advance to Question 2');

// 8. Both players retain separate answers and scores
const hPollAfter = await request(`/games/${code}`, null, hToken);
const gPollAfter = await request(`/games/${code}`, null, gToken);
assert.equal(hPollAfter.data.score, hScoreQ0, 'Player A retains separate score');
assert.equal(gPollAfter.data.score, gScoreQ0, 'Player B retains separate score');
console.log('PASS 8: Both players retain separate answers and scores');

// ============================================================================
// TESTS 9 - 12: PROGRESSION POWERS, SPECTATOR RESTRICTIONS, & SECURITY
// ============================================================================
console.log('\n--- VERIFYING REQUIREMENTS 9 - 12: PERMISSIONS & SECURITY CHECKS ---');

// 9. Host has no progression power over other players
// When Player A (host) answered Q1 and advanced to Q2, Player B was NOT advanced.
const hAnsQ1 = await request(`/games/${code}/answer`, { index: 1, choice: 0 }, hToken);
assert.equal(hAnsQ1.status, 200);
const hAdvQ2 = await request(`/games/${code}/next`, {}, hToken);
assert.equal(hAdvQ2.status, 200);
assert.equal(hAdvQ2.data.index, 2, 'Host advanced to index 2');

// Check guest: guest MUST still be at index 1!
const gCheckIndex = await request(`/games/${code}`, null, gToken);
assert.equal(gCheckIndex.data.index, 1, 'Host advance had ZERO effect on Guest index');
console.log('PASS 9: Host has no progression power over other players');

// 10 & 11: Spectator-host and non-host spectator cannot advance any player's question
const specHostUser = `spec_h_${uid}`;
const nonHostSpecUser = `spec_nh_${uid}`;
const playerInSpecUser = `player_s_${uid}`;

const shReg = await request('/auth/signup', { username: specHostUser, name: 'Spec Host', password: 'Password123' });
const nhsReg = await request('/auth/signup', { username: nonHostSpecUser, name: 'NonHost Spec', password: 'Password123' });
const pisReg = await request('/auth/signup', { username: playerInSpecUser, name: 'Player in Spec Room', password: 'Password123' });

const shToken = shReg.data.token;
const nhsToken = nhsReg.data.token;
const pisToken = pisReg.data.token;

const specGameRes = await request('/games', {
  questionCount: 3,
  duration: 5,
  hostRole: 'spectator',
  topic: 'Vocabulary'
}, shToken);
assert.equal(specGameRes.status, 200);
const specCode = specGameRes.data.code;

await request('/games/join', { code: specCode, role: 'spectator' }, nhsToken);
await request('/games/join', { code: specCode, role: 'player' }, pisToken);

await request(`/games/${specCode}/start`, {}, shToken);
await request('/test/advance-clock', { ms: 10100 });

// 10. Spectator-host cannot advance any question
const shNextRes = await request(`/games/${specCode}/next`, {}, shToken);
assert.equal(shNextRes.status, 403, 'Spectator-host cannot advance questions (403)');
console.log('PASS 10: Spectator-host cannot advance any player question');

// 11. Non-host spectator cannot advance any question
const nhsNextRes = await request(`/games/${specCode}/next`, {}, nhsToken);
assert.equal(nhsNextRes.status, 403, 'Non-host spectator cannot advance questions (403)');
console.log('PASS 11: Non-host spectator cannot advance any player question');

// 22. Spectators cannot answer or earn points
const shAnsRes = await request(`/games/${specCode}/answer`, { index: 0, choice: 0 }, shToken);
assert.equal(shAnsRes.status, 403, 'Spectator-host cannot answer (403)');
const nhsAnsRes = await request(`/games/${specCode}/answer`, { index: 0, choice: 0 }, nhsToken);
assert.equal(nhsAnsRes.status, 403, 'Non-host spectator cannot answer (403)');
console.log('PASS 22: Spectators cannot answer or earn points');

// 12. Direct API attempts to alter another player's progress or invalid index are rejected
// Player answers with wrong index (index 1 when at index 0)
const badIndexAns = await request(`/games/${specCode}/answer`, { index: 1, choice: 0 }, pisToken);
assert.equal(badIndexAns.status, 400, 'Answer with mismatched index rejected (400)');

// Non-member attempts to answer
const outsiderUser = `outsider_${uid}`;
const outReg = await request('/auth/signup', { username: outsiderUser, name: 'Outsider', password: 'Password123' });
const outAns = await request(`/games/${specCode}/answer`, { index: 0, choice: 0 }, outReg.data.token);
assert.ok(outAns.status === 404 || outAns.status === 403, 'Outsider cannot submit answers');
console.log('PASS 12: Direct API attempts to alter another player\'s progress or submit invalid index are rejected');

// ============================================================================
// TESTS 13 - 15: DUPLICATE / CONCURRENT NEXT REQUESTS & HOST TRANSFER
// ============================================================================
console.log('\n--- VERIFYING REQUIREMENTS 13 - 15: DUPLICATE, CONCURRENT REQUESTS & HOST TRANSFER ---');

// Player in spec game answers Q0
const pisAns0 = await request(`/games/${specCode}/answer`, { index: 0, choice: 0 }, pisToken);
assert.equal(pisAns0.status, 200);

// Advance to Q1
const pisNext1 = await request(`/games/${specCode}/next`, {}, pisToken);
assert.equal(pisNext1.status, 200);
assert.equal(pisNext1.data.index, 1);

// 13. Duplicate Next Question request cannot skip unanswered question
const pisDupNext = await request(`/games/${specCode}/next`, {}, pisToken);
assert.equal(pisDupNext.status, 400, 'Duplicate Next Question before answering Q1 must be rejected with 400');
const pisCheckIndex = await request(`/games/${specCode}`, null, pisToken);
assert.equal(pisCheckIndex.data.index, 1, 'Index remains 1 without skipping');
console.log('PASS 13: Duplicate Next Question requests cannot skip questions');

// 14. Simultaneous progression requests do not corrupt player state
// First answer Q1
await request(`/games/${specCode}/answer`, { index: 1, choice: 0 }, pisToken);
// Send 3 concurrent /next requests
const concurrentNexts = await Promise.all([
  request(`/games/${specCode}/next`, {}, pisToken),
  request(`/games/${specCode}/next`, {}, pisToken),
  request(`/games/${specCode}/next`, {}, pisToken),
]);
const successfulNexts = concurrentNexts.filter(r => r.status === 200);
const rejectedNexts = concurrentNexts.filter(r => r.status === 400);
assert.equal(successfulNexts.length, 1, 'Exactly one concurrent next request succeeds');
assert.equal(rejectedNexts.length, 2, 'Duplicate concurrent next requests rejected');
const pisPostConcurrent = await request(`/games/${specCode}`, null, pisToken);
assert.equal(pisPostConcurrent.data.index, 2, 'Index advanced strictly once to 2');
console.log('PASS 14: Simultaneous progression requests do not corrupt player state');

// 15. Host departure or host transfer does not alter player progression
// In our original game, host leaves.
const hLeaveRes = await request(`/games/${code}/leave`, {}, hToken);
assert.equal(hLeaveRes.status, 200);

// Guest should now be host, but Guest's index and score must remain EXACTLY what it was!
const gAfterHostLeave = await request(`/games/${code}`, null, gToken);
assert.equal(gAfterHostLeave.data.host, guestUser, 'Guest transferred to host');
assert.equal(gAfterHostLeave.data.index, 1, 'Guest index remains exactly 1');
assert.equal(gAfterHostLeave.data.score, gScoreQ0, 'Guest score remains intact');
console.log('PASS 15: Host departure or host transfer does not alter player progression or scores');

// ============================================================================
// TESTS 16 - 17: TIMER BEHAVIOR (PER-QUESTION TIMER REMOVED, OVERALL TIMER PRESERVED)
// ============================================================================
console.log('\n--- VERIFYING REQUIREMENTS 16 - 17: TIMER BEHAVIOR ---');

// 16. The per-question timer (answerDeadlineAt) is absent from player and spectator views
assert.equal(gAfterHostLeave.data.answerDeadlineAt, undefined, 'Player view does not have answerDeadlineAt');
const specPollCheck = await request(`/games/${specCode}`, null, shToken);
assert.equal(specPollCheck.data.answerDeadlineAt, undefined, 'Spectator view does not have answerDeadlineAt');
console.log('PASS 16: Per-question timer is absent from player and spectator interfaces');

// 17. The overall game timer persists through progression and refresh
const initialEndsAt = gAfterHostLeave.data.endsAt;
assert.ok(initialEndsAt > Date.now(), 'endsAt is a future timestamp');

// Advance test clock by 10s
await request('/test/advance-clock', { ms: 10000 });

// Guest answers Q1 and advances to Q2
await request(`/games/${code}/answer`, { index: 1, choice: 0 }, gToken);
const gAdvQ2 = await request(`/games/${code}/next`, {}, gToken);
assert.equal(gAdvQ2.status, 200);
assert.equal(gAdvQ2.data.endsAt, initialEndsAt, 'endsAt unchanged after advancing');

// Refresh
const gRefresh = await request(`/games/${code}`, null, gToken);
assert.equal(gRefresh.data.endsAt, initialEndsAt, 'endsAt unchanged after refresh');
console.log('PASS 17: Overall game timer persists through progression and refresh');

// ============================================================================
// TESTS 18 - 21: QUESTION COUNT, COMPLETION, INDEPENDENCE & EXPIRATION
// ============================================================================
console.log('\n--- VERIFYING REQUIREMENTS 18 - 21: QUESTION LIMITS, COMPLETION & EXPIRATION ---');

// In game 'code', Guest is on question index 2 (last question of 3 total).
// Answer question index 2. Submitting final question sets completed: true.
const gFinalAns = await request(`/games/${code}/answer`, { index: 2, choice: 0 }, gToken);
assert.equal(gFinalAns.status, 200);

// 18. No player receives more than the configured question count
assert.equal(gFinalAns.data.completed, true, 'Player marked completed on last question');
const gExtraNext = await request(`/games/${code}/next`, {}, gToken);
assert.equal(gExtraNext.status, 400, 'Cannot advance beyond configured question count');
console.log('PASS 18: No player receives more than the configured question count');

// 19. A completed player does not block another player's progress
// Let's create a new game with 2 active players: Fast Player and Slow Player
const fastUser = `fast_${uid}`;
const slowUser = `slow_${uid}`;
const fReg = await request('/auth/signup', { username: fastUser, name: 'Fast Player', password: 'Password123' });
const sReg = await request('/auth/signup', { username: slowUser, name: 'Slow Player', password: 'Password123' });
const fToken = fReg.data.token;
const sToken = sReg.data.token;

const indepGame = await request('/games', { questionCount: 3, duration: 5, topic: 'Animals' }, fToken);
const indepCode = indepGame.data.code;
await request('/games/join', { code: indepCode }, sToken);
await request(`/games/${indepCode}/start`, {}, fToken);
await request('/test/advance-clock', { ms: 10100 });

// Fast player answers Q0, advances to Q1, answers Q1, advances to Q2, answers Q2 -> finishes!
await request(`/games/${indepCode}/answer`, { index: 0, choice: 0 }, fToken);
await request(`/games/${indepCode}/next`, {}, fToken);
await request(`/games/${indepCode}/answer`, { index: 1, choice: 0 }, fToken);
await request(`/games/${indepCode}/next`, {}, fToken);
const fastDone = await request(`/games/${indepCode}/answer`, { index: 2, choice: 0 }, fToken);
assert.equal(fastDone.data.completed, true, 'Fast player completed');

// Verify room status is STILL playing because Slow Player is not completed!
const roomCheck = await request(`/games/${indepCode}`, null, sToken);
assert.equal(roomCheck.data.status, 'playing', 'Room is still playing while other player continues');
assert.equal(roomCheck.data.index, 0, 'Slow player is still on Question 0');

// Slow player can answer Q0, advance to Q1, answer Q1, advance to Q2, and answer Q2 without issue!
const slowAns0 = await request(`/games/${indepCode}/answer`, { index: 0, choice: 1 }, sToken);
assert.equal(slowAns0.status, 200, 'Slow player answers Q0 while Fast player is finished');
const slowAdv1 = await request(`/games/${indepCode}/next`, {}, sToken);
assert.equal(slowAdv1.status, 200, 'Slow player advances to Q1');
assert.equal(slowAdv1.data.index, 1);
const slowAns1 = await request(`/games/${indepCode}/answer`, { index: 1, choice: 1 }, sToken);
assert.equal(slowAns1.status, 200, 'Slow player answers Q1');
const slowAdv2 = await request(`/games/${indepCode}/next`, {}, sToken);
assert.equal(slowAdv2.status, 200, 'Slow player advances to Q2');
assert.equal(slowAdv2.data.index, 2);
const slowAns2 = await request(`/games/${indepCode}/answer`, { index: 2, choice: 1 }, sToken);
assert.equal(slowAns2.status, 200, 'Slow player answers final question');
assert.equal(slowAns2.data.completed, true);
assert.equal(slowAns2.data.status, 'finished', 'Game finishes when all players complete');
console.log('PASS 19: A completed player does not block another player\'s progress');

// 20. Overall game expiration finishes the room and prevents further actions
const expUser1 = `exp1_${uid}`;
const expUser2 = `exp2_${uid}`;
const e1Token = (await request('/auth/signup', { username: expUser1, name: 'Exp1', password: 'Password123' })).data.token;
const e2Token = (await request('/auth/signup', { username: expUser2, name: 'Exp2', password: 'Password123' })).data.token;

const expGame = await request('/games', { questionCount: 5, duration: 1, topic: 'Grammar' }, e1Token);
const expCode = expGame.data.code;
await request('/games/join', { code: expCode }, e2Token);
await request(`/games/${expCode}/start`, {}, e1Token);
await request('/test/advance-clock', { ms: 10100 });

// Both answer Q0
await request(`/games/${expCode}/answer`, { index: 0, choice: 0 }, e1Token);
await request(`/games/${expCode}/answer`, { index: 0, choice: 0 }, e2Token);

// Advance past 1-minute game duration (65,000ms)
await request('/test/advance-clock', { ms: 65000 });

// Any poll or action transitions game to finished
const pollExp = await request(`/games/${expCode}`, null, e1Token);
assert.equal(pollExp.data.status, 'finished', 'Game status is finished upon expiration');

// Submitting new answers rejected
const lateAns = await request(`/games/${expCode}/answer`, { index: 1, choice: 0 }, e2Token);
assert.equal(lateAns.status, 400, 'Answers rejected after game expiration (400)');
console.log('PASS 20: Overall game expiration finishes the room and prevents further actions');

// 21. Final scores remain consistent
const finCheck1 = await request(`/games/${expCode}`, null, e1Token);
const finCheck2 = await request(`/games/${expCode}`, null, e2Token);
assert.equal(finCheck1.data.status, 'finished');
assert.equal(finCheck2.data.status, 'finished');
assert.deepEqual(finCheck1.data.leaderboard, finCheck2.data.leaderboard, 'Leaderboard is identical across refreshes');
console.log('PASS 21: Final scores and leaderboard remain consistent');

// ============================================================================
// TEST 24: CAPACITY RULES (100 ACTIVE PLAYERS, 20 SPECTATORS)
// ============================================================================
console.log('\n--- VERIFYING REQUIREMENT 24: CAPACITY RULES (100 ACTIVE PLAYERS, 20 SPECTATORS) ---');
const capHost = `caph_${uid}`;
const capHostToken = (await request('/auth/signup', { username: capHost, name: 'Cap Host', password: 'Password123' })).data.token;
const capGame = await request('/games', { questionCount: 3, duration: 5, topic: 'Vocabulary' }, capHostToken);
const capCode = capGame.data.code;

assert.equal(capGame.data.maxPlayers, 100);
assert.equal(capGame.data.maxSpectators, 20);

// Join 99 active players to reach 100
const pTokens = [];
for (let i = 2; i <= 100; i++) {
  const u = `capp_${i}_${uid}`;
  const s = await request('/auth/signup', { username: u, name: `Player ${i}`, password: 'Password123' });
  pTokens.push(s.data.token);
  const j = await request('/games/join', { code: capCode }, s.data.token);
  assert.equal(j.status, 200);
}

const fullPoll = await request(`/games/${capCode}`, null, capHostToken);
assert.equal(fullPoll.data.activePlayerCount, 100);

// 101st active player rejected
const p101 = (await request('/auth/signup', { username: `capp_101_${uid}`, name: 'P101', password: 'Password123' })).data.token;
const rej101 = await request('/games/join', { code: capCode }, p101);
assert.equal(rej101.status, 400);

// 20 spectators can join
for (let i = 1; i <= 20; i++) {
  const su = `caps_${i}_${uid}`;
  const st = (await request('/auth/signup', { username: su, name: `Spec ${i}`, password: 'Password123' })).data.token;
  const sj = await request('/games/join', { code: capCode, role: 'spectator' }, st);
  assert.equal(sj.status, 200);
}

const fullSpecsPoll = await request(`/games/${capCode}`, null, capHostToken);
assert.equal(fullSpecsPoll.data.activePlayerCount, 100);
assert.equal(fullSpecsPoll.data.spectatorCount, 20);

// 21st spectator rejected
const s21 = (await request('/auth/signup', { username: `caps_21_${uid}`, name: 'Spec 21', password: 'Password123' })).data.token;
const rejSpec21 = await request('/games/join', { code: capCode, role: 'spectator' }, s21);
assert.equal(rejSpec21.status, 400);
console.log('PASS 24: Existing capacity rules of 100 active players and 20 spectators continue working');

console.log('\n============================================================');
console.log('--- ALL 24 PHASE 5 REGRESSION TESTS PASSED SUCCESSFULLY! ---');
console.log('============================================================\n');
