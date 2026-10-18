import assert from 'node:assert/strict';
import { CURRICULUM_CATALOG, getPublicLesson } from '../server/curriculumCatalog.mjs';
import {
  CEFR_LEVELS,
  calculateLevelProgress,
  getUnitLessons,
  getSectionLessons,
  getLevelLessons,
  getAllActiveLessons,
  isActualLesson,
  getLessonStatus
} from '../src/curriculumData.js';
import { lessons as contentLessons } from '../content.js';

console.log('--- RUNNING CURRICULUM COUNT RECONCILIATION TEST SUITE ---');

// TEST 1: Canonical backend curriculum inventory matches expected CEFR targets
const preA1Catalog = CURRICULUM_CATALOG.levels.find(l => l.id === 'pre-a1');
const a1Catalog = CURRICULUM_CATALOG.levels.find(l => l.id === 'a1');
const a2Catalog = CURRICULUM_CATALOG.levels.find(l => l.id === 'a2');
const b1Catalog = CURRICULUM_CATALOG.levels.find(l => l.id === 'b1');
const b2Catalog = CURRICULUM_CATALOG.levels.find(l => l.id === 'b2');
const c1Catalog = CURRICULUM_CATALOG.levels.find(l => l.id === 'c1');
const c2Catalog = CURRICULUM_CATALOG.levels.find(l => l.id === 'c2');

const preA1CatIds = preA1Catalog.sections.flatMap(s => s.units).flatMap(u => u.lessons).map(l => l.id);
const a1CatIds = a1Catalog.sections.flatMap(s => s.units).flatMap(u => u.lessons).map(l => l.id);
const a2CatIds = a2Catalog.sections.flatMap(s => s.units).flatMap(u => u.lessons).map(l => l.id);
const b1CatIds = b1Catalog.sections.flatMap(s => s.units).flatMap(u => u.lessons).map(l => l.id);
const b2CatIds = b2Catalog.sections.flatMap(s => s.units).flatMap(u => u.lessons).map(l => l.id);
const c1CatIds = c1Catalog.sections.flatMap(s => s.units).flatMap(u => u.lessons).map(l => l.id);
const c2CatIds = c2Catalog.sections.flatMap(s => s.units).flatMap(u => u.lessons).map(l => l.id);

assert.equal(preA1CatIds.length, 18, 'Pre-A1 backend catalog must contain exactly 18 lessons');
assert.equal(a1CatIds.length, 20, 'A1 backend catalog must contain exactly 20 lessons');
assert.equal(a2CatIds.length, 20, 'A2 backend catalog must contain exactly 20 lessons');
assert.equal(b1CatIds.length, 20, 'B1 backend catalog must contain exactly 20 lessons');
assert.equal(b2CatIds.length, 20, 'B2 backend catalog must contain exactly 20 lessons');
assert.equal(c1CatIds.length, 20, 'C1 backend catalog must contain exactly 20 lessons');
assert.equal(c2CatIds.length, 20, 'C2 backend catalog must contain exactly 20 lessons');
assert.equal(preA1CatIds.length + a1CatIds.length + a2CatIds.length + b1CatIds.length + b2CatIds.length + c1CatIds.length + c2CatIds.length, 138, 'Total canonical lessons must equal 138');
console.log('PASS 1: Canonical backend inventory verified (18 Pre-A1 + 20 A1 + 20 A2 + 20 B1 + 20 B2 + 20 C1 + 20 C2 = 138 lessons)');

// TEST 2: UI curriculum mapping matches canonical backend inventory 1-to-1
const preA1UI = CEFR_LEVELS.find(l => l.id === 'pre-a1');
const a1UI = CEFR_LEVELS.find(l => l.id === 'a1');
const a2UI = CEFR_LEVELS.find(l => l.id === 'a2');
const b1UI = CEFR_LEVELS.find(l => l.id === 'b1');
const b2UI = CEFR_LEVELS.find(l => l.id === 'b2');
const c1UI = CEFR_LEVELS.find(l => l.id === 'c1');
const c2UI = CEFR_LEVELS.find(l => l.id === 'c2');

const preA1RealUI = getLevelLessons(preA1UI).map(l => l.realLessonId || l.id);
const a1RealUI = getLevelLessons(a1UI).map(l => l.realLessonId || l.id);
const a2RealUI = getLevelLessons(a2UI).map(l => l.realLessonId || l.id);
const b1RealUI = getLevelLessons(b1UI).map(l => l.realLessonId || l.id);
const b2RealUI = getLevelLessons(b2UI).map(l => l.realLessonId || l.id);
const c1RealUI = getLevelLessons(c1UI).map(l => l.realLessonId || l.id);
const c2RealUI = getLevelLessons(c2UI).map(l => l.realLessonId || l.id);

assert.deepEqual(preA1RealUI, preA1CatIds, 'Pre-A1 UI lessons must match backend catalog lessons exactly');
assert.deepEqual(a1RealUI, a1CatIds, 'A1 UI lessons must match backend catalog lessons exactly');
assert.deepEqual(a2RealUI, a2CatIds, 'A2 UI lessons must match backend catalog lessons exactly');
assert.deepEqual(b1RealUI, b1CatIds, 'B1 UI lessons must match backend catalog lessons exactly');
assert.deepEqual(b2RealUI, b2CatIds, 'B2 UI lessons must match backend catalog lessons exactly');
assert.deepEqual(c1RealUI, c1CatIds, 'C1 UI lessons must match backend catalog lessons exactly');
assert.deepEqual(c2RealUI, c2CatIds, 'C2 UI lessons must match backend catalog lessons exactly');
console.log('PASS 2: UI curriculum mapping matches canonical backend inventory 1-to-1 without omissions or additions');

// TEST 3: Milestone checkpoints are preserved on visual path but excluded from lesson count
const countCheckpoints = level => {
  let count = 0;
  level.sections.forEach(s => s.units.forEach(u => u.lessons.forEach(l => {
    if (l.isCheckpoint) count++;
  })));
  return count;
};

const preA1Checkpoints = countCheckpoints(preA1UI);
const a1Checkpoints = countCheckpoints(a1UI);
const a2Checkpoints = countCheckpoints(a2UI);
const b1Checkpoints = countCheckpoints(b1UI);
const b2Checkpoints = countCheckpoints(b2UI);
const c1Checkpoints = countCheckpoints(c1UI);
const c2Checkpoints = countCheckpoints(c2UI);

assert.equal(preA1Checkpoints, 3, 'Pre-A1 must preserve 3 milestone checkpoints on course path');
assert.equal(a1Checkpoints, 5, 'A1 must preserve 5 milestone checkpoints on course path');
assert.equal(a2Checkpoints, 5, 'A2 must preserve 5 milestone checkpoints on course path');
assert.equal(b1Checkpoints, 5, 'B1 must preserve 5 milestone checkpoints on course path');
assert.equal(b2Checkpoints, 5, 'B2 must preserve 5 milestone checkpoints on course path');
assert.equal(c1Checkpoints, 5, 'C1 must preserve 5 milestone checkpoints on course path');
assert.equal(c2Checkpoints, 5, 'C2 must preserve 5 milestone checkpoints on course path');
assert.equal(preA1Checkpoints + a1Checkpoints + a2Checkpoints + b1Checkpoints + b2Checkpoints + c1Checkpoints + c2Checkpoints, 33, 'Total checkpoints across Pre-A1 through C2 must equal 33');
console.log('PASS 3: Visual milestone checkpoints preserved on path (3 + 5 + 5 + 5 + 5 + 5 + 5 = 33 checkpoints) while excluded from lesson tally');

// TEST 4: Section and unit totals equal actual lesson inventory
for (const [levelName, levelObj] of [['Pre-A1', preA1UI], ['A1', a1UI], ['A2', a2UI], ['B1', b1UI], ['B2', b2UI], ['C1', c1UI], ['C2', c2UI]]) {
  let sectionLessonSum = 0;
  let unitLessonSum = 0;

  levelObj.sections.forEach(s => {
    const secLessons = getSectionLessons(s);
    sectionLessonSum += secLessons.length;
    s.units.forEach(u => {
      const uLessons = getUnitLessons(u);
      unitLessonSum += uLessons.length;
    });
  });

  const levelTotal = getLevelLessons(levelObj).length;
  assert.equal(sectionLessonSum, levelTotal, `${levelName}: Sum of section lessons (${sectionLessonSum}) must equal level total (${levelTotal})`);
  assert.equal(unitLessonSum, levelTotal, `${levelName}: Sum of unit lessons (${unitLessonSum}) must equal level total (${levelTotal})`);
}
console.log('PASS 4: Section and unit lesson totals consistently equal actual lesson inventory across all active levels');

// TEST 5: Dashboard and level-card counts are derived consistently
const allActiveLessons = getAllActiveLessons();
assert.equal(allActiveLessons.length, 138, 'getAllActiveLessons() must return exactly 138 lessons');
assert.equal(contentLessons.length, 138, 'content.js lessons array (used by Dashboard) must equal 138');

const statsPreA1 = calculateLevelProgress(preA1UI, []);
const statsA1 = calculateLevelProgress(a1UI, []);
const statsA2 = calculateLevelProgress(a2UI, []);
const statsB1 = calculateLevelProgress(b1UI, []);
const statsB2 = calculateLevelProgress(b2UI, []);
const statsC1 = calculateLevelProgress(c1UI, []);
const statsC2 = calculateLevelProgress(c2UI, []);

assert.equal(statsPreA1.total, 18, 'Pre-A1 level card stats.total must equal 18');
assert.equal(statsA1.total, 20, 'A1 level card stats.total must equal 20');
assert.equal(statsA2.total, 20, 'A2 level card stats.total must equal 20');
assert.equal(statsB1.total, 20, 'B1 level card stats.total must equal 20');
assert.equal(statsB2.total, 20, 'B2 level card stats.total must equal 20');
assert.equal(statsC1.total, 20, 'C1 level card stats.total must equal 20');
assert.equal(statsC2.total, 20, 'C2 level card stats.total must equal 20');
assert.equal(statsPreA1.total + statsA1.total + statsA2.total + statsB1.total + statsB2.total + statsC1.total + statsC2.total, 138, 'Sum of level card totals must equal 138');
console.log('PASS 5: Dashboard and level-card counts are derived consistently (138 total across dashboard and level cards)');

// TEST 6: Legacy aliases do not create duplicate lesson counts
const uniqueIds = new Set(allActiveLessons.map(l => l.realLessonId || l.id));
assert.equal(uniqueIds.size, 138, 'There must be exactly 138 unique lesson IDs without duplicate aliases');
console.log('PASS 6: Legacy aliases (e.g., hello, food, past, confidence) resolve cleanly without inflating counts');

// TEST 7: Progression and level completion percentage reach 100% when all real lessons are completed
const completedAllPreA1 = calculateLevelProgress(preA1UI, preA1CatIds);
assert.equal(completedAllPreA1.completedCount, 18, 'Completed count must be 18 when all Pre-A1 lessons done');
assert.equal(completedAllPreA1.percentage, 100, 'Pre-A1 completion percentage must reach 100%');
assert.equal(completedAllPreA1.status, 'completed', 'Pre-A1 status must be completed');

const completedAllB1 = calculateLevelProgress(b1UI, b1CatIds);
assert.equal(completedAllB1.completedCount, 20, 'Completed count must be 20 when all B1 lessons done');
assert.equal(completedAllB1.percentage, 100, 'B1 completion percentage must reach 100%');
assert.equal(completedAllB1.status, 'completed', 'B1 status must be completed');

const completedAllB2 = calculateLevelProgress(b2UI, b2CatIds);
assert.equal(completedAllB2.completedCount, 20, 'Completed count must be 20 when all B2 lessons done');
assert.equal(completedAllB2.percentage, 100, 'B2 completion percentage must reach 100%');
assert.equal(completedAllB2.status, 'completed', 'B2 status must be completed');

const completedAllC1 = calculateLevelProgress(c1UI, c1CatIds);
assert.equal(completedAllC1.completedCount, 20, 'Completed count must be 20 when all C1 lessons done');
assert.equal(completedAllC1.percentage, 100, 'C1 completion percentage must reach 100%');
assert.equal(completedAllC1.status, 'completed', 'C1 status must be completed');

const completedAllC2 = calculateLevelProgress(c2UI, c2CatIds);
assert.equal(completedAllC2.completedCount, 20, 'Completed count must be 20 when all C2 lessons done');
assert.equal(completedAllC2.percentage, 100, 'C2 completion percentage must reach 100%');
assert.equal(completedAllC2.status, 'completed', 'C2 status must be completed');

const completedPartial = calculateLevelProgress(preA1UI, ['hello']);
assert.equal(completedPartial.completedCount, 1, 'Completed count must be 1');
assert.equal(completedPartial.percentage, 6, 'Partial percentage must calculate accurately');
assert.equal(completedPartial.status, 'in_progress', 'Status must be in_progress');
console.log('PASS 7: Progression calculations and 100% completion verification validated');

// TEST 8: Every canonical lesson is fetchable via getPublicLesson
for (const lessonId of [...preA1CatIds, ...a1CatIds, ...a2CatIds, ...b1CatIds, ...b2CatIds, ...c1CatIds, ...c2CatIds]) {
  const publicLesson = getPublicLesson(lessonId);
  assert.ok(publicLesson, `Public lesson must exist for ID ${lessonId}`);
  assert.equal(publicLesson.id, lessonId, `Lesson ID must match ${lessonId}`);
  assert.equal(typeof publicLesson.solutionKey, 'undefined', 'solutionKey must never be exposed');
  assert.equal(typeof publicLesson.correctIndex, 'undefined', 'correctIndex must never be exposed');
}
console.log('PASS 8: All 138 canonical lessons verified fetchable with public answer-key seclusion');

console.log('ALL 8 CURRICULUM RECONCILIATION TESTS PASSED (100%).');
