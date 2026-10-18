import React, { useState, useMemo } from 'react';
import { CEFR_LEVELS, calculateLevelProgress, realLessons, getLevelLessons } from '../../curriculumData.js';
import { LearningHeader } from './LearningHeader.jsx';
import { CourseLevelSelector } from './CourseLevelSelector.jsx';
import { CourseProgressOverview } from './CourseProgressOverview.jsx';
import { SectionCard } from './SectionCard.jsx';
import { LessonPreviewModal } from './LessonPreviewModal.jsx';
import { Sparkles, Trophy, Check, ArrowRight } from 'lucide-react';

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

  // Find active level configuration
  const activeLevel = useMemo(() => {
    return CEFR_LEVELS.find(l => l.id === activeLevelId) || CEFR_LEVELS[0];
  }, [activeLevelId]);

  // Compute stats for current level
  const activeLevelStats = useMemo(() => {
    return calculateLevelProgress(activeLevel, userCompleted);
  }, [activeLevel, userCompleted]);

  // Handle lesson click
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
    setPreviewPrerequisite(prerequisiteName);
  }

  return (
    <div className="learning-page-redesign" id={`panel-${activeLevel.id}`}>
      {/* 1. Header with Title, Encouraging Subtitle, Streak & Course Stats */}
      <LearningHeader
        progress={progress}
        activeLevel={activeLevel}
        activeLevelStats={activeLevelStats}
        onOpenProgressModal={onOpenProgressModal}
      />

      {/* 2. CEFR 7-Stage Course Overview Navigator */}
      <CourseLevelSelector
        activeLevelId={activeLevelId}
        onSelectLevel={setActiveLevelId}
        userCompleted={userCompleted}
      />

      {/* 3. Stage Objectives & Recommended Next Action */}
      <CourseProgressOverview
        activeLevel={activeLevel}
        activeLevelStats={activeLevelStats}
        nextRecommendedLesson={
          getLevelLessons(activeLevel)
            .find(l => (l.realLessonId || l.id) === activeLesson?.id)
        }
        onStartLesson={lesson => {
          const realObj = realLessons.find(r => r.id === lesson.realLessonId);
          if (realObj) openLesson(realObj);
        }}
      />

      {/* 4. Section-Based Course Map */}
      <div className="course-sections-list">
        {activeLevel.sections.map((section, idx) => (
          <SectionCard
            key={section.id}
            section={section}
            userCompleted={userCompleted}
            activeLessonId={activeLesson?.id}
            onSelectLesson={handleSelectLesson}
            defaultExpanded={idx === 0}
          />
        ))}
      </div>

      {/* 5. Encouraging Footer Note */}
      <div className="learning-note">
        <span>✨</span>
        <div>
          <h3>Your journey, not a race.</h3>
          <p>
            Score 3 out of 5 to unlock the next level. Revisit any completed lesson whenever you like
            to keep your English fresh and natural.
          </p>
        </div>
      </div>

      {/* 6. Preview & Locked Lesson Modal */}
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
