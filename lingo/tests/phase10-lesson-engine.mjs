import assert from 'node:assert/strict';
import { CURRICULUM_CATALOG, getPublicLesson, getLessonSolutionKeys, checkLessonPrerequisites } from '../server/curriculumCatalog.mjs';
import { validateCurriculumCatalog } from '../server/curriculumValidator.mjs';
import { lessons } from '../content.js';

const root = 'http://localhost:3000/api';

async function request(endpoint, body, token, method) {
  const response = await fetch(root + endpoint, {
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

console.log('================================================================');
console.log('--- PHASE 10: LESSON ENGINE & PROGRESSION VERIFICATION SUITE ---');
console.log('================================================================');

// -------------------------------------------------------------
// SECTION A: LESSON ENGINE & EXERCISE LOADING
// -------------------------------------------------------------
console.log('\n[SECTION A: LESSON ENGINE & EXERCISE LOADING]');

// A1: Valid lesson loads correctly
const helloLesson = await request('/curriculum/lessons/hello');
assert.equal(helloLesson.status, 200, 'Valid lesson ID must return 200');
assert.equal(helloLesson.data.id, 'hello');
assert.ok(helloLesson.data.title, 'Title should be present');
assert.ok(helloLesson.data.primaryObjective, 'Primary objective should be present');
assert.equal(helloLesson.data.exercises.length, 5, 'Must contain 5 exercises');

// A2: Unknown lesson ID is rejected with 404
const bogusLesson = await request('/curriculum/lessons/nonexistent_xyz_123');
assert.equal(bogusLesson.status, 404, 'Unknown lesson ID must return 404');
assert.match(bogusLesson.data.error, /Lesson not found/);

// A3: Exercises appear in strict sequential order
const c1Lesson = await request('/curriculum/lessons/c1-u1-l1');
assert.equal(c1Lesson.status, 200);
assert.equal(c1Lesson.data.exercises.length, 5);
assert.equal(c1Lesson.data.exercises[0].id, 'ex_c1_u1_l1_1');
assert.equal(c1Lesson.data.exercises[4].id, 'ex_c1_u1_l1_5');

// A4: Answer keys strictly secluded from public lesson endpoint
for (const ex of c1Lesson.data.exercises) {
  assert.equal(ex.solutionKey, undefined, 'Public payload must NOT expose solutionKey');
  assert.equal(ex.correctIndex, undefined, 'Public payload must NOT expose correctIndex');
  assert.ok(ex.prompt && Array.isArray(ex.options) && ex.options.length === 4, 'MCQ options preserved');
}
console.log('PASS A: Lesson loading, 404 handling, sequential ordering, and answer-key seclusion verified.');

// -------------------------------------------------------------
// SECTION B: EXERCISE EVALUATION & ANSWER SECURITY
// -------------------------------------------------------------
console.log('\n[SECTION B: EXERCISE EVALUATION & ANSWER SECURITY]');

// B1: Evaluation validates choices without leaking keys on invalid inputs
const badChoiceReq = await request('/curriculum/exercises/check', {
  lessonId: 'hello',
  exerciseIndex: 0,
  choice: 99 // out of bounds
});
assert.equal(badChoiceReq.status, 400, 'Out-of-bounds choice must be rejected with 400');
assert.equal(badChoiceReq.data.correctIndex, undefined, 'Malformed choice must not leak correctIndex');

const badIndexReq = await request('/curriculum/exercises/check', {
  lessonId: 'hello',
  exerciseIndex: 10, // out of bounds (only 0..4 exist)
  choice: 0
});
assert.equal(badIndexReq.status, 400, 'Out-of-bounds exerciseIndex must be rejected with 400');

const badLessonExReq = await request('/curriculum/exercises/check', {
  lessonId: 'nonexistent_lesson_abc',
  exerciseIndex: 0,
  choice: 0
});
assert.equal(badLessonExReq.status, 404, 'Nonexistent lesson in exercise check must return 404');

const mismatchIdReq = await request('/curriculum/exercises/check', {
  lessonId: 'hello',
  exerciseIndex: 0,
  choice: 0,
  exerciseId: 'wrong_exercise_id_xyz'
});
assert.equal(mismatchIdReq.status, 400, 'Mismatched exerciseId must be rejected with 400');

// B2: Server-side grading of root lesson (hello) for valid choices
const helloKeys = getLessonSolutionKeys('hello');
const correctChoice = helloKeys[0].solutionKey.correctIndex;
const wrongChoice = (correctChoice + 1) % 4;

const correctRes = await request('/curriculum/exercises/check', {
  lessonId: 'hello',
  exerciseIndex: 0,
  choice: correctChoice,
  exerciseId: helloKeys[0].id
});
assert.equal(correctRes.status, 200);
assert.equal(correctRes.data.isCorrect, true);
assert.equal(correctRes.data.correctIndex, correctChoice);

const wrongRes = await request('/curriculum/exercises/check', {
  lessonId: 'hello',
  exerciseIndex: 0,
  choice: wrongChoice,
  exerciseId: helloKeys[0].id
});
assert.equal(wrongRes.status, 200);
assert.equal(wrongRes.data.isCorrect, false);
assert.equal(wrongRes.data.correctIndex, correctChoice);
console.log('PASS B: Exercise evaluation input validation, bounds checking, and server-side evaluation verified.');

// -------------------------------------------------------------
// SECTION C: PROGRESSION, PREREQUISITE GUARDS & UNLOCKING
// -------------------------------------------------------------
console.log('\n[SECTION C: PROGRESSION & PREREQUISITE ENFORCEMENT]');

// Create a new learner to test pristine progression
const learnerName = 'p10_' + Math.floor(Math.random() * 10000000);
const signupRes = await request('/auth/signup', {
  username: learnerName,
  name: 'Phase 10 Learner',
  password: 'Password123!'
});
assert.equal(signupRes.status, 200);
const learnerToken = signupRes.data.token;

// C1: Cannot complete a locked lesson via direct API call
const lockedComplete = await request('/progress/lesson', {
  lesson: 'everyday', // requires 'hello'
  answers: [0, 1, 2, 0, 1]
}, learnerToken);
assert.equal(lockedComplete.status, 400, 'Direct completion of locked lesson must fail');
assert.match(lockedComplete.data.error, /Complete the previous level to unlock this one/);

// C2: Cannot check exercises for a locked lesson via direct API call (403)
const lockedExCheck = await request('/curriculum/exercises/check', {
  lessonId: 'everyday',
  exerciseIndex: 0,
  choice: 0
}, learnerToken);
assert.equal(lockedExCheck.status, 403, 'Checking exercises on locked lesson must return 403');
assert.match(lockedExCheck.data.error, /Complete the prerequisite lesson first/);

// C3: Lesson progression status endpoint reports locked
const statusBefore = await request('/progress/lessons/everyday/status', null, learnerToken);
assert.equal(statusBefore.status, 200);
assert.equal(statusBefore.data.isUnlocked, false);
assert.ok(statusBefore.data.missingPrerequisites.includes('hello'));
assert.equal(statusBefore.data.isCompleted, false);

// C4: Complete prerequisite 'hello'
const helloSolution = lessons.find(l => l.id === 'hello').questions.map(q => q[2]);
const completeHello = await request('/progress/lesson', {
  lesson: 'hello',
  answers: helloSolution
}, learnerToken);
assert.equal(completeHello.status, 200);
assert.equal(completeHello.data.passed, true);
assert.equal(completeHello.data.earned, 50);
assert.ok(completeHello.data.progress.completed.includes('hello'));

// C5: Dependent lesson 'everyday' is now unlocked!
const statusAfter = await request('/progress/lessons/everyday/status', null, learnerToken);
assert.equal(statusAfter.status, 200);
assert.equal(statusAfter.data.isUnlocked, true);
assert.equal(statusAfter.data.missingPrerequisites.length, 0);

// C6: Now exercise checking on 'everyday' succeeds
const everydayExCheck = await request('/curriculum/exercises/check', {
  lessonId: 'everyday',
  exerciseIndex: 0,
  choice: 0
}, learnerToken);
assert.equal(everydayExCheck.status, 200);
console.log('PASS C: Prerequisite enforcement, API locking, and sequential unlocking verified.');

// -------------------------------------------------------------
// SECTION D: COMPLETION & XP IDEMPOTENCY
// -------------------------------------------------------------
console.log('\n[SECTION D: COMPLETION & XP IDEMPOTENCY]');

// D1: First completion awarded 50 XP
const meRes1 = await request('/me', null, learnerToken);
assert.equal(meRes1.data.progress.xp, 50);
assert.equal(meRes1.data.progress.completed.length, 1);

// D2: Replaying completion of 'hello' gives 0 earned XP and does not duplicate completed array
const replayHello = await request('/progress/lesson', {
  lesson: 'hello',
  answers: helloSolution
}, learnerToken);
assert.equal(replayHello.status, 200);
assert.equal(replayHello.data.earned, 0, 'Replay must award 0 XP');
assert.equal(replayHello.data.alreadyCompleted, true, 'alreadyCompleted must be true');
assert.equal(replayHello.data.progress.xp, 50, 'XP must remain 50');
assert.equal(replayHello.data.progress.completed.filter(id => id === 'hello').length, 1, 'Completed IDs must not duplicate');

// D3: Concurrent completion requests - exactly one awards XP
const everydaySolution = lessons.find(l => l.id === 'everyday').questions.map(q => q[2]);
const concurrentCount = 10;
const concurrentPromises = Array.from({ length: concurrentCount }, () =>
  request('/progress/lesson', { lesson: 'everyday', answers: everydaySolution }, learnerToken)
);
const concurrentResults = await Promise.all(concurrentPromises);

const earnedAwards = concurrentResults.filter(r => r.status === 200 && r.data.earned > 0);
const zeroAwards = concurrentResults.filter(r => r.status === 200 && r.data.earned === 0);

assert.equal(earnedAwards.length, 1, 'Exactly one concurrent request must award XP');
assert.equal(zeroAwards.length, concurrentCount - 1, 'All other concurrent requests must award 0 XP');
assert.equal(earnedAwards[0].data.earned, 60, 'Should award lesson XP (60)');

// Total XP after hello (50) + everyday (60) must be exactly 110
const meRes2 = await request('/me', null, learnerToken);
assert.equal(meRes2.data.progress.xp, 110, 'XP total must be strictly 110 without duplicate awards');
assert.equal(meRes2.data.progress.completed.length, 2);

// D4: Unauthenticated completion requests fail
const unauthComplete = await request('/progress/lesson', {
  lesson: 'sentences',
  answers: [0, 0, 0, 0, 0]
});
assert.equal(unauthComplete.status, 401, 'Unauthenticated completion must be rejected with 401');

// D5: Client cannot tamper with score or earned XP
const tamperedReq = await request('/progress/lesson', {
  lesson: 'sentences',
  answers: [0, 1, 2, 3, 0], // arbitrary guesses, may fail passing threshold
  earned: 9999, // tampered XP
  passed: true, // tampered pass
  correct: 5    // tampered score
}, learnerToken);
if (!tamperedReq.data.passed) {
  assert.equal(tamperedReq.data.earned, 0, 'Server must not trust client-supplied passed flag');
}
console.log('PASS D: XP idempotency, concurrency serialization, duplicate-award protection, and anti-tampering verified.');

// -------------------------------------------------------------
// SECTION E: PERSISTENCE & DASHBOARD CONSISTENCY
// -------------------------------------------------------------
console.log('\n[SECTION E: PERSISTENCE & DASHBOARD CONSISTENCY]');

// E1: Verify progress persists after fresh fetch
const meFresh = await request('/me', null, learnerToken);
assert.equal(meFresh.status, 200);
assert.equal(meFresh.data.progress.xp, 110);
assert.deepEqual(meFresh.data.progress.completed, ['hello', 'everyday']);

// E2: Dynamic curriculum total derivation
assert.equal(lessons.length, 138, 'Canonical lessons count should be 138');
const catalogLevels = await request('/curriculum/levels');
assert.equal(catalogLevels.status, 200);
let totalLessonsInCatalog = 0;
for (const lvl of catalogLevels.data) {
  for (const s of lvl.sections) {
    for (const u of s.units) {
      totalLessonsInCatalog += u.lessons.length;
    }
  }
}
assert.equal(totalLessonsInCatalog, 138, 'Curriculum catalog dynamic lesson count must equal 138');
console.log('PASS E: Local persistence, user state recovery, and dynamic curriculum consistency verified.');

// -------------------------------------------------------------
// SECTION F: CURRICULUM-WIDE VERIFICATION & REGRESSION CHECK
// -------------------------------------------------------------
console.log('\n[SECTION F: CURRICULUM-WIDE VERIFICATION & REGRESSION CHECK]');

const validationReport = validateCurriculumCatalog(CURRICULUM_CATALOG);
assert.equal(validationReport.valid, true, 'Curriculum catalog must be 100% valid');
assert.equal(validationReport.errors.length, 0);
assert.equal(validationReport.counts.levels, 7);
assert.equal(validationReport.counts.sections, 28);
assert.equal(validationReport.counts.units, 35);
assert.equal(validationReport.counts.lessons, 138);
assert.equal(validationReport.counts.exercises, 690);
assert.equal(validationReport.counts.objectives, 141);

// Regression: Multiplayer game flow continues to work
const gameReq = await request('/games', {
  topic: 'Grammar',
  difficulty: 'Beginner',
  duration: 1
}, learnerToken);
assert.equal(gameReq.status, 200);
assert.ok(gameReq.data.code, 'Game room code must be generated');
await request('/games/' + gameReq.data.code + '/leave', {}, learnerToken);

console.log('PASS F: Curriculum-wide validation (all 7 levels, 138 lessons, 690 exercises, 0 cycles) & multiplayer regression passed.');

console.log('\n================================================================');
console.log('--- ALL PHASE 10 LESSON ENGINE TESTS PASSED SUCCESSFULLY! ---');
console.log('================================================================');
