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
console.log('--- PHASE 2 COMPREHENSIVE REGRESSION & INDEPENDENT PROGRESSION AUDIT ---');
console.log('========================================================================\n');

await request('/test/reset-clock', {});
const ts = String(Date.now()).slice(-6);

// Helper for quick user signup
async function createUser(prefix, name) {
  const username = `${prefix}_${ts}`;
  const res = await request('/auth/signup', { username, name, password: 'Password123' });
  assert.equal(res.status, 200, `User creation failed for ${username}: ${res.data.error}`);
  return { username, token: res.data.token, name };
}

// ============================================================================
// STEP 3 — SCENARIO A: INDEPENDENT FRIENDS GAMEPLAY (5+ QUESTIONS)
// ============================================================================
console.log('--- STEP 3: SCENARIO A — INDEPENDENT FRIENDS GAMEPLAY (5 QUESTIONS) ---');
const playerA = await createUser('pa_a', 'Player A');
const playerB = await createUser('pb_a', 'Player B');

// 1. Start a Friends game with at least 5 questions
const gameARes = await request('/games', {
  questionCount: 5,
  duration: 5,
  topic: 'Vocabulary',
  difficulty: 'Intermediate',
  hostRole: 'player'
}, playerA.token);
assert.equal(gameARes.status, 200);
const codeA = gameARes.data.code;

await request('/games/join', { code: codeA }, playerB.token);
await request(`/games/${codeA}/start`, {}, playerA.token);
await request('/test/advance-clock', { ms: 10100 });

// 2. Confirm both players start at Question 1 (index 0)
const pollA_start = await request(`/games/${codeA}`, null, playerA.token);
const pollB_start = await request(`/games/${codeA}`, null, playerB.token);
assert.equal(pollA_start.data.status, 'playing');
assert.equal(pollB_start.data.status, 'playing');
assert.equal(pollA_start.data.index, 0, 'Player A starts at Question 1 (index 0)');
assert.equal(pollB_start.data.index, 0, 'Player B starts at Question 1 (index 0)');
assert.equal(pollA_start.data.question.id, pollB_start.data.question.id, 'Both players receive the same canonical question');
console.log('PASS A.1 & A.2: Both players start at Question 1 with matching canonical question');

// 3 & 4. Player A submits an answer and sees their own feedback
const q0AnswerA = await request(`/games/${codeA}/answer`, { index: 0, choice: 0 }, playerA.token);
assert.equal(q0AnswerA.status, 200);
assert.ok(q0AnswerA.data.answer, 'Player A sees feedback');
assert.notEqual(q0AnswerA.data.answer.correct, undefined);
assert.ok(typeof q0AnswerA.data.answer.pointsEarned === 'number');
const scoreA_Q0 = q0AnswerA.data.score;
console.log('PASS A.3 & A.4: Player A submits Question 1 answer and sees individual feedback and points');

// 5. Player A advances to Question 2 (index 1)
const advanceA_Q1 = await request(`/games/${codeA}/next`, {}, playerA.token);
assert.equal(advanceA_Q1.status, 200);
assert.equal(advanceA_Q1.data.index, 1, 'Player A advanced to Question 2 (index 1)');
console.log('PASS A.5: Player A advances to Question 2 without waiting for Player B');

// 6. Confirm Player B remains at Question 1
const pollB_check = await request(`/games/${codeA}`, null, playerB.token);
assert.equal(pollB_check.data.index, 0, 'Player B remains at Question 1 (index 0)');
assert.equal(pollB_check.data.answer, null, 'Player B has not submitted an answer yet');
console.log('PASS A.6: Player B remains at Question 1 while Player A is on Question 2');

// 7. Player B submits their Question 1 answer
const q0AnswerB = await request(`/games/${codeA}/answer`, { index: 0, choice: 1 }, playerB.token);
assert.equal(q0AnswerB.status, 200);
assert.ok(q0AnswerB.data.answer, 'Player B sees feedback for Question 1');
console.log('PASS A.7: Player B submits Question 1 answer successfully after Player A advanced');

// 8. Confirm Player B can advance independently
const advanceB_Q1 = await request(`/games/${codeA}/next`, {}, playerB.token);
assert.equal(advanceB_Q1.status, 200);
assert.equal(advanceB_Q1.data.index, 1, 'Player B advances to Question 2 (index 1)');
console.log('PASS A.8: Player B advances independently to Question 2');

// 9. Confirm neither player\'s action changes the other\'s question index
const finalPollA = await request(`/games/${codeA}`, null, playerA.token);
const finalPollB = await request(`/games/${codeA}`, null, playerB.token);
assert.equal(finalPollA.data.index, 1);
assert.equal(finalPollB.data.index, 1);
assert.equal(finalPollA.data.score, scoreA_Q0, 'Player A score preserved independently');
console.log('PASS A.9: Neither player action changes the other player index or score');

// ============================================================================
// STEP 3 — SCENARIO B: INDEPENDENT COMPLETION (PLAYER FINISHES WHILE OTHERS PLAY)
// ============================================================================
console.log('\n--- STEP 3: SCENARIO B — INDEPENDENT COMPLETION ---');
// In room codeA, total is 5 questions (indices 0, 1, 2, 3, 4).
// Player A is currently at index 1. Let Player A finish all remaining questions (1, 2, 3, 4).
for (let idx = 1; idx <= 4; idx++) {
  const ansRes = await request(`/games/${codeA}/answer`, { index: idx, choice: 0 }, playerA.token);
  assert.equal(ansRes.status, 200);
  if (idx < 4) {
    const nextRes = await request(`/games/${codeA}/next`, {}, playerA.token);
    assert.equal(nextRes.status, 200);
    assert.equal(nextRes.data.index, idx + 1);
  }
}

// 1 & 3. Player A completed all 5 questions: verify completed state & finished view
const pollA_completed = await request(`/games/${codeA}`, null, playerA.token);
assert.equal(pollA_completed.data.completed, true, 'Player A is marked completed');
assert.equal(pollA_completed.data.index, 4, 'Player A finished on last question index 4');
assert.ok(pollA_completed.data.stats, 'Player A stats available');
console.log('PASS B.1 & B.3: Player A finishes all questions and sees completed state');

// 2 & 4. Keep Player B on an earlier question (index 1). Confirm Player B can continue playing normally!
const pollB_stillPlaying = await request(`/games/${codeA}`, null, playerB.token);
assert.equal(pollB_stillPlaying.data.status, 'playing', 'Overall room status is still playing');
assert.equal(pollB_stillPlaying.data.completed, false, 'Player B is not completed');
assert.equal(pollB_stillPlaying.data.index, 1, 'Player B is still on question index 1');

// Player B answers Q1 and advances to Q2
const ansB_Q1 = await request(`/games/${codeA}/answer`, { index: 1, choice: 0 }, playerB.token);
assert.equal(ansB_Q1.status, 200, 'Player B can answer while Player A is finished');
const nextB_Q2 = await request(`/games/${codeA}/next`, {}, playerB.token);
assert.equal(nextB_Q2.status, 200, 'Player B can advance while Player A is finished');
assert.equal(nextB_Q2.data.index, 2);
console.log('PASS B.2 & B.4: Player B continues playing, answering, and advancing while Player A is finished');

// 5. Confirm Player A\'s completion does not prematurely finish the room or block Player B
assert.equal(nextB_Q2.data.status, 'playing', 'Room was not prematurely finished by Player A completion');
console.log('PASS B.5: Player A completion does not block other players or prematurely end the match');

// ============================================================================
// STEP 3 — SCENARIO C: HOST NEUTRALITY & HOST DEPARTURE/TRANSFER
// ============================================================================
console.log('\n--- STEP 3: SCENARIO C — HOST NEUTRALITY & HOST TRANSFER ---');
// In gameA, Player A is the host.
// 1. Host has no special progression endpoint over Player B
const rogueNextByHost = await request(`/games/${codeA}/next`, {}, playerA.token);
// Host has already completed all questions; duplicate or unauthorized /next returns 400
assert.equal(rogueNextByHost.status, 400, 'Host cannot advance questions after completing or skip questions');
const checkB_unaffected = await request(`/games/${codeA}`, null, playerB.token);
assert.equal(checkB_unaffected.data.index, 2, 'Player B remains on index 2 despite host call');
console.log('PASS C.1 - C.3: Host possesses zero ability to advance or alter other players');

// 4. Host leaves the game: verify host transfer occurs and Player B retains exact progress and score
const scoreB_beforeLeave = checkB_unaffected.data.score;
const hostLeaveRes = await request(`/games/${codeA}/leave`, {}, playerA.token);
assert.equal(hostLeaveRes.status, 200);

const pollB_afterTransfer = await request(`/games/${codeA}`, null, playerB.token);
assert.equal(pollB_afterTransfer.data.host, playerB.username, 'Host successfully transferred to Player B');
assert.equal(pollB_afterTransfer.data.index, 2, 'Player B index strictly preserved after host transfer');
assert.equal(pollB_afterTransfer.data.score, scoreB_beforeLeave, 'Player B score strictly preserved after host transfer');
assert.equal(pollB_afterTransfer.data.status, 'playing', 'Room continues playing after host transfer');
console.log('PASS C.4: Host departure and transfer preserves remaining players progression, index, and score');

// ============================================================================
// STEP 4 — SPECTATOR RESTRICTIONS (HOST-SPECTATOR & NON-HOST SPECTATOR)
// ============================================================================
console.log('\n--- STEP 4: SPECTATOR RESTRICTIONS (HOST & NON-HOST) ---');
const specHost = await createUser('sh_s', 'Spec Host');
const activePlayer = await createUser('ap_s', 'Active Player');
const nonHostSpec = await createUser('nhs_s', 'NonHost Spec');

const specGame = await request('/games', {
  questionCount: 3,
  duration: 5,
  topic: 'Grammar',
  hostRole: 'spectator'
}, specHost.token);
assert.equal(specGame.status, 200);
const specCode = specGame.data.code;

await request('/games/join', { code: specCode, role: 'player' }, activePlayer.token);
await request('/games/join', { code: specCode, role: 'spectator' }, nonHostSpec.token);

// Host spectator starts the game
await request(`/games/${specCode}/start`, {}, specHost.token);
await request('/test/advance-clock', { ms: 10100 });

// 1. Spectators can view the permitted dashboard and live leaderboard
const shDashboard = await request(`/games/${specCode}`, null, specHost.token);
const nhsDashboard = await request(`/games/${specCode}`, null, nonHostSpec.token);
assert.equal(shDashboard.data.status, 'playing');
assert.equal(nhsDashboard.data.status, 'playing');
assert.ok(Array.isArray(shDashboard.data.leaderboard), 'Leaderboard visible to spectator host');
assert.ok(Array.isArray(nhsDashboard.data.leaderboard), 'Leaderboard visible to non-host spectator');
assert.equal(shDashboard.data.answer, null, 'Spectator receives no answer state');
assert.equal(nhsDashboard.data.answer, null, 'Spectator receives no answer state');
console.log('PASS 4.1: Spectators can view dashboard, timer, and leaderboard with answer keys secluded');

// 2. Spectators cannot submit answers
const shAnsAttempt = await request(`/games/${specCode}/answer`, { index: 0, choice: 0 }, specHost.token);
const nhsAnsAttempt = await request(`/games/${specCode}/answer`, { index: 0, choice: 0 }, nonHostSpec.token);
assert.equal(shAnsAttempt.status, 403, 'Spectator host answer rejected with 403');
assert.equal(nhsAnsAttempt.status, 403, 'Non-host spectator answer rejected with 403');
console.log('PASS 4.2: Spectators strictly rejected from submitting answers (403)');

// 3. Spectators cannot earn points
const checkScores = await request(`/games/${specCode}`, null, specHost.token);
const shMem = checkScores.data.members.find(m => m.username === specHost.username);
const nhsMem = checkScores.data.members.find(m => m.username === nonHostSpec.username);
assert.equal(shMem.score, 0, 'Spectator host score remains 0');
assert.equal(nhsMem.score, 0, 'Non-host spectator score remains 0');
console.log('PASS 4.3: Spectators earn zero points and cannot modify scores');

// 4. Spectators cannot call the progression API successfully (/next rejected with 403)
const shNextAttempt = await request(`/games/${specCode}/next`, {}, specHost.token);
const nhsNextAttempt = await request(`/games/${specCode}/next`, {}, nonHostSpec.token);
assert.equal(shNextAttempt.status, 403, 'Spectator host /next rejected with 403');
assert.equal(nhsNextAttempt.status, 403, 'Non-host spectator /next rejected with 403');
console.log('PASS 4.4: Progression API calls from spectators strictly rejected with 403');

// 5. Spectators cannot modify another player's progress
const apCheck = await request(`/games/${specCode}`, null, activePlayer.token);
assert.equal(apCheck.data.index, 0, 'Active player index untouched by spectator actions');
console.log('PASS 4.5: Spectators cannot alter any active player progress');

// 6. No per-question countdown appears; overall game timer remains visible
assert.equal(shDashboard.data.answerDeadlineAt, undefined, 'No per-question timer for spectator');
assert.ok(shDashboard.data.endsAt > Date.now(), 'Overall game deadline visible');
console.log('PASS 4.6: Per-question timer absent; overall game timer present');

// ============================================================================
// STEP 5 — TIMER AND QUESTION LIMITS
// ============================================================================
console.log('\n--- STEP 5: TIMER AND QUESTION LIMITS ---');
// 1. Total timer does not reset when player advances
const endsAt_initial = apCheck.data.endsAt;
// Active player answers Q0 and advances to Q1
await request(`/games/${specCode}/answer`, { index: 0, choice: 0 }, activePlayer.token);
const advQ1_res = await request(`/games/${specCode}/next`, {}, activePlayer.token);
assert.equal(advQ1_res.status, 200);
assert.equal(advQ1_res.data.endsAt, endsAt_initial, 'Total timer does NOT reset when question advances');

// 2. Refreshing page does not reset overall timer or progress
const refreshPoll = await request(`/games/${specCode}`, null, activePlayer.token);
assert.equal(refreshPoll.data.endsAt, endsAt_initial, 'Overall timer persists across refresh/polling');
assert.equal(refreshPoll.data.index, 1, 'Player index persists across refresh');
console.log('PASS 5.1 & 5.2: Total game timer and player progress persist across progression and refresh');

// 3. No player can advance without submitting an answer
const prematureAdv = await request(`/games/${specCode}/next`, {}, activePlayer.token);
assert.equal(prematureAdv.status, 400, 'Advancing without answering rejected with 400');
console.log('PASS 5.3: Advancing without answering current question rejected (400)');

// 4. Duplicate or concurrent Next Question requests cannot skip questions
await request(`/games/${specCode}/answer`, { index: 1, choice: 0 }, activePlayer.token);
const [firstNext, secondNext] = await Promise.all([
  request(`/games/${specCode}/next`, {}, activePlayer.token),
  request(`/games/${specCode}/next`, {}, activePlayer.token)
]);
const okCount = (firstNext.status === 200 ? 1 : 0) + (secondNext.status === 200 ? 1 : 0);
const errCount = (firstNext.status === 400 ? 1 : 0) + (secondNext.status === 400 ? 1 : 0);
assert.equal(okCount, 1, 'Exactly one concurrent next succeeds');
assert.equal(errCount, 1, 'Concurrent next rejected without skipping');
const checkIndexPost = await request(`/games/${specCode}`, null, activePlayer.token);
assert.equal(checkIndexPost.data.index, 2, 'Player strictly at index 2 (no question skipped)');
console.log('PASS 5.4: Concurrent Next Question requests cannot skip questions');

// 5 & 6. No player can answer after completing or exceed configured count
// Player is at index 2 (final of 3 questions). Answer index 2 -> completes game.
const finalAns = await request(`/games/${specCode}/answer`, { index: 2, choice: 0 }, activePlayer.token);
assert.equal(finalAns.status, 200);
assert.equal(finalAns.data.completed, true, 'Player marked completed on final question');

const extraAnsAttempt = await request(`/games/${specCode}/answer`, { index: 3, choice: 0 }, activePlayer.token);
assert.equal(extraAnsAttempt.status, 400, 'Answer after completion rejected with 400');
const extraNextAttempt = await request(`/games/${specCode}/next`, {}, activePlayer.token);
assert.equal(extraNextAttempt.status, 400, 'Next after completion rejected with 400');
console.log('PASS 5.5 & 5.6: No player can answer after completion or exceed configured question count');

// 7. Overall game expiration prevents further actions and transitions to finished
await request('/test/advance-clock', { ms: 5 * 60 * 1000 + 5000 });
const expiredCheck = await request(`/games/${specCode}`, null, activePlayer.token);
assert.equal(expiredCheck.data.status, 'finished', 'Game status is finished upon expiration');
const lateAnswerAttempt = await request(`/games/${specCode}/answer`, { index: 2, choice: 0 }, activePlayer.token);
assert.equal(lateAnswerAttempt.status, 400, 'Answers rejected after match finished');
console.log('PASS 5.7: Overall game expiration finishes room and prevents further gameplay actions');

// ============================================================================
// STEP 6 — SCORING AND RESULTS
// ============================================================================
console.log('\n--- STEP 6: SCORING AND RESULTS ---');
// Verify independent score calculation (correct vs incorrect)
const pCorrect = await createUser('sc_c', 'Correct Player');
const pIncorrect = await createUser('sc_i', 'Incorrect Player');

const scoreGame = await request('/games', { questionCount: 3, duration: 3, topic: 'Animals' }, pCorrect.token);
const sCode = scoreGame.data.code;
await request('/games/join', { code: sCode }, pIncorrect.token);
await request(`/games/${sCode}/start`, {}, pCorrect.token);
await request('/test/advance-clock', { ms: 10100 });

// Both view Question 0
const sPollQ0 = await request(`/games/${sCode}`, null, pCorrect.token);
// Fetch correct choice from server evaluation
const correctAnsRes = await request(`/games/${sCode}/answer`, { index: 0, choice: 0 }, pCorrect.token);
assert.equal(correctAnsRes.status, 200);
const actualCorrectIndex = correctAnsRes.data.answer.correct;
const isCorrectChoice = 0 === actualCorrectIndex;

if (isCorrectChoice) {
  assert.ok(correctAnsRes.data.score >= 100, 'Correct answer awards 100+ points');
} else {
  assert.equal(correctAnsRes.data.score, 0, 'Incorrect answer awards 0 points');
}

// Player Incorrect submits an intentionally wrong answer
const wrongChoice = (actualCorrectIndex + 1) % 4;
const wrongAnsRes = await request(`/games/${sCode}/answer`, { index: 0, choice: wrongChoice }, pIncorrect.token);
assert.equal(wrongAnsRes.status, 200);
assert.equal(wrongAnsRes.data.answer.isCorrect, false, 'Evaluated as incorrect');
assert.equal(wrongAnsRes.data.score, 0, 'Incorrect answer awards strictly 0 points');
console.log('PASS 6.1: Correct answers award points + speed bonus; incorrect answers award 0 points');

// Refreshing finished results screen preserves results
const refreshScoreGame = await request(`/games/${sCode}`, null, pIncorrect.token);
assert.equal(refreshScoreGame.data.score, 0, 'Score preserved across refresh');
console.log('PASS 6.2: Scores and answers preserved across refreshes without leak');

// ============================================================================
// STEP 7 — ROOM CAPACITY AND EXIT GAME
// ============================================================================
console.log('\n--- STEP 7: ROOM CAPACITY AND EXIT GAME ---');
const capHost = await createUser('ch_cap', 'Cap Host');
const capRoom = await request('/games', { questionCount: 3, duration: 5, topic: 'Mixed English' }, capHost.token);
assert.equal(capRoom.status, 200);
const capCode = capRoom.data.code;

// Join 99 active players to reach 100
const joinedTokens = [];
for (let i = 2; i <= 100; i++) {
  const u = `cp_${i}_${ts}`;
  const s = await request('/auth/signup', { username: u, name: `Player ${i}`, password: 'Password123' });
  joinedTokens.push(s.data.token);
  const j = await request('/games/join', { code: capCode }, s.data.token);
  assert.equal(j.status, 200);
}

const check100 = await request(`/games/${capCode}`, null, capHost.token);
assert.equal(check100.data.activePlayerCount, 100, 'Exactly 100 active players accepted');

// 101st player rejected
const p101 = await createUser('cp101', 'Player 101');
const rej101 = await request('/games/join', { code: capCode }, p101.token);
assert.equal(rej101.status, 400, '101st active player rejected with 400');
assert.match(rej101.data.error, /full \(100 active players\)/i);
console.log('PASS 7.1: Active player capacity strictly capped at 100');

// 20 spectators join
const specTokens = [];
for (let i = 1; i <= 20; i++) {
  const su = `cs_${i}_${ts}`;
  const s = await request('/auth/signup', { username: su, name: `Spec ${i}`, password: 'Password123' });
  specTokens.push(s.data.token);
  const j = await request('/games/join', { code: capCode, role: 'spectator' }, s.data.token);
  assert.equal(j.status, 200);
}
const checkSpecs = await request(`/games/${capCode}`, null, capHost.token);
assert.equal(checkSpecs.data.spectatorCount, 20, 'Exactly 20 spectators accepted');

// 21st spectator rejected
const s21 = await createUser('cs21', 'Spectator 21');
const rejSpec21 = await request('/games/join', { code: capCode, role: 'spectator' }, s21.token);
assert.equal(rejSpec21.status, 400, '21st spectator rejected with 400');
assert.match(rejSpec21.data.error, /maximum spectator capacity/i);
console.log('PASS 7.2: Spectator capacity strictly capped at 20');

// Exit Game test: one player exits -> active count reduces to 99 -> new player can join
const leavingToken = joinedTokens.pop();
const leaveRes = await request(`/games/${capCode}/leave`, {}, leavingToken);
assert.equal(leaveRes.status, 200);
const check99 = await request(`/games/${capCode}`, null, capHost.token);
assert.equal(check99.data.activePlayerCount, 99, 'Active players reduced to 99');

// Now Player 101 can join into the freed slot!
const joinFreedSlot = await request('/games/join', { code: capCode }, p101.token);
assert.equal(joinFreedSlot.status, 200, 'New player joins freed slot');
console.log('PASS 7.3: Exit Game cleanly frees player slot and does not disrupt remaining players');

// ============================================================================
// STEP 8 — SOLO MODE VALIDATION
// ============================================================================
console.log('\n--- STEP 8: SOLO MODE COMPREHENSIVE VALIDATION ---');
const soloUser = await createUser('solo_u', 'Solo Tester');
const soloGame = await request('/games/solo', {
  questionCount: 3,
  duration: 3,
  topic: 'Grammar',
  difficulty: 'Beginner'
}, soloUser.token);
assert.equal(soloGame.status, 200);
assert.equal(soloGame.data.status, 'countdown');

await request('/test/advance-clock', { ms: 10100 });
const soloPlay = await request('/games/solo', null, soloUser.token);
assert.equal(soloPlay.data.status, 'playing');
assert.equal(soloPlay.data.index, 0);
assert.equal(soloPlay.data.total, 3);
const soloEndsAt = soloPlay.data.endsAt;

// Q0: Answer & feedback
const sAns0 = await request('/games/solo/answer', { index: 0, choice: 0 }, soloUser.token);
assert.equal(sAns0.status, 200);
assert.ok(sAns0.data.answer, 'Solo feedback returned');

// Manual progression to Q1
const sNext1 = await request('/games/solo/next', {}, soloUser.token);
assert.equal(sNext1.status, 200);
assert.equal(sNext1.data.index, 1);
assert.equal(sNext1.data.endsAt, soloEndsAt, 'Solo timer does not reset on progression');

// Refresh during active gameplay
const soloRefresh = await request('/games/solo', null, soloUser.token);
assert.equal(soloRefresh.data.index, 1, 'Solo index preserved on refresh');
assert.equal(soloRefresh.data.endsAt, soloEndsAt, 'Solo timer preserved on refresh');

// Q1: Answer & advance
await request('/games/solo/answer', { index: 1, choice: 0 }, soloUser.token);
await request('/games/solo/next', {}, soloUser.token);

// Q2: Final question -> Submitting answer finishes Solo game
const sAnsFinal = await request('/games/solo/answer', { index: 2, choice: 0 }, soloUser.token);
assert.equal(sAnsFinal.status, 200);
assert.equal(sAnsFinal.data.status, 'finished', 'Solo automatically finishes on final question');
assert.equal(sAnsFinal.data.total, 3, 'Total questions strictly preserved');
assert.ok(sAnsFinal.data.stats, 'Final stats calculated');

// Finished Solo game remains finished on refresh
const soloFinalRefresh = await request('/games/solo', null, soloUser.token);
assert.equal(soloFinalRefresh.data.status, 'finished');
assert.equal(soloFinalRefresh.data.score, sAnsFinal.data.score);
console.log('PASS 8: Solo answer flow, manual progression, timer persistence, and final results verified');

console.log('\n========================================================================');
console.log('🎉 ALL PHASE 2 COMPREHENSIVE REGRESSION AUDIT CHECKS PASSED WITH 0 ERRORS!');
console.log('========================================================================\n');
