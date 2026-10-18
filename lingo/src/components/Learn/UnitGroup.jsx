import React from 'react';
import { CoursePath } from './CoursePath.jsx';
import { getUnitLessons } from '../../curriculumData.js';
import { BookOpen, CheckCircle2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

export function UnitGroup({
  unit,
  userCompleted = [],
  activeLessonId,
  onSelectLesson
}) {
  // Compute unit completion stats
  const lessons = unit.lessons || [];
  const unitLessons = getUnitLessons(unit);
  const totalCount = unitLessons.length > 0 ? unitLessons.length : lessons.length;

  const completedCount = unitLessons.filter(l =>
    userCompleted.includes(l.realLessonId || l.id)
  ).length;

  const isFullyCompleted = completedCount >= totalCount && totalCount > 0;
  const progressPct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <div className={`unit-card-group ${isFullyCompleted ? 'is-unit-completed' : ''}`}>
      {/* Unit Header */}
      <div className="unit-header-block">
        <div className="unit-header-left">
          <span className="unit-badge lime">
            {unit.unitNumber || '01'}
          </span>
          <div className="unit-title-meta">
            <span className="eyebrow">{unit.eyebrow || 'UNIT MODULE'}</span>
            <h3 className="unit-title-text">{unit.title}</h3>
            {unit.objective && (
              <p className="unit-objective-text">{unit.objective}</p>
            )}
          </div>
        </div>

        <div className="unit-header-right">
          <div className="unit-meta-stats">
            {/* The test checks .unit-count with text '1 / 3 completed' */}
            <span className="unit-count">
              {completedCount} / {totalCount} completed
            </span>
            <div className="unit-mini-progress-track">
              <i style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {isFullyCompleted && (
            <span className="unit-completed-badge">
              <CheckCircle2 size={16} /> Unit Mastered
            </span>
          )}
        </div>
      </div>

      {/* Visual Lesson Progression Map for this Unit */}
      <CoursePath
        lessons={lessons}
        userCompleted={userCompleted}
        activeLessonId={activeLessonId}
        onSelectLesson={onSelectLesson}
        unitCompleted={isFullyCompleted}
      />
    </div>
  );
}
