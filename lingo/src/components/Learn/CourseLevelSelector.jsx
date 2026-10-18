import React from 'react';
import { CEFR_LEVELS, calculateLevelProgress } from '../../curriculumData.js';
import { Check, Lock, Sparkles, Layers } from 'lucide-react';

export function CourseLevelSelector({ activeLevelId, onSelectLevel, userCompleted = [] }) {
  return (
    <div className="course-level-selector" role="tablist" aria-label="CEFR Proficiency Levels">
      <div className="selector-label-bar">
        <span className="eyebrow">
          <Layers size={13} /> CEFR PROFICIENCY LEVELS
        </span>
        <span className="selector-hint">Select a level to view its sections & units</span>
      </div>

      <div className="level-tabs-scroll">
        {CEFR_LEVELS.map(level => {
          const stats = calculateLevelProgress(level, userCompleted);
          const isActive = level.id === activeLevelId;
          const isCompleted = stats.percentage === 100 && stats.total > 0;

          return (
            <button
              key={level.id}
              role="tab"
              id={`tab-${level.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${level.id}`}
              className={`level-tab ${isActive ? 'active' : ''} ${isCompleted ? 'is-completed' : ''} ${level.isDemoOnly ? 'is-demo' : ''}`}
              onClick={() => onSelectLevel(level.id)}
            >
              <div className="level-tab-top">
                <span className={`level-tab-badge ${level.accent}`}>
                  {level.code}
                </span>
                {isCompleted ? (
                  <span className="level-tab-check" aria-label="Completed">
                    <Check size={14} />
                  </span>
                ) : level.isDemoOnly ? (
                  <span className="level-tab-pill outline">Preview</span>
                ) : stats.completedCount > 0 ? (
                  <span className="level-tab-pill lime-pill">{stats.percentage}%</span>
                ) : (
                  <span className="level-tab-pill outline">Available</span>
                )}
              </div>

              <div className="level-tab-info">
                <strong className="level-tab-name">{level.name}</strong>
                <span className="level-tab-sub">
                  {level.isDemoOnly ? (
                    'Demo structure'
                  ) : stats.completedCount > 0 ? (
                    `${stats.completedCount} / ${stats.total} lessons`
                  ) : (
                    `${level.sections.length} sections · ${level.estimatedHours}`
                  )}
                </span>
              </div>

              {isActive && <span className="level-tab-active-bar" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
