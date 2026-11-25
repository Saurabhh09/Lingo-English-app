import React from 'react';
import { Flame, Zap } from 'lucide-react';
import { Mascot } from '../../Art.jsx';

export function LearnHeader({ progress = {}, onOpenProgressModal }) {
  const streak = progress.streak || 0;
  const xp = progress.xp || 0;

  return (
    <header className="learn-screen-header">
      <div className="learn-header-brand">
        <Mascot pose="walk" size={32} className="header-sprout-mascot" />
        <span className="learn-brand-text">Lingo</span>
      </div>

      <div className="learn-header-right">
        {/* Combined Streak & Energy Pill (Matching Reference: 🔥 0 | ⚡ 0) */}
        <button
          type="button"
          className="learn-header-stat-pill"
          onClick={onOpenProgressModal}
          aria-label="View streak and XP"
        >
          <div className="stat-pill-item">
            <Flame size={18} className="flame-icon" fill="#ff9600" color="#ff9600" />
            <b>{streak}</b>
          </div>
          <span className="stat-pill-separator">|</span>
          <div className="stat-pill-item">
            <Zap size={16} className="zap-icon" fill="#58cc02" color="#58cc02" />
            <b>{xp}</b>
          </div>
        </button>

        {/* Circular Avatar / Profile Button */}
        <button
          type="button"
          className="learn-header-avatar-btn"
          onClick={onOpenProgressModal}
          aria-label="Account Profile"
        >
          <span className="header-avatar-emoji">🌱</span>
        </button>
      </div>
    </header>
  );
}
