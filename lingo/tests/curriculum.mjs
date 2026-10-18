import assert from 'node:assert/strict';
import { CURRICULUM_CATALOG, getPublicLevels, getPublicLesson, getLessonSolutionKeys, LEARNING_OBJECTIVES } from '../server/curriculumCatalog.mjs';
import { validateCurriculumCatalog, detectPrerequisiteCycles, validateExercise } from '../server/curriculumValidator.mjs';
import { isAdmin, getAdminUsernames, requireAdmin } from '../server/adminAuth.mjs';
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
  return { status: response.status, data: await response.json() };
}

console.log('--- RUNNING CURRICULUM & ARCHITECTURE TESTS ---');

// 1. In-memory Curriculum Validation & Structure
const report = validateCurriculumCatalog(CURRICULUM_CATALOG);
assert.equal(report.valid, true, `Curriculum catalog validation failed: ${report.errors?.join(', ')}`);
assert.equal(report.counts.levels, 7, 'Expected exactly 7 CEFR levels');
assert.equal(report.counts.byLevel['pre-a1'].lessons, 18, 'Expected exactly 18 Pre-A1 lessons');
assert.equal(report.counts.byLevel['pre-a1'].exercises, 90, 'Expected exactly 90 Pre-A1 exercises (5 per lesson)');
assert.equal(report.counts.byLevel['a1'].lessons, 20, 'Expected exactly 20 A1 lessons');
assert.equal(report.counts.byLevel['a1'].exercises, 100, 'Expected exactly 100 A1 exercises (5 per lesson)');
assert.equal(report.counts.byLevel['a2'].lessons, 20, 'Expected exactly 20 A2 lessons');
assert.equal(report.counts.byLevel['a2'].exercises, 100, 'Expected exactly 100 A2 exercises (5 per lesson)');
assert.equal(report.counts.byLevel['b1'].lessons, 20, 'Expected exactly 20 B1 lessons');
assert.equal(report.counts.byLevel['b1'].exercises, 100, 'Expected exactly 100 B1 exercises (5 per lesson)');
assert.equal(report.counts.byLevel['b2'].lessons, 20, 'Expected exactly 20 B2 lessons');
assert.equal(report.counts.byLevel['b2'].exercises, 100, 'Expected exactly 100 B2 exercises (5 per lesson)');
assert.equal(report.counts.byLevel['c1'].lessons, 20, 'Expected exactly 20 C1 lessons');
assert.equal(report.counts.byLevel['c1'].exercises, 100, 'Expected exactly 100 C1 exercises (5 per lesson)');
assert.equal(report.counts.byLevel['c2'].lessons, 20, 'Expected exactly 20 C2 lessons');
assert.equal(report.counts.byLevel['c2'].exercises, 100, 'Expected exactly 100 C2 exercises (5 per lesson)');
assert.equal(report.counts.lessons, 138, 'Expected 138 total active lessons across Pre-A1 through C2');
assert.equal(report.counts.exercises, 690, 'Expected 690 total active exercises');
assert.equal(report.counts.objectives, 141, 'Expected 141 registered learning objectives (21 Pre-A1 + 20 A1 + 20 A2 + 20 B1 + 20 B2 + 20 C1 + 20 C2)');
console.log(`PASS 1: Canonical curriculum catalog validated: 18 Pre-A1 (90 ex), 20 A1 (100 ex), 20 A2 (100 ex), 20 B1 (100 ex), 20 B2 (100 ex), 20 C1 (100 ex), 20 C2 (100 ex), 138 lessons, 690 exercises, 141 objectives across 7 CEFR levels`);

// 2. Learning Objectives & Registry Resolution
assert.ok(CURRICULUM_CATALOG.learningObjectives, 'Expected learningObjectives registry on CURRICULUM_CATALOG');
for (const level of CURRICULUM_CATALOG.levels) {
  for (const section of level.sections) {
    for (const unit of section.units) {
      for (const lesson of unit.lessons) {
        assert.ok(Array.isArray(lesson.objectives) && lesson.objectives.length > 0, `Lesson ${lesson.id} missing learning objectives`);
        for (const objId of lesson.objectives) {
          const resolved = CURRICULUM_CATALOG.learningObjectives[objId];
          assert.ok(resolved, `Lesson ${lesson.id} references unregistered objective: ${objId}`);
          assert.ok(resolved.title && resolved.description, `Objective ${objId} missing title or description`);
        }
      }
    }
  }
}

// Validation failure when referencing unregistered objective
const catalogWithBadObj = structuredClone(CURRICULUM_CATALOG);
catalogWithBadObj.levels[0].sections[0].units[0].lessons[0].objectives.push('obj_non_existent_fake');
const badObjReport = validateCurriculumCatalog(catalogWithBadObj);
assert.equal(badObjReport.valid, false, 'Expected validation failure for unregistered objective reference');
assert.ok(badObjReport.errors.some(e => e.includes('References unregistered learning objective "obj_non_existent_fake"')));
console.log('PASS 2: Learning objectives registry and lesson mappings verified (all objectives resolve; missing refs rejected)');

// 3. Unique Lesson and Exercise IDs
const allExerciseIds = new Set();
const allLessonIds = new Set();
for (const level of CURRICULUM_CATALOG.levels) {
  for (const section of level.sections) {
    for (const unit of section.units) {
      for (const lesson of unit.lessons) {
        assert.equal(allLessonIds.has(lesson.id), false, `Duplicate lesson ID: ${lesson.id}`);
        allLessonIds.add(lesson.id);
        for (const ex of lesson.exercises) {
          assert.equal(allExerciseIds.has(ex.id), false, `Duplicate exercise ID: ${ex.id}`);
          allExerciseIds.add(ex.id);
        }
      }
    }
  }
}
assert.equal(allLessonIds.size, 138);
assert.equal(allExerciseIds.size, 690);

// Check validator catches duplicate exercise IDs
const catalogWithDupEx = structuredClone(CURRICULUM_CATALOG);
catalogWithDupEx.levels[0].sections[0].units[0].lessons[0].exercises[1].id = 'ex_hello_1';
const dupExReport = validateCurriculumCatalog(catalogWithDupEx);
assert.equal(dupExReport.valid, false, 'Expected validation failure for duplicate exercise ID');
assert.ok(dupExReport.errors.some(e => e.includes('Duplicate exercise ID detected: "ex_hello_1"')));
console.log('PASS 3: Identifier uniqueness verified across 138 lessons and 690 exercises; duplicate IDs rejected');

// 4. Exercise Schema & Bounds Validation for Supported Types
// Case A: Multiple choice with insufficient options
const tooFewOptions = { id: 'ex_test_few', exerciseType: 'multiple_choice', prompt: 'Select:', options: ['Only One'] };
assert.equal(validateExercise(tooFewOptions, { correctIndex: 0 }).valid, false);

// Case B: Multiple choice with out-of-bounds index
const outOfBounds = { id: 'ex_test_oob', exerciseType: 'multiple_choice', prompt: 'Select:', options: ['A', 'B'] };
assert.equal(validateExercise(outOfBounds, { correctIndex: 2 }).valid, false);
assert.equal(validateExercise(outOfBounds, { correctIndex: -1 }).valid, false);
assert.equal(validateExercise(outOfBounds, { correctIndex: 1.5 }).valid, false);

// Case C: Valid multiple choice
assert.equal(validateExercise(outOfBounds, { correctIndex: 1 }).valid, true);

// Case D: Fill in the blank validation
const fitb = { id: 'ex_test_fitb', exerciseType: 'fill_in_the_blank', prompt: 'I ___ an apple.', options: ['eat', 'drink'] };
assert.equal(validateExercise(fitb, { correctIndex: 0 }).valid, true);
assert.equal(validateExercise(fitb, { correctIndex: 5 }).valid, false);

// Case E: Word ordering validation
const wordOrder = { id: 'ex_test_order', exerciseType: 'word_ordering', prompt: 'Put in order:', options: ['am', 'I', 'happy'] };
assert.equal(validateExercise(wordOrder, { correctOrder: [1, 0, 2] }).valid, true);
assert.equal(validateExercise(wordOrder, { correctOrder: [1, 0] }).valid, false);
console.log('PASS 4: Exercise validation bounds and options count verified across supported types');

// 5. Answer-Key Seclusion Check
const publicLevels = getPublicLevels();
const levelsJson = JSON.stringify(publicLevels);
assert.equal(levelsJson.includes('solutionKey'), false, 'solutionKey leaked in getPublicLevels()');
assert.equal(levelsJson.includes('solution_payload'), false, 'solution_payload leaked in getPublicLevels()');
assert.equal(levelsJson.includes('correctIndex'), false, 'correctIndex leaked in getPublicLevels()');

// Check every Pre-A1 lesson via getPublicLesson
for (const lessonId of allLessonIds) {
  const publicLesson = getPublicLesson(lessonId);
  assert.ok(publicLesson, `Expected public lesson "${lessonId}"`);
  assert.equal(publicLesson.exercises.length, 5, `Expected 5 exercises in "${lessonId}"`);
  for (const ex of publicLesson.exercises) {
    assert.equal(ex.solutionKey, undefined, `Exercise ${ex.id} leaked solutionKey!`);
    assert.equal(ex.solution_payload, undefined, `Exercise ${ex.id} leaked solution_payload!`);
    assert.equal(ex.correctIndex, undefined, `Exercise ${ex.id} leaked correctIndex!`);
  }
}
console.log('PASS 5: Answer-key seclusion verified across all 138 public lesson payloads');

// 6. Prerequisite DAG Validation, Acyclicity & Missing References
const acyclic = [['b', 'a'], ['c', 'b'], ['d', 'c']];
assert.equal(detectPrerequisiteCycles(acyclic).valid, true, 'Acyclic graph incorrectly flagged');

const cyclic = [['b', 'a'], ['c', 'b'], ['a', 'c']];
const cycleResult = detectPrerequisiteCycles(cyclic);
assert.equal(cycleResult.valid, false, 'Cycle was not detected');
assert.match(cycleResult.error, /Circular prerequisite/);

const selfRef = [['a', 'a']];
const selfRefResult = detectPrerequisiteCycles(selfRef);
assert.equal(selfRefResult.valid, false, 'Self-reference was not detected');

// Missing prerequisite check in validator
const catalogWithBadPrereq = structuredClone(CURRICULUM_CATALOG);
catalogWithBadPrereq.levels[0].sections[0].units[0].lessons[1].prerequisites = ['non_existent_lesson_prereq'];
const badPrereqReport = validateCurriculumCatalog(catalogWithBadPrereq);
assert.equal(badPrereqReport.valid, false);
assert.ok(badPrereqReport.errors.some(e => e.includes('references non-existent prerequisite lesson')));
console.log('PASS 6: Prerequisite DAG validation verified (cycles, self-refs, and missing prerequisites rejected)');

// 7. Admin Authorization Logic
delete process.env.ADMIN_USERNAMES;
assert.equal(getAdminUsernames().size, 0, 'Unset ADMIN_USERNAMES must result in empty whitelist');
assert.equal(isAdmin('alice_admin'), false, 'Unset ADMIN_USERNAMES must deny admin access');

process.env.ADMIN_USERNAMES = '  alice_admin , Bob_Curator ,  ';
assert.equal(isAdmin('alice_admin'), true, 'Configured admin must be authorized');
assert.equal(isAdmin('ALICE_ADMIN'), true, 'Admin check must be case-insensitive');
assert.equal(isAdmin('charlie_student'), false, 'User outside whitelist must be denied');
console.log('PASS 7: Admin username whitelist resolution verified');

// 8. Live API Endpoints: Public Curriculum and Pre-A1 Coverage
const levelsApi = await request('/curriculum/levels');
assert.equal(levelsApi.status, 200);
assert.equal(levelsApi.data.length, 7);
assert.equal(levelsApi.data[0].code, 'Pre-A1');
assert.equal(levelsApi.data[0].sections.length, 4, 'Pre-A1 should expose 4 sections');
assert.equal(JSON.stringify(levelsApi.data).includes('solutionKey'), false);

// Check all 18 Pre-A1 lessons via live API
const preA1LessonIds = [
  'hello', 'everyday', 'sentences',
  'pre-a1-u2-l1', 'pre-a1-u2-l2', 'pre-a1-u2-l3',
  'pre-a1-u3-l1', 'pre-a1-u3-l2', 'pre-a1-u3-l3', 'pre-a1-u3-l4',
  'pre-a1-u4-l1', 'pre-a1-u4-l2', 'pre-a1-u4-l3', 'pre-a1-u4-l4',
  'pre-a1-u5-l1', 'pre-a1-u5-l2', 'pre-a1-u5-l3', 'pre-a1-u5-l4'
];

for (const id of preA1LessonIds) {
  const lessonApi = await request('/curriculum/lessons/' + id);
  assert.equal(lessonApi.status, 200, `Expected 200 for Pre-A1 lesson: ${id}`);
  assert.equal(lessonApi.data.id, id);
  assert.equal(lessonApi.data.exercises.length, 5);
  assert.equal(JSON.stringify(lessonApi.data).includes('solutionKey'), false);
  assert.equal(JSON.stringify(lessonApi.data).includes('correctIndex'), false);
}

// Check all 20 A1 lessons via live API
const a1LessonIds = [
  'a1-u1-l1', 'a1-u1-l2', 'a1-u1-l3', 'a1-u1-l4',
  'a1-u2-l1', 'a1-u2-l2', 'a1-u2-l3', 'a1-u2-l4',
  'food', 'a1-u3-l2', 'a1-u3-l3', 'a1-u3-l4',
  'a1-u4-l1', 'a1-u4-l2', 'a1-u4-l3', 'past',
  'confidence', 'a1-u5-l2', 'a1-u5-l3', 'a1-u5-l4'
];

for (const id of a1LessonIds) {
  const lessonApi = await request('/curriculum/lessons/' + id);
  assert.equal(lessonApi.status, 200, `Expected 200 for A1 lesson: ${id}`);
  assert.equal(lessonApi.data.id, id);
  assert.equal(lessonApi.data.exercises.length, 5);
  assert.equal(JSON.stringify(lessonApi.data).includes('solutionKey'), false);
  assert.equal(JSON.stringify(lessonApi.data).includes('correctIndex'), false);
}
// Check all 20 A2 lessons via live API
const a2LessonIds = [
  'a2-u1-l1', 'a2-u1-l2', 'a2-u1-l3', 'a2-u1-l4',
  'a2-u2-l1', 'a2-u2-l2', 'a2-u2-l3', 'a2-u2-l4',
  'a2-u3-l1', 'a2-u3-l2', 'a2-u3-l3', 'a2-u3-l4',
  'a2-u4-l1', 'a2-u4-l2', 'a2-u4-l3', 'a2-u4-l4',
  'a2-u5-l1', 'a2-u5-l2', 'a2-u5-l3', 'a2-u5-l4'
];

for (const id of a2LessonIds) {
  const lessonApi = await request('/curriculum/lessons/' + id);
  assert.equal(lessonApi.status, 200, `Expected 200 for A2 lesson: ${id}`);
  assert.equal(lessonApi.data.id, id);
  assert.equal(lessonApi.data.exercises.length, 5);
  assert.equal(JSON.stringify(lessonApi.data).includes('solutionKey'), false);
  assert.equal(JSON.stringify(lessonApi.data).includes('correctIndex'), false);
}

// Check all 20 B1 lessons via live API
const b1LessonIds = [
  'b1-u1-l1', 'b1-u1-l2', 'b1-u1-l3', 'b1-u1-l4',
  'b1-u2-l1', 'b1-u2-l2', 'b1-u2-l3', 'b1-u2-l4',
  'b1-u3-l1', 'b1-u3-l2', 'b1-u3-l3', 'b1-u3-l4',
  'b1-u4-l1', 'b1-u4-l2', 'b1-u4-l3', 'b1-u4-l4',
  'b1-u5-l1', 'b1-u5-l2', 'b1-u5-l3', 'b1-u5-l4'
];

for (const id of b1LessonIds) {
  const lessonApi = await request('/curriculum/lessons/' + id);
  assert.equal(lessonApi.status, 200, `Expected 200 for B1 lesson: ${id}`);
  assert.equal(lessonApi.data.id, id);
  assert.equal(lessonApi.data.exercises.length, 5);
  assert.equal(JSON.stringify(lessonApi.data).includes('solutionKey'), false);
  assert.equal(JSON.stringify(lessonApi.data).includes('correctIndex'), false);
}

// Check all 20 B2 lessons via live API
const b2LessonIds = [
  'b2-u1-l1', 'b2-u1-l2', 'b2-u1-l3', 'b2-u1-l4',
  'b2-u2-l1', 'b2-u2-l2', 'b2-u2-l3', 'b2-u2-l4',
  'b2-u3-l1', 'b2-u3-l2', 'b2-u3-l3', 'b2-u3-l4',
  'b2-u4-l1', 'b2-u4-l2', 'b2-u4-l3', 'b2-u4-l4',
  'b2-u5-l1', 'b2-u5-l2', 'b2-u5-l3', 'b2-u5-l4'
];

for (const id of b2LessonIds) {
  const lessonApi = await request('/curriculum/lessons/' + id);
  assert.equal(lessonApi.status, 200, `Expected 200 for B2 lesson: ${id}`);
  assert.equal(lessonApi.data.id, id);
  assert.equal(lessonApi.data.exercises.length, 5);
  assert.equal(JSON.stringify(lessonApi.data).includes('solutionKey'), false);
  assert.equal(JSON.stringify(lessonApi.data).includes('correctIndex'), false);
}

// Check all 20 C1 lessons via live API
const c1LessonIds = [
  'c1-u1-l1', 'c1-u1-l2', 'c1-u1-l3', 'c1-u1-l4',
  'c1-u2-l1', 'c1-u2-l2', 'c1-u2-l3', 'c1-u2-l4',
  'c1-u3-l1', 'c1-u3-l2', 'c1-u3-l3', 'c1-u3-l4',
  'c1-u4-l1', 'c1-u4-l2', 'c1-u4-l3', 'c1-u4-l4',
  'c1-u5-l1', 'c1-u5-l2', 'c1-u5-l3', 'c1-u5-l4'
];

for (const id of c1LessonIds) {
  const lessonApi = await request('/curriculum/lessons/' + id);
  assert.equal(lessonApi.status, 200, `Expected 200 for C1 lesson: ${id}`);
  assert.equal(lessonApi.data.id, id);
  assert.equal(lessonApi.data.exercises.length, 5);
  assert.equal(JSON.stringify(lessonApi.data).includes('solutionKey'), false);
  assert.equal(JSON.stringify(lessonApi.data).includes('correctIndex'), false);
}

// Check all 20 C2 lessons via live API
const c2LessonIds = [
  'c2-u1-l1', 'c2-u1-l2', 'c2-u1-l3', 'c2-u1-l4',
  'c2-u2-l1', 'c2-u2-l2', 'c2-u2-l3', 'c2-u2-l4',
  'c2-u3-l1', 'c2-u3-l2', 'c2-u3-l3', 'c2-u3-l4',
  'c2-u4-l1', 'c2-u4-l2', 'c2-u4-l3', 'c2-u4-l4',
  'c2-u5-l1', 'c2-u5-l2', 'c2-u5-l3', 'c2-u5-l4'
];

for (const id of c2LessonIds) {
  const lessonApi = await request('/curriculum/lessons/' + id);
  assert.equal(lessonApi.status, 200, `Expected 200 for C2 lesson: ${id}`);
  assert.equal(lessonApi.data.id, id);
  assert.equal(lessonApi.data.exercises.length, 5);
  assert.equal(JSON.stringify(lessonApi.data).includes('solutionKey'), false);
  assert.equal(JSON.stringify(lessonApi.data).includes('correctIndex'), false);
}
console.log('PASS 8: Live API exposes all 18 Pre-A1, all 20 A1, all 20 A2, all 20 B1, all 20 B2, all 20 C1, and all 20 C2 lessons with full pedagogical data and secluded answer keys');

// 9. Live API Endpoints: Administrative Authorization Guards
const unauthAdmin = await request('/admin/curriculum/validate');
assert.equal(unauthAdmin.status, 401, 'Unauthenticated access to admin endpoint must return 401');

const learnerUsername = 's_' + Date.now().toString().slice(-10);
const learnerSignup = await request('/auth/signup', {
  username: learnerUsername,
  name: 'Learner One',
  password: 'Password123'
});
assert.equal(learnerSignup.status, 200);
const learnerToken = learnerSignup.data.token;

const forbiddenAdmin = await request('/admin/curriculum/validate', null, learnerToken);
assert.equal(forbiddenAdmin.status, 403, 'Non-admin learner access must return 403 Forbidden');

const adminUsername = 'alice_admin';
let adminToken;
const adminLogin = await request('/auth/login', { username: adminUsername, password: 'AdminPassword123' });
if (adminLogin.status === 200) {
  adminToken = adminLogin.data.token;
} else {
  const adminSignup = await request('/auth/signup', {
    username: adminUsername,
    name: 'Alice Admin',
    password: 'AdminPassword123'
  });
  assert.equal(adminSignup.status, 200);
  adminToken = adminSignup.data.token;
}

const authorizedAdmin = await request('/admin/curriculum/validate', null, adminToken);
assert.equal(authorizedAdmin.status, 200, 'Authorized admin access must return 200 OK');
assert.equal(authorizedAdmin.data.valid, true);
assert.equal(authorizedAdmin.data.counts.byLevel['pre-a1'].lessons, 18);
assert.equal(authorizedAdmin.data.counts.byLevel['pre-a1'].exercises, 90);
assert.equal(authorizedAdmin.data.counts.byLevel['a1'].lessons, 20);
assert.equal(authorizedAdmin.data.counts.byLevel['a1'].exercises, 100);
assert.equal(authorizedAdmin.data.counts.byLevel['a2'].lessons, 20);
assert.equal(authorizedAdmin.data.counts.byLevel['a2'].exercises, 100);
assert.equal(authorizedAdmin.data.counts.byLevel['b1'].lessons, 20);
assert.equal(authorizedAdmin.data.counts.byLevel['b1'].exercises, 100);
assert.equal(authorizedAdmin.data.counts.byLevel['b2'].lessons, 20);
assert.equal(authorizedAdmin.data.counts.byLevel['b2'].exercises, 100);
assert.equal(authorizedAdmin.data.counts.byLevel['c1'].lessons, 20);
assert.equal(authorizedAdmin.data.counts.byLevel['c1'].exercises, 100);
assert.equal(authorizedAdmin.data.counts.byLevel['c2'].lessons, 20);
assert.equal(authorizedAdmin.data.counts.byLevel['c2'].exercises, 100);
assert.equal(authorizedAdmin.data.counts.lessons, 138);
assert.equal(authorizedAdmin.data.counts.exercises, 690);
console.log('PASS 9: Live administrative validation endpoint reports 18 Pre-A1, 20 A1, 20 A2, 20 B1, 20 B2, 20 C1, and 20 C2 lessons (690 exercises) with 200 OK');

// 10. Progression & Lesson Completion Guards
// A. Locked lesson completion rejection (cannot jump ahead to locked lesson)
const lockedAttempt = await request('/progress/lesson', {
  lesson: 'pre-a1-u2-l1',
  answers: [1, 2, 2, 2, 0]
}, learnerToken);
assert.equal(lockedAttempt.status, 400, 'Locked lesson completion must be rejected');
assert.match(lockedAttempt.data.error, /Complete the previous level to unlock this one/);

// B. Non-existent lesson completion rejection
const bogusLessonAttempt = await request('/progress/lesson', {
  lesson: 'fake_lesson_xyz',
  answers: [0, 1, 2, 3, 0]
}, learnerToken);
assert.equal(bogusLessonAttempt.status, 400);
assert.match(bogusLessonAttempt.data.error, /Lesson not found/);

// C. Authorized completion of unlocked lesson 1 (hello)
const helloAnswers = lessons[0].questions.map(q => q[2]);
const passHello = await request('/progress/lesson', {
  lesson: 'hello',
  answers: helloAnswers
}, learnerToken);
assert.equal(passHello.status, 200);
assert.equal(passHello.data.passed, true);
assert.equal(passHello.data.earned, 50);
assert.ok(passHello.data.progress.completed.includes('hello'));

// D. Duplicate completion does NOT award duplicate XP
const dupHello = await request('/progress/lesson', {
  lesson: 'hello',
  answers: helloAnswers
}, learnerToken);
assert.equal(dupHello.status, 200);
assert.equal(dupHello.data.earned, 0, 'Duplicate completion must not award duplicate XP');
assert.equal(dupHello.data.progress.xp, 50, 'Total XP should remain unchanged after duplicate completion');

// E. Now lesson 2 (everyday) is unlocked and can be completed
const everydayAnswers = lessons[1].questions.map(q => q[2]);
const passEveryday = await request('/progress/lesson', {
  lesson: 'everyday',
  answers: everydayAnswers
}, learnerToken);
assert.equal(passEveryday.status, 200);
assert.equal(passEveryday.data.passed, true);
assert.equal(passEveryday.data.earned, 60);
assert.equal(passEveryday.data.progress.xp, 110);
console.log('PASS 10: Progression guards verified: locked lesson rejected, non-existent rejected, one-time XP enforced, sequential unlocking works');

console.log('ALL 10 CURRICULUM ARCHITECTURE & PRE-A1 TESTS PASSED SUCCESSFULLY.');
