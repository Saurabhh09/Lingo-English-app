import React, { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Check, Sparkles, Layers, Trophy, Star } from 'lucide-react';
import { CEFR_LEVELS, calculateLevelProgress } from '../../curriculumData.js';

export const LEVEL_THEMES = {
  'pre-a1': { icon: '🌱', label: 'Starter', biome: 'green', title: 'English Starter' },
  'a1': { icon: '🐣', label: 'Beginner', biome: 'green', title: 'Beginner English' },
  'a2': { icon: '🦊', label: 'Elementary', biome: 'desert', title: 'Elementary English' },
  'b1': { icon: '🐻', label: 'Intermediate', biome: 'ocean', title: 'Intermediate English' },
  'b2': { icon: '🦁', label: 'Upper-Int', biome: 'autumn', title: 'Upper-Intermediate' },
  'c1': { icon: '🚀', label: 'Advanced', biome: 'mountain', title: 'Advanced English' },
  'c2': { icon: '👑', label: 'Mastery', biome: 'mountain', title: 'Mastery English' },
};

export function CourseHeader({
  activeLevel,
  activeLevelStats,
  onSelectLevel,
  onOpenProgressModal
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentIndex = CEFR_LEVELS.findIndex(l => l.id === activeLevel.id);
  const prevLevel = currentIndex > 0 ? CEFR_LEVELS[currentIndex - 1] : null;
  const nextLevel = currentIndex < CEFR_LEVELS.length - 1 ? CEFR_LEVELS[currentIndex + 1] : null;

  return (
    <header className="course-header-sticky">
      <div className="course-header-container">
        {/* Quick Prev Level Button */}
        <button
          className={`course-nav-arrow ${!prevLevel ? 'disabled' : ''}`}
          onClick={() => prevLevel && onSelectLevel(prevLevel.id)}
          disabled={!prevLevel}
          aria-label="Previous Course Level"
          title={prevLevel ? `Switch to ${prevLevel.code}` : undefined}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Center Course Switcher Pill (Matching Reference: COURSE B2 ⌵) */}
        <button
          className={`course-title-pill ${dropdownOpen ? 'is-open' : ''}`}
          onClick={() => setDropdownOpen(o => !o)}
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
          aria-label="Choose CEFR Course Level"
        >
          <span className="course-pill-mascot">
            {LEVEL_THEMES[activeLevel.id]?.icon || '🌱'}
          </span>
          <span className="course-pill-title">
            COURSE {activeLevel.code.toUpperCase()}
          </span>
          <ChevronDown size={18} className={`course-pill-chevron ${dropdownOpen ? 'rotate' : ''}`} />
        </button>

        {/* Quick Next Level Button */}
        <button
          className={`course-nav-arrow ${!nextLevel ? 'disabled' : ''}`}
          onClick={() => nextLevel && onSelectLevel(nextLevel.id)}
          disabled={!nextLevel}
          aria-label="Next Course Level"
          title={nextLevel ? `Switch to ${nextLevel.code}` : undefined}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Course Stats Bar (Subtle Floating Indicator) */}
      <div className="course-sub-stats-bar">
        <span className="course-stats-chip">
          <Star size={14} className="star-icon" fill="currentColor" />
          <span>{activeLevelStats.completedCount} / {activeLevelStats.total} Lessons</span>
        </span>
        <div className="course-header-progress-track">
          <div
            className="course-header-progress-fill"
            style={{ width: `${activeLevelStats.percentage}%` }}
          />
        </div>
        <span className="course-stats-pct">{activeLevelStats.percentage}%</span>
      </div>

      {/* CEFR Level Selector Dropdown Sheet */}
      {dropdownOpen && (
        <>
          <div
            className="course-dropdown-backdrop"
            onClick={() => setDropdownOpen(false)}
            aria-hidden="true"
          />
          <div className="course-level-drawer" role="menu" aria-label="CEFR Course Selector">
            <div className="drawer-header">
              <div className="drawer-title-group">
                <Layers size={18} className="drawer-icon" />
                <h3>Choose Your Level</h3>
              </div>
              <button
                className="drawer-close-btn"
                onClick={() => setDropdownOpen(false)}
                aria-label="Close level selector"
              >
                ✕
              </button>
            </div>
            <div className="drawer-levels-list">
              {CEFR_LEVELS.map(level => {
                const isActive = level.id === activeLevel.id;
                const theme = LEVEL_THEMES[level.id] || { icon: '✨', label: level.code };
                return (
                  <button
                    key={level.id}
                    role="menuitem"
                    className={`drawer-level-card ${isActive ? 'active' : ''} ${level.isDemoOnly ? 'is-demo' : ''}`}
                    onClick={() => {
                      onSelectLevel(level.id);
                      setDropdownOpen(false);
                    }}
                  >
                    <div className="drawer-level-emoji">{theme.icon}</div>
                    <div className="drawer-level-text">
                      <div className="drawer-level-row">
                        <strong className="drawer-level-code">{level.code}</strong>
                        <span className="drawer-level-tag">{level.name}</span>
                        {isActive && <span className="drawer-active-badge">CURRENT</span>}
                      </div>
                      <p className="drawer-level-tagline">{level.tagline}</p>
                    </div>
                    {isActive ? (
                      <span className="drawer-check-icon">
                        <Check size={18} />
                      </span>
                    ) : (
                      <span className="drawer-sections-count">
                        {level.sections.length} sections
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
