/**
 * Server-Authoritative Achievement & Badge Evaluation Engine
 *
 * - Reads user progress as the single source of truth.
 * - Prevents duplicate awards (idempotent per badge ID).
 * - Computes exact progress for all 36+ locked & unlocked badges.
 * - Safely backfills existing users without modifying/resetting existing progress.
 */

import { CURRICULUM_CATALOG, LEARNING_OBJECTIVES } from './curriculumCatalog.mjs';
import { BADGE_CATALOG, BADGE_BY_ID } from './badgeCatalog.mjs';

// Precompute curriculum hierarchy lookups once at module load
const LESSON_META = new Map();
const UNITS_META = [];
const SECTIONS_META = [];
const LEVELS_META = [];

for (const level of CURRICULUM_CATALOG.levels) {
  const levelLessonIds = [];
  const levelSectionIds = [];
  for (const section of level.sections || []) {
    const sectionLessonIds = [];
    const sectionUnitIds = [];
    for (const unit of section.units || []) {
      const unitLessonIds = (unit.lessons || []).map(l => l.id);
      const targetDurationSec = (unit.lessons || []).reduce(
        (sum, l) => sum + ((Number(l.estimatedDurationMin) || 5) * 60),
        0
      );
      UNITS_META.push({
        id: unit.id,
        title: unit.title,
        sectionId: section.id,
        levelId: level.id,
        lessonIds: unitLessonIds,
        targetDurationSec
      });
      sectionUnitIds.push(unit.id);
      sectionLessonIds.push(...unitLessonIds);
      levelLessonIds.push(...unitLessonIds);

      for (const lesson of unit.lessons || []) {
        const objDomains = (lesson.objectives || [])
          .map(oid => LEARNING_OBJECTIVES[oid]?.skillDomain)
          .filter(Boolean);
        const isGrammarLesson =
          objDomains.includes('grammar') ||
          String(lesson.pedagogicalFocus || '').toLowerCase().includes('grammar');
        LESSON_META.set(lesson.id, {
          id: lesson.id,
          unitId: unit.id,
          sectionId: section.id,
          levelId: level.id,
          isGrammarLesson,
          exerciseCount: (lesson.exercises || []).length || 5,
          targetDurationSec: (Number(lesson.estimatedDurationMin) || 5) * 60
        });
      }
    }
    SECTIONS_META.push({
      id: section.id,
      title: section.title,
      levelId: level.id,
      unitIds: sectionUnitIds,
      lessonIds: sectionLessonIds
    });
    levelSectionIds.push(section.id);
  }
  LEVELS_META.push({
    id: level.id,
    code: level.code,
    name: level.name,
    sectionIds: levelSectionIds,
    lessonIds: levelLessonIds
  });
}

// Build valid curriculum vocabulary set so users can save lesson vocabulary words as well as daily words
export const CURRICULUM_VOCAB_TERMS = new Set([
  'Serendipity', 'Resilient', 'Curious', 'Wanderlust',
  'Gratitude', 'Flourish', 'Mindful', 'Courage'
]);
for (const level of CURRICULUM_CATALOG.levels) {
  for (const section of level.sections || []) {
    for (const unit of section.units || []) {
      for (const lesson of unit.lessons || []) {
        for (const v of lesson.vocabulary || []) {
          if (v?.term && typeof v.term === 'string') {
            CURRICULUM_VOCAB_TERMS.add(v.term.trim());
          }
        }
      }
    }
  }
}

export function isValidVocabTerm(term) {
  if (typeof term !== 'string') return false;
  const clean = term.trim();
  if (!clean || clean.length > 60) return false;
  return CURRICULUM_VOCAB_TERMS.has(clean);
}

export function ensureAchievementState(progress) {
  if (!progress.badges || typeof progress.badges !== 'object' || Array.isArray(progress.badges)) {
    progress.badges = {};
  }
  if (!progress.achievementProgress || typeof progress.achievementProgress !== 'object') {
    progress.achievementProgress = {};
  }
  if (!progress.achievementStats || typeof progress.achievementStats !== 'object') {
    progress.achievementStats = {};
  }
  const s = progress.achievementStats;
  if (!s.lessonScores || typeof s.lessonScores !== 'object') s.lessonScores = {};
  if (!Array.isArray(s.unitCompletionDates)) s.unitCompletionDates = [];
  if (!Array.isArray(s.dailyActivities)) s.dailyActivities = [];
  if (typeof s.grammarExercisesCompleted !== 'number') s.grammarExercisesCompleted = 0;
  if (typeof s.perfectAssessments !== 'number') s.perfectAssessments = 0;
  if (typeof s.fastExercisesCount !== 'number') s.fastExercisesCount = 0;
  if (typeof s.bestStreak !== 'number') s.bestStreak = Number(progress.streak) || 0;
  return progress;
}

function dayDiffISO(dateA, dateB) {
  const a = Date.parse(`${dateA}T00:00:00Z`);
  const b = Date.parse(`${dateB}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 999;
  return Math.round((b - a) / 86400000);
}

function computeConsecutiveUnitStreak(unitCompletionDates) {
  if (!Array.isArray(unitCompletionDates) || unitCompletionDates.length === 0) return 0;
  const sorted = [...unitCompletionDates]
    .filter(x => x && x.unitId && x.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) return 0;
  let best = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = dayDiffISO(sorted[i - 1].date, sorted[i].date);
    if (diff === 0 || diff === 1) {
      current++;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return best;
}

/**
 * Records telemetry from a verified server-side event before running badge evaluation.
 */
export function recordAchievementTelemetry(progress, event = {}, nowIso = new Date().toISOString()) {
  ensureAchievementState(progress);
  const stats = progress.achievementStats;
  const dateKey = nowIso.slice(0, 10);

  if ((Number(progress.streak) || 0) > (stats.bestStreak || 0)) {
    stats.bestStreak = Number(progress.streak) || 0;
  }

  if (event.type === 'lesson_completed' && event.lessonId) {
    const prev = stats.lessonScores[event.lessonId];
    const total = Number(event.total) || 5;
    const correct = Number(event.correct) || 0;
    const isPerfect = total > 0 && correct >= total;
    const durationSec = typeof event.durationSec === 'number' && event.durationSec > 0
      ? Math.min(3600, Math.round(event.durationSec))
      : null;

    stats.lessonScores[event.lessonId] = {
      bestScore: Math.max(prev?.bestScore || 0, correct),
      total,
      perfect: Boolean(prev?.perfect || isPerfect),
      durationSec: prev?.durationSec && durationSec
        ? Math.min(prev.durationSec, durationSec)
        : (durationSec ?? prev?.durationSec ?? null),
      updatedAt: nowIso
    };

    if (isPerfect && event.passed) {
      stats.perfectAssessments = Math.max(1, (stats.perfectAssessments || 0) + (prev?.perfect ? 0 : 1));
    }

    const meta = LESSON_META.get(event.lessonId);
    if (meta?.isGrammarLesson && event.passed && event.fresh) {
      stats.grammarExercisesCompleted += total;
    }

    if (Array.isArray(event.exerciseTimesSec)) {
      const fastCount = event.exerciseTimesSec.filter(t => typeof t === 'number' && t >= 0.5 && t <= 15).length;
      if (fastCount > 0) {
        stats.fastExercisesCount += fastCount;
      }
    } else if (durationSec && durationSec <= total * 15 && event.passed) {
      stats.fastExercisesCount += total;
    }

    if (event.passed && !stats.dailyActivities.includes(dateKey)) {
      stats.dailyActivities.push(dateKey);
    }
  }

  if (event.type === 'checkpoint_completed' && event.passed) {
    const total = Number(event.total) || 5;
    const correct = Number(event.correct) || 0;
    if (total > 0 && correct >= total) {
      stats.perfectAssessments = (stats.perfectAssessments || 0) + 1;
    }
    if (!stats.dailyActivities.includes(dateKey)) {
      stats.dailyActivities.push(dateKey);
    }
  }

  if (event.type === 'assessment_completed' && event.passed) {
    const total = Number(event.total) || 0;
    const correct = Number(event.correct) || 0;
    if (total > 0 && correct >= total) {
      stats.perfectAssessments = (stats.perfectAssessments || 0) + 1;
    }
    if (!stats.dailyActivities.includes(dateKey)) {
      stats.dailyActivities.push(dateKey);
    }
  }

  if (event.type === 'daily_activity_completed' && !stats.dailyActivities.includes(dateKey)) {
    stats.dailyActivities.push(dateKey);
  }

  if (event.type === 'grammar_exercise_completed') {
    const count = Math.max(1, Math.min(20, Number(event.count) || 1));
    stats.grammarExercisesCompleted += count;
    if (event.fast) {
      stats.fastExercisesCount += 1;
    }
  }

  if (event.fast && event.type === 'game_answer_correct') {
    stats.fastExercisesCount += 1;
  }
}

/**
 * Computes all authoritative metrics from current progress (supports backfill too).
 */
export function computeAchievementMetrics(progress, nowIso = new Date().toISOString()) {
  ensureAchievementState(progress);
  const completedSet = new Set(progress.completed || []);
  const stats = progress.achievementStats;
  const dateKey = nowIso.slice(0, 10);

  // Determine completed, perfect, and timed units from canonical catalog
  const completedUnitIds = [];
  const perfectUnitIds = [];
  const fastUnitIds = [];
  const recordedUnitIds = new Set(stats.unitCompletionDates.map(x => x.unitId));

  for (const unit of UNITS_META) {
    if (unit.lessonIds.length > 0 && unit.lessonIds.every(id => completedSet.has(id))) {
      completedUnitIds.push(unit.id);
      if (!recordedUnitIds.has(unit.id)) {
        stats.unitCompletionDates.push({ unitId: unit.id, date: dateKey });
        recordedUnitIds.add(unit.id);
      }

      const unitScores = unit.lessonIds.map(id => stats.lessonScores[id]);
      if (unitScores.every(sc => sc && sc.perfect)) {
        perfectUnitIds.push(unit.id);
      }

      if (unitScores.every(sc => sc && typeof sc.durationSec === 'number' && sc.durationSec > 0)) {
        const totalDuration = unitScores.reduce((sum, sc) => sum + sc.durationSec, 0);
        if (totalDuration <= unit.targetDurationSec) {
          fastUnitIds.push(unit.id);
        }
      }
    }
  }

  // Sections
  const completedSectionIds = [];
  const perfectSectionIds = [];
  for (const section of SECTIONS_META) {
    if (section.lessonIds.length > 0 && section.lessonIds.every(id => completedSet.has(id))) {
      completedSectionIds.push(section.id);
      if (section.lessonIds.every(id => stats.lessonScores[id]?.perfect)) {
        perfectSectionIds.push(section.id);
      }
    }
  }

  // CEFR levels (strictly 100% of lessons in the level)
  const completedLevelIds = [];
  const levelCompletedCounts = {};
  const levelTotalCounts = {};
  for (const level of LEVELS_META) {
    const done = level.lessonIds.filter(id => completedSet.has(id)).length;
    levelCompletedCounts[level.id] = done;
    levelTotalCounts[level.id] = level.lessonIds.length;
    if (level.lessonIds.length > 0 && done === level.lessonIds.length) {
      completedLevelIds.push(level.id);
    }
  }

  // Backfill grammar exercise count safely from already-completed grammar lessons if telemetry missed them
  let backfilledGrammarCount = 0;
  for (const lessonId of completedSet) {
    const meta = LESSON_META.get(lessonId);
    if (meta?.isGrammarLesson) {
      backfilledGrammarCount += meta.exerciseCount;
    }
  }
  const grammarExercisesCompleted = Math.max(
    stats.grammarExercisesCompleted || 0,
    backfilledGrammarCount
  );

  // Backfill perfect assessments if lessonScores shows any perfect lesson
  const anyPerfectLesson = Object.values(stats.lessonScores).some(s => s?.perfect);
  const perfectAssessments = Math.max(
    stats.perfectAssessments || 0,
    anyPerfectLesson ? 1 : 0
  );

  // Daily activities count: union of history keys with >0 words and recorded dailyActivities dates
  const activeDates = new Set(stats.dailyActivities || []);
  for (const [d, val] of Object.entries(progress.history || {})) {
    if (Number(val) > 0) activeDates.add(d);
  }
  const dailyActivitiesCount = activeDates.size;

  const bestStreak = Math.max(Number(progress.streak) || 0, stats.bestStreak || 0);
  stats.bestStreak = bestStreak;

  return {
    unitsCompleted: completedUnitIds.length,
    completedUnitIds,
    perfectUnits: perfectUnitIds.length,
    perfectUnitIds,
    fastUnits: fastUnitIds.length,
    fastUnitIds,
    consecutiveUnitStreak: computeConsecutiveUnitStreak(stats.unitCompletionDates),
    sectionsCompleted: completedSectionIds.length,
    completedSectionIds,
    perfectSections: perfectSectionIds.length,
    perfectSectionIds,
    levelsCompleted: completedLevelIds.length,
    completedLevelIds,
    levelCompletedCounts,
    levelTotalCounts,
    bestStreak,
    savedWordsCount: Array.isArray(progress.saved) ? progress.saved.length : 0,
    grammarExercisesCompleted,
    perfectAssessments,
    fastExercisesCount: stats.fastExercisesCount || 0,
    dailyActivitiesCount
  };
}

function resolveBadgeTargetAndCurrent(badge, metrics) {
  const cond = badge.unlockCondition || {};
  const metric = cond.metric;

  if (metric === 'levelLessonsCompleted') {
    const levelId = cond.levelId;
    const current = metrics.levelCompletedCounts[levelId] || 0;
    const target = metrics.levelTotalCounts[levelId] || 1;
    const relatedEntityId = levelId;
    return {
      current: Math.min(current, target),
      target,
      qualified: target > 0 && current >= target,
      relatedEntityType: 'cefr',
      relatedEntityId
    };
  }

  const rawCurrent = Number(metrics[metric] ?? 0);
  const target = Math.max(1, Number(cond.target || 1));

  let relatedEntityType = badge.category;
  let relatedEntityId = null;
  if (badge.category === 'unit') {
    relatedEntityType = 'unit';
    if (metric === 'perfectUnits') relatedEntityId = metrics.perfectUnitIds[0] || null;
    else if (metric === 'fastUnits') relatedEntityId = metrics.fastUnitIds[0] || null;
    else relatedEntityId = metrics.completedUnitIds[metrics.completedUnitIds.length - 1] || null;
  } else if (badge.category === 'section') {
    relatedEntityType = 'section';
    if (metric === 'perfectSections') relatedEntityId = metrics.perfectSectionIds[0] || null;
    else if (metric === 'levelsCompleted') {
      relatedEntityType = 'cefr';
      relatedEntityId = metrics.completedLevelIds[0] || null;
    } else {
      relatedEntityId = metrics.completedSectionIds[metrics.completedSectionIds.length - 1] || null;
    }
  } else if (badge.category === 'cefr') {
    relatedEntityType = 'cefr';
    relatedEntityId = metrics.completedLevelIds[metrics.completedLevelIds.length - 1] || null;
  } else if (badge.category === 'streak') {
    relatedEntityType = 'streak';
    relatedEntityId = `${target}-day`;
  } else {
    relatedEntityType = 'learning';
    relatedEntityId = badge.id;
  }

  return {
    current: Math.min(rawCurrent, target),
    target,
    qualified: rawCurrent >= target,
    relatedEntityType,
    relatedEntityId
  };
}

/**
 * Evaluates all 36+ badges safely, returning any newly unlocked badges
 * while updating progress.badges & progress.achievementProgress in place.
 */
export function evaluateAchievements(progress, event = { type: 'evaluate' }, nowIso = new Date().toISOString()) {
  if (event && event.type !== 'backfill' && event.type !== 'evaluate') {
    recordAchievementTelemetry(progress, event, nowIso);
  } else {
    ensureAchievementState(progress);
  }

  const metrics = computeAchievementMetrics(progress, nowIso);
  const newlyUnlocked = [];

  for (const badge of BADGE_CATALOG) {
    const evalState = resolveBadgeTargetAndCurrent(badge, metrics);
    const alreadyEarned = Boolean(progress.badges[badge.id]);

    progress.achievementProgress[badge.id] = {
      achievementId: badge.id,
      currentProgress: alreadyEarned ? evalState.target : evalState.current,
      targetProgress: evalState.target,
      updatedAt: nowIso
    };

    if (evalState.qualified && !alreadyEarned) {
      const awardRecord = {
        badgeId: badge.id,
        earnedAt: nowIso,
        relatedEntityType: event?.relatedEntityType || evalState.relatedEntityType,
        relatedEntityId: event?.relatedEntityId || evalState.relatedEntityId
      };
      progress.badges[badge.id] = awardRecord;
      newlyUnlocked.push({
        ...badge,
        earnedAt: awardRecord.earnedAt,
        relatedEntityType: awardRecord.relatedEntityType,
        relatedEntityId: awardRecord.relatedEntityId
      });
    }
  }

  return {
    newlyUnlocked,
    earnedBadges: progress.badges,
    achievementProgress: progress.achievementProgress
  };
}

export function formatAchievementSummary(progress) {
  ensureAchievementState(progress);
  const earnedIds = Object.keys(progress.badges).filter(id => BADGE_BY_ID.has(id));
  const totalCount = BADGE_CATALOG.length;
  const earnedCount = earnedIds.length;
  const percentage = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  const recent = earnedIds
    .map(id => ({
      ...BADGE_BY_ID.get(id),
      ...progress.badges[id]
    }))
    .sort((a, b) => String(b.earnedAt || '').localeCompare(String(a.earnedAt || '')))
    .slice(0, 6);

  return {
    earnedCount,
    totalCount,
    percentage,
    recent
  };
}
