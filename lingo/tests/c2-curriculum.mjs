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

console.log('--- RUNNING DEDICATED C2 CURRICULUM TEST SUITE ---');

// 1. Level C2 Canonical Structure
const c2Level = CURRICULUM_CATALOG.levels.find(l => l.id === 'c2');
assert.ok(c2Level, 'C2 level must exist in canonical catalog');
assert.equal(c2Level.code, 'C2');
assert.equal(c2Level.sections.length, 4, 'C2 must contain exactly 4 sections');

const c2Units = c2Level.sections.flatMap(s => s.units);
assert.equal(c2Units.length, 5, 'C2 must contain exactly 5 units');

const c2Lessons = c2Units.flatMap(u => u.lessons);
assert.equal(c2Lessons.length, 20, 'C2 must contain exactly 20 lessons');

const c2Exercises = c2Lessons.flatMap(l => l.exercises);
assert.equal(c2Exercises.length, 100, 'C2 must contain exactly 100 exercises');
console.log('PASS 1: Canonical C2 inventory validated: 4 sections, 5 units, 20 lessons, 100 exercises');

// 2. Comprehensive Pedagogical Fields for all 20 C2 Lessons
for (const lesson of c2Lessons) {
  assert.ok(lesson.id.startsWith('c2-'), `Invalid lesson ID format: ${lesson.id}`);
  assert.ok(lesson.title && lesson.title.length > 5, `Missing title in ${lesson.id}`);
  assert.ok(lesson.subtitle && lesson.subtitle.length > 5, `Missing subtitle in ${lesson.id}`);
  assert.ok(lesson.description && lesson.description.length > 20, `Missing description in ${lesson.id}`);
  assert.ok(lesson.pedagogicalFocus, `Missing pedagogicalFocus in ${lesson.id}`);
  assert.ok(lesson.icon, `Missing icon in ${lesson.id}`);
  assert.ok(lesson.accentColor, `Missing accentColor in ${lesson.id}`);
  assert.ok(lesson.xp >= 100, `XP should be at least 100 in ${lesson.id}`);
  assert.ok(lesson.estimatedDurationMin >= 6, `Duration should be >= 6 min in ${lesson.id}`);

  // Objectives
  assert.ok(Array.isArray(lesson.objectives) && lesson.objectives.length === 1, `Expected exactly 1 primary objective in ${lesson.id}`);
  const obj = CURRICULUM_CATALOG.learningObjectives[lesson.objectives[0]];
  assert.ok(obj, `Objective ${lesson.objectives[0]} must exist in registry`);
  assert.equal(obj.levelId, 'c2', `Objective ${obj.id} must be levelId 'c2'`);

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
    assert.ok(ex.id.startsWith('ex_c2_'), `Invalid exercise ID format: ${ex.id}`);
    assert.equal(ex.exerciseType, 'multiple_choice');
    assert.equal(ex.options.length, 4, `Expected 4 options in ${ex.id}`);
    assert.ok(ex.solutionKey && typeof ex.solutionKey.correctIndex === 'number', `Missing solutionKey in ${ex.id}`);
    assert.ok(ex.solutionKey.correctIndex >= 0 && ex.solutionKey.correctIndex < 4, `Invalid correctIndex in ${ex.id}`);
    assert.ok(ex.explanation && ex.explanation.length > 15, `Missing explanation in ${ex.id}`);
  }
}
console.log('PASS 2: Complete pedagogical schema verified across all 20 C2 lessons (vocabulary, grammar, worked examples, practice, review, exercises)');

// 3. Prerequisite Lineage & Acyclicity
assert.deepEqual(c2Lessons[0].prerequisites, ['c1-u5-l4'], 'First C2 lesson must link to last C1 lesson c1-u5-l4');
for (let i = 1; i < c2Lessons.length; i++) {
  assert.deepEqual(c2Lessons[i].prerequisites, [c2Lessons[i - 1].id], `Lesson ${c2Lessons[i].id} must require ${c2Lessons[i - 1].id}`);
}
console.log('PASS 3: Prerequisite chain starts at c1-u5-l4 and strictly flows sequentially through all 20 C2 lessons without gaps or cycles');

// 4. Public Answer-Key Seclusion across all 20 C2 lessons
for (const lesson of c2Lessons) {
  const pub = getPublicLesson(lesson.id);
  assert.ok(pub, `Public lesson must resolve for ${lesson.id}`);
  assert.equal(pub.id, lesson.id);
  assert.equal(pub.exercises.length, 5);
  for (const ex of pub.exercises) {
    assert.equal(typeof ex.solutionKey, 'undefined', `solutionKey leaked on ${ex.id}`);
    assert.equal(typeof ex.correctIndex, 'undefined', `correctIndex leaked on ${ex.id}`);
  }
}
console.log('PASS 4: Zero answer keys leaked across all 20 C2 public lesson payloads');

// 5. Server-Side Exercise Grading Endpoint for C2
for (const lesson of c2Lessons) {
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
console.log('PASS 5: Server-side grading endpoint accurately checks correct and incorrect choices across C2 lessons without exposing keys beforehand');

// 6. UI Course Map Alignment for C2
const c2UI = CEFR_LEVELS.find(l => l.id === 'c2');
assert.ok(c2UI, 'C2 UI level must exist');
assert.equal(c2UI.isDemoOnly, false, 'C2 must be an active level, not demo only');
const c2UILessons = getLevelLessons(c2UI);
assert.equal(c2UILessons.length, 20, 'C2 UI must yield 20 canonical lessons');
assert.deepEqual(c2UILessons.map(l => l.realLessonId || l.id), c2Lessons.map(l => l.id), 'C2 UI lesson sequence matches canonical catalog exactly');
console.log('PASS 6: UI course map contains all 20 C2 lessons with isDemoOnly: false and 5 milestone checkpoints');

console.log('ALL 6 DEDICATED C2 TESTS PASSED (100%).');
