/**
 * Lingo Personalized Daily Reminder Engine (isomorphic).
 * Builds two concise, mobile-friendly reminders from real user progress:
 *   1. "Continue Your Journey" — compact CEFR/Unit % & next lesson summary
 *   2. "Daily Motivation" — compact streak, daily goal & XP spark
 */

import { CURRICULUM_CATALOG } from './curriculumCatalog.mjs';

export function buildPersonalizedDailyReminders({ user, progress, levels = CURRICULUM_CATALOG.levels } = {}) {
  const firstName = String(user?.name || user?.username || 'Learner').trim().split(/\s+/)[0];
  const completedSet = new Set(Array.isArray(progress?.completed) ? progress.completed : []);
  const checkpointSet = new Set(Array.isArray(progress?.checkpoints) ? progress.checkpoints : []);

  let totalLessons = 0;
  let completedCount = 0;
  let currentLevel = levels[0]?.code || 'Pre-A1';
  let currentLevelName = levels[0]?.name || 'English Starter';
  let nextTarget = null;

  for (const lvl of levels) {
    let levelTotal = 0;
    let levelDone = 0;
    for (const sec of (lvl.sections || [])) {
      for (const unit of (sec.units || [])) {
        for (const item of (unit.lessons || [])) {
          if (item.isCheckpoint) {
            if (!nextTarget && levelDone === levelTotal && !checkpointSet.has(item.id) && !completedSet.has(item.id)) {
              nextTarget = {
                levelCode: lvl.code,
                levelName: lvl.name,
                sectionTitle: sec.title,
                unitTitle: unit.title,
                unitNumber: unit.unitNumber,
                lessonId: item.id,
                lessonTitle: item.title,
                isCheckpoint: true
              };
            }
            continue;
          }
          const canonicalId = item.realLessonId || item.id;
          totalLessons += 1;
          levelTotal += 1;
          const isDone = completedSet.has(canonicalId);
          if (isDone) {
            completedCount += 1;
            levelDone += 1;
          } else if (!nextTarget) {
            nextTarget = {
              levelCode: lvl.code,
              levelName: lvl.name,
              sectionTitle: sec.title,
              unitTitle: unit.title,
              unitNumber: unit.unitNumber,
              lessonId: canonicalId,
              lessonTitle: item.title,
              isCheckpoint: false
            };
          }
        }
      }
    }
    if (levelDone > 0) {
      currentLevel = lvl.code;
      currentLevelName = lvl.name;
    }
  }

  const progressPct = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;
  const activeLevelCode = nextTarget?.levelCode || currentLevel;

  const journeyTitle = nextTarget
    ? `Continue ${activeLevelCode} • Unit ${nextTarget.unitNumber}`
    : `All ${totalLessons} Lessons Complete!`;
  const journeyBody = nextTarget
    ? `${completedCount}/${totalLessons} done (${progressPct}%) · Next: ${nextTarget.lessonTitle}`
    : `${completedCount}/${totalLessons} mastered (100%) · Try Practice or a Friends match!`;

  const streak = Number(progress?.streak || 0);
  const xp = Number(progress?.xp || 0);
  const gems = Number(progress?.gems || 0);
  const goal = Math.max(1, Number(progress?.goal || 10));
  const todayWords = Number(progress?.todayWords || 0);
  const remainingWords = Math.max(0, goal - todayWords);

  let motivationTitle;
  let motivationBody;
  let targetPage = 'learn';

  if (todayWords >= goal) {
    motivationTitle = streak > 0 ? `Goal Hit • ${streak}d Streak!` : 'Daily Goal Complete!';
    motivationBody = `${todayWords} words & ${xp} XP today. Keep your edge, ${firstName}!`;
    targetPage = 'practice';
  } else if (streak > 0) {
    motivationTitle = `Keep Your ${streak}d Streak Alive!`;
    motivationBody = `Just ${remainingWords} more ${remainingWords === 1 ? 'word' : 'words'} for today's goal, ${firstName}.`;
    targetPage = 'learn';
  } else {
    motivationTitle = `Start Your Streak, ${firstName}!`;
    motivationBody = `3 mins today (${remainingWords} words to goal) builds unstoppable English.`;
    targetPage = 'learn';
  }

  return {
    journey: {
      id: 'journey',
      osId: 9001,
      badge: 'CONTINUE YOUR JOURNEY',
      title: journeyTitle,
      body: journeyBody,
      levelCode: activeLevelCode,
      levelName: nextTarget?.levelName || currentLevelName,
      unitNumber: nextTarget?.unitNumber || '01',
      unitTitle: nextTarget?.unitTitle || 'All Units Mastered',
      lessonTitle: nextTarget?.lessonTitle || 'Review & Practice',
      nextLessonId: nextTarget?.lessonId || null,
      isCheckpoint: Boolean(nextTarget?.isCheckpoint),
      completedCount,
      totalLessons,
      progressPct
    },
    motivation: {
      id: 'motivation',
      osId: 9002,
      badge: 'DAILY MOTIVATION',
      title: motivationTitle,
      body: motivationBody,
      streak,
      todayWords,
      goal,
      remainingWords,
      xp,
      gems,
      targetPage
    }
  };
}
