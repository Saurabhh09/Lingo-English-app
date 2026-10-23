import React from 'react';
import { getAllActiveLessons } from '../../curriculumData.js';
import { Leaf, Flame, Zap, GraduationCap, BookOpen, ChevronRight, Compass } from 'lucide-react';

export function LearningHeader({ progress, activeLevel, activeLevelStats, onOpenProgressModal }) {
  const streak = progress?.streak || 0;
  const xp = progress?.xp || 0;
  const words = progress?.words || 0;
  const completedLessons = progress?.completed?.length || 0;
  const totalActiveLessons = getAllActiveLessons().length;

  return (
    <div className="learning-header-container">
      {/* Top Banner with Brand Lime Palette & Aesthetic */}
      <section className="learn-banner lime">
        <div className="learn-banner-content">
          <div className="learn-banner-pill-row">
            <span className="pill translucent">
              <Leaf size={14} /> YOUR STRUCTURED PATH
            </span>
            <span className="pill white active-cefr-pill">
              <Compass size={14} /> Currently Viewing: <b>{activeLevel.code} · {activeLevel.name}</b>
            </span>
          </div>

          <h2>
            Grow your English.<br />One little level at a time.
          </h2>

          <p>
            No pressure. Just structured progress, practice, and a few happy surprises along the way.
          </p>

          <div className="learn-banner-chips">
            <div className="learn-stat-chip">
              <Zap size={14} />
              <span><b>{xp.toLocaleString()}</b> Total XP</span>
            </div>
            <div className="learn-stat-chip">
              <BookOpen size={14} />
              <span><b>{words}</b> Words Learned</span>
            </div>
            <button className="learn-stat-chip streak-chip" onClick={onOpenProgressModal} aria-label="View learning streak details">
              <Flame size={14} />
              <span><b>{streak}</b> Day Streak</span>
            </button>
          </div>
        </div>

        {/* Right Stamp with Level Progress */}
        <div className="learn-banner-progress">
          <div className="learn-progress-header-row">
            <span className="learn-stamp" aria-hidden="true">
              <GraduationCap size={28} />
            </span>
            <div className="learn-progress-stats">
              <strong>
                {completedLessons}
                <small>/ {totalActiveLessons}</small>
              </strong>
              <span className="lessons-completed-label">lessons completed</span>
            </div>
          </div>

          <div className="active-level-progress-meter">
            <div className="meter-label">
              <span>{activeLevel.code} completion</span>
              <b>{activeLevelStats?.percentage || 0}%</b>
            </div>
            <div className="progress-track">
              <i style={{ width: `${activeLevelStats?.percentage || 0}%` }} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
