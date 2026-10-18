import assert from 'node:assert/strict';
import { CURRICULUM_CATALOG, getPublicLesson } from '../server/curriculumCatalog.mjs';

const root = 'http://localhost:3000/api';

async function request(endpoint, body, method) {
  const response = await fetch(root + endpoint, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, data: await response.json() };
}

console.log('--- TESTING SHARED LEARNING EXPERIENCE (PRE-A1 THROUGH C2) ---');

// 1. Verify Public Lesson API exposes objectives, pedagogical data, and secluded exercises across Pre-A1, A1, A2, B1, B2
const sampleLessons = [
  { id: 'hello', level: 'pre-a1', hasVocab: true, hasGrammar: true, hasWorked: true },
  { id: 'pre-a1-u2-l1', level: 'pre-a1', hasVocab: true, hasGrammar: false, hasWorked: true },
  { id: 'a1-u1-l1', level: 'a1', hasVocab: true, hasGrammar: true, hasWorked: true },
  { id: 'food', level: 'a1', hasVocab: true, hasGrammar: true, hasWorked: true },
  { id: 'a2-u1-l1', level: 'a2', hasVocab: true, hasGrammar: true, hasWorked: true },
  { id: 'a2-u5-l4', level: 'a2', hasVocab: true, hasGrammar: true, hasWorked: true },
  { id: 'b1-u1-l1', level: 'b1', hasVocab: true, hasGrammar: true, hasWorked: true },
  { id: 'b1-u5-l4', level: 'b1', hasVocab: true, hasGrammar: true, hasWorked: true },
  { id: 'b2-u1-l1', level: 'b2', hasVocab: true, hasGrammar: true, hasWorked: true },
  { id: 'b2-u5-l4', level: 'b2', hasVocab: true, hasGrammar: true, hasWorked: true },
  { id: 'c1-u1-l1', level: 'c1', hasVocab: true, hasGrammar: true, hasWorked: true },
  { id: 'c1-u5-l4', level: 'c1', hasVocab: true, hasGrammar: true, hasWorked: true },
  { id: 'c2-u1-l1', level: 'c2', hasVocab: true, hasGrammar: true, hasWorked: true },
  { id: 'c2-u5-l4', level: 'c2', hasVocab: true, hasGrammar: true, hasWorked: true }
];

for (const sample of sampleLessons) {
  const res = await request('/curriculum/lessons/' + sample.id);
  assert.equal(res.status, 200, `Expected 200 for lesson ${sample.id}`);
  const lesson = res.data;
  
  // Basic properties
  assert.equal(lesson.id, sample.id);
  assert.equal(lesson.levelId, sample.level);
  assert.ok(lesson.title, `Lesson ${sample.id} missing title`);
  assert.ok(lesson.description, `Lesson ${sample.id} missing description`);
  
  // Primary Objective & Can-Do
  assert.ok(lesson.primaryObjective, `Lesson ${sample.id} missing primaryObjective`);
  assert.ok(lesson.primaryObjective.title, `Lesson ${sample.id} primaryObjective missing title`);
  assert.ok(lesson.primaryObjective.description, `Lesson ${sample.id} primaryObjective missing description`);
  assert.ok(lesson.primaryObjective.cefrDescriptor, `Lesson ${sample.id} primaryObjective missing Can-Do descriptor`);
  
  // Learning Objectives list
  assert.ok(Array.isArray(lesson.learningObjectives), `Lesson ${sample.id} missing learningObjectives array`);
  assert.ok(lesson.learningObjectives.length > 0, `Lesson ${sample.id} learningObjectives empty`);

  // Teaching content
  assert.ok(lesson.explanation, `Lesson ${sample.id} missing explanation`);
  if (sample.hasVocab) {
    assert.ok(Array.isArray(lesson.vocabulary) && lesson.vocabulary.length > 0, `Lesson ${sample.id} expected vocabulary`);
    assert.ok(lesson.vocabulary[0].term && lesson.vocabulary[0].definition, `Vocabulary missing term/definition`);
  }
  if (sample.hasWorked) {
    assert.ok(Array.isArray(lesson.workedExamples) && lesson.workedExamples.length > 0, `Lesson ${sample.id} expected workedExamples`);
    assert.ok(lesson.workedExamples[0].prompt && lesson.workedExamples[0].solution, `Worked example missing prompt/solution`);
  }
  if (sample.hasGrammar) {
    assert.ok(lesson.grammar, `Lesson ${sample.id} expected grammar`);
  }

  // Answer key seclusion
  assert.equal(lesson.exercises.length, 5, `Expected 5 exercises for lesson ${sample.id}`);
  for (const ex of lesson.exercises) {
    assert.equal(ex.solutionKey, undefined, `Exercise ${ex.id} leaked solutionKey!`);
    assert.equal(ex.correctIndex, undefined, `Exercise ${ex.id} leaked correctIndex!`);
    assert.ok(ex.prompt && ex.options && ex.explanation, `Exercise ${ex.id} missing prompt, options, or explanation`);
  }
}
console.log('PASS 1: Core learning data, primary objective, and answer key seclusion verified across Pre-A1, A1, A2, B1, B2');

// 2. Test Single Exercise Checking API
const checkCorrect = await request('/curriculum/exercises/check', {
  lessonId: 'hello',
  exerciseIndex: 0,
  choice: 1
}, 'POST');
assert.equal(checkCorrect.status, 200);
assert.equal(checkCorrect.data.isCorrect, true);
assert.equal(checkCorrect.data.correctIndex, 1);

const checkIncorrect = await request('/curriculum/exercises/check', {
  lessonId: 'hello',
  exerciseIndex: 0,
  choice: 0
}, 'POST');
assert.equal(checkIncorrect.status, 200);
assert.equal(checkIncorrect.data.isCorrect, false);
assert.equal(checkIncorrect.data.correctIndex, 1);

console.log('PASS 2: Exercise evaluation endpoint validates choices without exposing keys beforehand');

// 3. Test Invalid & Missing Lesson ID Handling
const missingLesson = await request('/curriculum/lessons/non_existent_fake_id_123');
assert.equal(missingLesson.status, 404);
assert.match(missingLesson.data.error, /Lesson not found/);

const missingCheck = await request('/curriculum/exercises/check', {
  lessonId: 'non_existent_fake_id_123',
  exerciseIndex: 0,
  choice: 0
}, 'POST');
assert.equal(missingCheck.status, 404);

console.log('PASS 3: Error handling and 404 status codes verified for missing/invalid lesson IDs');

// 4. Test Optional Section Handling
const publicU2L1 = getPublicLesson('pre-a1-u2-l1');
assert.ok(publicU2L1.id);
assert.ok(publicU2L1.primaryObjective);
assert.ok(publicU2L1.exercises.length === 5);

console.log('PASS 4: Graceful handling of optional pedagogical fields verified');

console.log('ALL SHARED LEARNING EXPERIENCE INTEGRATION TESTS PASSED (100%).');
