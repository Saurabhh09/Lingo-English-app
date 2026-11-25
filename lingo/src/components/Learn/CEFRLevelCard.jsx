import React from 'react';
import { ChevronDown, ChevronUp, Check, Lock, GraduationCap, Compass, Globe, Trophy, Rocket, Crown } from 'lucide-react';
import { getLevelLessons } from '../../curriculumData.js';

// Level Theme Config (Icons, colors, badges matching screenshot)
export const LEVEL_THEME_MAP = {
  'pre-a1': {
    badgeClass: 'badge-lime',
    iconBgClass: 'icon-bg-lime',
    renderIcon: () => <span className="level-emoji-icon">🌱</span>,
  },
  'a1': {
    badgeClass: 'badge-blue',
    iconBgClass: 'icon-bg-blue',
    renderIcon: () => <GraduationCap size={22} className="level-svg-icon cap" />,
  },
  'a2': {
    badgeClass: 'badge-amber',
    iconBgClass: 'icon-bg-amber',
    renderIcon: () => <Compass size={22} className="level-svg-icon compass" />,
  },
  'b1': {
    badgeClass: 'badge-teal',
    iconBgClass: 'icon-bg-teal',
    renderIcon: () => <Globe size={22} className="level-svg-icon globe" />,
  },
  'b2': {
    badgeClass: 'badge-purple',
    iconBgClass: 'icon-bg-purple',
    renderIcon: () => <Trophy size={22} className="level-svg-icon trophy" />,
  },
  'c1': {
    badgeClass: 'badge-rose',
    iconBgClass: 'icon-bg-rose',
    renderIcon: () => <Rocket size={22} className="level-svg-icon rocket" />,
  },
  'c2': {
    badgeClass: 'badge-gold',
    iconBgClass: 'icon-bg-gold',
    renderIcon: () => <Crown size={22} className="level-svg-icon crown" />,
  },
};

export function CEFRLevelCard({
  level,
  isExpanded,
  onToggleExpand,
  userCompleted = [],
  isCurrentLevel = false
}) {
  const theme = LEVEL_THEME_MAP[level.id] || LEVEL_THEME_MAP['pre-a1'];
  const allLessons = getLevelLessons(level);
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter(l => userCompleted.includes(l.realLessonId || l.id)).length;
  const totalUnits = (level.sections || []).reduce((acc, s) => acc + (s.units?.length || 0), 0);
  const isCompleted = completedLessons >= totalLessons && totalLessons > 0;

  return (
    <div className={`cefr-level-card ${isExpanded ? 'is-expanded' : ''} ${isCompleted ? 'is-level-completed' : ''} ${isCurrentLevel ? 'is-active-level' : ''}`}>
      <button
        type="button"
        className="cefr-level-card-header"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        aria-label={`${level.code} ${level.name}, ${totalUnits} units, ${totalLessons} lessons. ${isExpanded ? 'Collapse' : 'Expand'}`}
      >
        {/* Left circular icon container (Sprout for Pre-A1, Cap for A1, etc.) */}
        <div className={`level-card-icon-bubble ${theme.iconBgClass}`}>
          {theme.renderIcon()}
        </div>

        {/* Center Level Info */}
        <div className="level-card-info">
          <div className="level-badge-row">
            <span className={`level-pill-badge ${theme.badgeClass}`}>
              {level.code}
            </span>
            {isCompleted && (
              <span className="level-completed-check">
                <Check size={12} /> Mastered
              </span>
            )}
          </div>
          <h3 className="level-card-title">{level.name.replace(/^English\s+/, '')}</h3>
          <span className="level-card-meta">
            {totalUnits} {totalUnits === 1 ? 'unit' : 'units'} · {totalLessons} lessons
          </span>
        </div>

        {/* Right Chevron Indicator */}
        <div className="level-card-chevron">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Subtle bottom progress bar */}
      {totalLessons > 0 && (
        <div className="level-card-progress-bar">
          <div
            className="level-card-progress-fill"
            style={{ width: `${Math.round((completedLessons / totalLessons) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
