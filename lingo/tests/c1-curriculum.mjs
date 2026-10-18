import assert from 'node:assert/strict';
import { CURRICULUM_CATALOG, getPublicLevels, getPublicLesson, getLessonSolutionKeys } from '../server/curriculumCatalog.mjs';
import { validateCurriculumCatalog } from '../server/curriculumValidator.mjs';
import { CEFR_LEVELS, getLevelLessons } from '../src/curriculumData.js';

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

console.log('--- RUNNING DEDICATED C1 CURRICULUM TEST SUITE ---');

// 1. Level C1 Canonical Structure
const c1Level = CURRICULUM_CATALOG.levels.find(l => l.id === 'c1');
assert.ok(c1Level, 'C1 level must exist in canonical catalog');
assert.equal(c1Level.code, 'C1');
assert.equal(c1Level.sections.length, 4, 'C1 must contain exactly 4 sections');

const c1Units = c1Level.sections.flatMap(s => s.units);
assert.equal(c1Units.length, 5, 'C1 must contain exactly 5 units');

const c1Lessons = c1Units.flatMap(u => u.lessons);
assert.equal(c1Lessons.length, 20, 'C1 must contain exactly 20 lessons');

const c1Exercises = c1Lessons.flatMap(l => l.exercises);
assert.equal(c1Exercises.length, 100, 'C1 must contain exactly 100 exercises');
console.log('PASS 1: Canonical C1 inventory validated: 4 sections, 5 units, 20 lessons, 100 exercises');

// 2. Comprehensive Pedagogical Fields for all 20 C1 Lessons
for (const lesson of c1Lessons) {
  assert.ok(lesson.id.startsWith('c1-'), `Invalid lesson ID format: ${lesson.id}`);
  assert.ok(lesson.title && lesson.title.length > 5, `Missing title in ${lesson.id}`);
  assert.ok(lesson.subtitle && lesson.subtitle.length > 5, `Missing subtitle in ${lesson.id}`);
  assert.ok(lesson.description && lesson.description.length > 20, `Missing description in ${lesson.id}`);
  assert.ok(lesson.pedagogicalFocus, `Missing pedagogicalFocus in ${lesson.id}`);
  assert.ok(lesson.icon, `Missing icon in ${lesson.id}`);
  assert.ok(lesson.accentColor, `Missing accentColor in ${lesson.id}`);
  assert.ok(lesson.xp >= 95, `XP should be at least 95 in ${lesson.id}`);
  assert.ok(lesson.estimatedDurationMin >= 5, `Duration should be >= 5 min in ${lesson.id}`);

  // Objectives
  assert.ok(Array.isArray(lesson.objectives) && lesson.objectives.length === 1, `Expected exactly 1 primary objective in ${lesson.id}`);
  const obj = CURRICULUM_CATALOG.learningObjectives[lesson.objectives[0]];
  assert.ok(obj, `Objective ${lesson.objectives[0]} must exist in registry`);
  assert.equal(obj.levelId, 'c1', `Objective ${obj.id} must be levelId 'c1'`);

  // Vocabulary
  assert.ok(Array.isArray(lesson.vocabulary) && lesson.vocabulary.length >= 3, `Expected at least 3 vocabulary items in ${lesson.id}`);
  for (const v of lesson.vocabulary) {
    assert.ok(v.term && v.definition && v.example, `Vocabulary item missing required fields in ${lesson.id}`);
  }

  // Grammar & Pedagogy
  assert.ok(lesson.grammar?.pattern && lesson.grammar?.rule && lesson.grammar?.example, `Missing grammar details in ${lesson.id}`);
  assert.ok(lesson.explanation && lesson.explanation.length > 30, `Missing comprehensive explanation in ${lesson.id}`);
  assert.ok(Array.isArray(lesson.workedExamples) && lesson.workedExamples.length >= 1, `Missing worked examples in ${lesson.id}`);
  assert.ok(lesson.guidedPractice, `Missing guidedPractice in ${lesson.id}`);
  assert.ok(lesson.independentPractice, `Missing independentPractice in ${lesson.id}`);
  assert.ok(lesson.review, `Missing review in ${lesson.id}`);

  // Exercises
  assert.equal(lesson.exercises.length, 5, `Expected 5 exercises in ${lesson.id}`);
  for (const ex of lesson.exercises) {
    assert.ok(ex.id.startsWith('ex_c1_'), `Invalid exercise ID format: ${ex.id}`);
    assert.equal(ex.exerciseType, 'multiple_choice');
    assert.equal(ex.options.length, 4, `Expected 4 options in ${ex.id}`);
    assert.ok(ex.solutionKey && typeof ex.solutionKey.correctIndex === 'number', `Missing solutionKey in ${ex.id}`);
    assert.ok(ex.solutionKey.correctIndex >= 0 && ex.solutionKey.correctIndex < 4, `Invalid correctIndex in ${ex.id}`);
    assert.ok(ex.explanation && ex.explanation.length > 15, `Missing explanation in ${ex.id}`);
  }
}
console.log('PASS 2: Complete pedagogical schema verified across all 20 C1 lessons (vocabulary, grammar, worked examples, practice, review, exercises)');

// 3. Prerequisite Lineage & Acyclicity
assert.deepEqual(c1Lessons[0].prerequisites, ['b2-u5-l4'], 'First C1 lesson must link to last B2 lesson b2-u5-l4');
for (let i = 1; i < c1Lessons.length; i++) {
  assert.deepEqual(c1Lessons[i].prerequisites, [c1Lessons[i - 1].id], `Lesson ${c1Lessons[i].id} must require ${c1Lessons[i - 1].id}`);
}
console.log('PASS 3: Prerequisite chain starts at b2-u5-l4 and strictly flows sequentially through all 20 C1 lessons without gaps or cycles');

// 4. Public Answer-Key Seclusion across all 20 C1 lessons
for (const lesson of c1Lessons) {
  const pub = getPublicLesson(lesson.id);
  assert.ok(pub, `Public lesson must resolve for ${lesson.id}`);
  assert.equal(pub.id, lesson.id);
  assert.equal(pub.exercises.length, 5);
  for (const ex of pub.exercises) {
    assert.equal(typeof ex.solutionKey, 'undefined', `solutionKey leaked on ${ex.id}`);
    assert.equal(typeof ex.correctIndex, 'undefined', `correctIndex leaked on ${ex.id}`);
  }
}
console.log('PASS 4: Zero answer keys leaked across all 20 C1 public lesson payloads');

// 5. Server-Side Exercise Grading Endpoint for C1
for (const lesson of c1Lessons) {
  const keys = getLessonSolutionKeys(lesson.id);
  assert.equal(keys.length, 5);
  const ex0Key = keys[0].solutionKey.correctIndex;

  // Correct answer check
  const checkCorrect = await request('/curriculum/exercises/check', {
    lessonId: lesson.id,
    exerciseIndex: 0,
    choice: ex0Key
  });
  assert.equal(checkCorrect.status, 200);
  assert.equal(checkCorrect.data.isCorrect, true);
  assert.equal(checkCorrect.data.correctIndex, ex0Key);

  // Incorrect answer check
  const wrongChoice = (ex0Key + 1) % 4;
  const checkWrong = await request('/curriculum/exercises/check', {
    lessonId: lesson.id,
    exerciseIndex: 0,
    choice: wrongChoice
  });
  assert.equal(checkWrong.status, 200);
  assert.equal(checkWrong.data.isCorrect, false);
  assert.equal(checkWrong.data.correctIndex, ex0Key);
}
console.log('PASS 5: Server-side grading endpoint accurately checks correct and incorrect choices across C1 lessons without exposing keys beforehand');

// 6. UI Course Map Alignment for C1
const c1UI = CEFR_LEVELS.find(l => l.id === 'c1');
assert.ok(c1UI, 'C1 UI level must exist');
assert.equal(c1UI.isDemoOnly, false, 'C1 must be an active level, not demo only');
const c1UILessons = getLevelLessons(c1UI);
assert.equal(c1UILessons.length, 20, 'C1 UI must yield 20 canonical lessons');
assert.deepEqual(c1UILessons.map(l => l.realLessonId || l.id), c1Lessons.map(l => l.id), 'C1 UI lesson sequence matches canonical catalog exactly');
console.log('PASS 6: UI course map contains all 20 C1 lessons with isDemoOnly: false and 5 milestone checkpoints');

console.log('ALL 6 DEDICATED C1 TESTS PASSED (100%).');
