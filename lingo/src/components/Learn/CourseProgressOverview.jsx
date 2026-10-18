import React from 'react';
import { Target, ArrowRight, Sparkles, CheckCircle2, Lock, Play, ShieldAlert } from 'lucide-react';

export function CourseProgressOverview({ activeLevel, activeLevelStats, nextRecommendedLesson, onStartLesson }) {
  const isDemo = activeLevel.isDemoOnly;

  return (
    <div className="course-progress-overview-panel">
      <div className="overview-header-row">
        <div className="overview-title-block">
          <div className="overview-badges">
            <span className={`pill ${activeLevel.accent}`}>
              {activeLevel.code}
            </span>
            <span className="pill outline">
              {activeLevel.badge}
            </span>
            {isDemo ? (
              <span className="pill demo-pill">
                Phase 1 Preview Structure
              </span>
            ) : (
              <span className="pill white">
                Interactive Practice Ready
              </span>
            )}
          </div>
          <h3>{activeLevel.name}</h3>
          <p className="overview-objective">{activeLevel.objective}</p>
        </div>

        {/* Quick Launch Card for Next Recommended Lesson */}
        {nextRecommendedLesson && !isDemo && (
          <div className="next-lesson-card">
            <div className="next-lesson-tag">
              <Sparkles size={13} />
              <span>RECOMMENDED NEXT STEP</span>
            </div>
            <h4>{nextRecommendedLesson.title}</h4>
            <p>{nextRecommendedLesson.subtitle}</p>
            <button
              className="button dark next-lesson-btn"
              onClick={() => onStartLesson(nextRecommendedLesson)}
            >
              <Play size={15} fill="currentColor" />
              <span>Continue learning</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>

      {isDemo && (
        <div className="demo-overview-notice">
          <Sparkles size={16} />
          <div>
            <strong>Curriculum Architecture Preview</strong>
            <p>
              This proficiency level demonstrates the multi-section and unit progression path.
              Real interactive quizzes for Pre-A1 and A1 are currently active.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
