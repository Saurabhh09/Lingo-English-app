import React, { useState, useMemo } from 'react';
import { CEFR_LEVELS, calculateLevelProgress, realLessons, getLevelLessons } from '../../curriculumData.js';
import { CourseHeader } from './CourseHeader.jsx';
import { WindingPathMap } from './WindingPathMap.jsx';
import { LessonPreviewModal } from './LessonPreviewModal.jsx';

export function Learn({ progress, openLesson, activeLesson, onOpenProgressModal }) {
  const userCompleted = progress?.completed || [];

  // Determine initial active level dynamically based on activeLesson
  const initialLevelId = useMemo(() => {
    if (!activeLesson) return 'pre-a1';
    for (const lvl of CEFR_LEVELS) {
      const allLessons = getLevelLessons(lvl);
      if (allLessons.some(l => (l.realLessonId || l.id) === activeLesson.id)) {
        return lvl.id;
      }
    }
    return 'pre-a1';
  }, [activeLesson]);

  const [activeLevelId, setActiveLevelId] = useState(initialLevelId);
  const [previewModalLesson, setPreviewModalLesson] = useState(null);
  const [previewLocked, setPreviewLocked] = useState(false);
  const [previewPrerequisite, setPreviewPrerequisite] = useState('');

  // Active level configuration
  const activeLevel = useMemo(() => {
    return CEFR_LEVELS.find(l => l.id === activeLevelId) || CEFR_LEVELS[0];
  }, [activeLevelId]);

  // Compute stats for current level
  const activeLevelStats = useMemo(() => {
    return calculateLevelProgress(activeLevel, userCompleted);
  }, [activeLevel, userCompleted]);

  // Handle lesson selection from winding path nodes
  function handleSelectLesson(lesson, status, prerequisiteName) {
    if (lesson.realLessonId) {
      const realObj = realLessons.find(r => r.id === lesson.realLessonId);
      if (status === 'locked') {
        setPreviewModalLesson(lesson);
        setPreviewLocked(true);
        setPreviewPrerequisite(prerequisiteName || 'the previous level');
        return;
      }
      if (realObj) {
        openLesson(realObj);
        return;
      }
    }

    // Otherwise show curriculum preview modal
    setPreviewModalLesson(lesson);
    setPreviewLocked(status === 'locked');
    setPreviewPrerequisite(prerequisiteName || 'the previous lesson');
  }

  return (
    <div className="learn-gamified-view" id={`panel-${activeLevel.id}`}>
      {/* 1. Sticky Course Header with CEFR Level Switcher Dropdown (Matching Reference Image) */}
      <CourseHeader
        activeLevel={activeLevel}
        activeLevelStats={activeLevelStats}
        onSelectLevel={setActiveLevelId}
        onOpenProgressModal={onOpenProgressModal}
      />

      {/* 2. Continuous Winding S-Curve Learning Trail (All Sections in One Flow) */}
      <WindingPathMap
        activeLevel={activeLevel}
        userCompleted={userCompleted}
        activeLessonId={activeLesson?.id}
        onSelectLesson={handleSelectLesson}
      />

      {/* 3. Lesson Preview & Locked Requirement Dialog Modal */}
      {previewModalLesson && (
        <LessonPreviewModal
          lesson={previewModalLesson}
          isLocked={previewLocked}
          prerequisiteName={previewPrerequisite}
          onClose={() => setPreviewModalLesson(null)}
          onStartReal={lesson => {
            const realObj = realLessons.find(r => r.id === lesson.realLessonId);
            if (realObj) openLesson(realObj);
          }}
        />
      )}
    </div>
  );
}
