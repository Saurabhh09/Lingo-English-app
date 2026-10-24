import React from 'react';
import { getAllActiveLessons } from '../../curriculumData.js';
import { Leaf, Flame, Zap, GraduationCap, BookOpen, Compass, CheckCircle2 } from 'lucide-react';
import { UnitLandscapeBanner } from '../../Art.jsx';

export function LearningHeader({ progress, activeLevel, activeLevelStats, onOpenProgressModal }) {
  const streak = progress?.streak || 0;
  const xp = progress?.xp || 0;
  const words = progress?.words || 0;
  const completedLessons = progress?.completed?.length || 0;
  const totalActiveLessons = getAllActiveLessons().length;

  const levelPercentage = activeLevelStats?.percentage || 0;
  const levelCompleted = activeLevelStats?.completedCount || 0;
  const levelTotal = activeLevelStats?.total || 0;
  const isLevelCompleted = levelPercentage === 100 && levelTotal > 0;

  return (
    <div className="learning-header-container">
      {/* Top Scenic Unit Landscape Banner */}
      <div className="unit-scenic-banner-card">
        <UnitLandscapeBanner unitNumber={activeLevel.code === 'PRE-A1' ? 1 : 2} className="unit-scenic-art" />
      </div>

      {/* Main Learning Summary Section */}
      <section className="learn-banner lime" aria-label="Learning progress summary">
        {/* Left Column: Story, Title, Supporting Message & Reward Badges */}
        <div className="learn-banner-content">
          <div className="learn-banner-pill-row">
            <span className="pill-badge path-pill">
              <Leaf size={13} className="pill-icon" /> YOUR STRUCTURED PATH
            </span>
            <span className="pill-badge level-pill">
              <Compass size={13} className="pill-icon" />
              <span>Currently Viewing: <strong>{activeLevel.code} · {activeLevel.name}</strong></span>
            </span>
          </div>

          <h2 className="learn-banner-heading">
            Grow your English.<br />One little level at a time.
          </h2>

          <p className="learn-banner-desc">
            No pressure. Just structured progress, practice, and a few happy surprises along the way.
          </p>

          <div className="learn-banner-chips" role="group" aria-label="Learning statistics">
            <div className="learn-stat-chip xp-chip" title="Total XP earned">
              <span className="chip-icon-circle xp-circle">
                <Zap size={14} />
              </span>
              <span className="chip-label"><b>{xp.toLocaleString()}</b> Total XP</span>
            </div>

            <div className="learn-stat-chip words-chip" title="Words learned">
              <span className="chip-icon-circle words-circle">
                <BookOpen size={14} />
              </span>
              <span className="chip-label"><b>{words}</b> Words Learned</span>
            </div>

            <button
              type="button"
              className="learn-stat-chip streak-chip"
              onClick={onOpenProgressModal}
              aria-label="View learning streak details"
              title="Click to view learning streak details"
            >
              <span className="chip-icon-circle streak-circle">
                <Flame size={14} />
              </span>
              <span className="chip-label"><b>{streak}</b> Day Streak</span>
            </button>
          </div>
        </div>

        {/* Right Column: Unified, Polished Progress Card Module */}
        <div className="learn-banner-progress">
          <div className="progress-card-inner">
            {/* Header: Level label and prominent percentage side-by-side */}
            <div className="progress-card-header">
              <div className="progress-card-title-group">
                <span className="progress-level-badge">{activeLevel.code}</span>
                <span className="progress-level-title">LEVEL PROGRESS</span>
              </div>
              <div className="progress-percentage-callout">
                <span className="percentage-number">{levelPercentage}%</span>
              </div>
            </div>

            {/* Progress Bar Track positioned directly beneath */}
            <div
              className="progress-meter-container"
              role="progressbar"
              aria-valuenow={levelPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${activeLevel.code} level completion`}
            >
              <div className="progress-meter-track">
                <div
                  className="progress-meter-fill"
                  style={{ width: `${Math.min(100, Math.max(0, levelPercentage))}%` }}
                />
              </div>
            </div>

            {/* Bottom details & milestone meta */}
            <div className="progress-card-footer">
              <div className="progress-meta-row">
                <span className="progress-meta-primary">
                  {isLevelCompleted ? (
                    <span className="level-complete-status">
                      <CheckCircle2 size={14} className="status-icon" /> Level Mastered!
                    </span>
                  ) : (
                    <>
                      <strong>{levelCompleted}</strong> of <strong>{levelTotal}</strong> lessons in {activeLevel.code}
                    </>
                  )}
                </span>
                <span className="progress-meta-course">
                  <GraduationCap size={14} className="course-cap-icon" />
                  <span>{completedLessons} of {totalActiveLessons} total</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
