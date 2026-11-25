import React from 'react';
import { ArrowRight, Wand2 } from 'lucide-react';
import { Mascot } from '../../Art.jsx';

export function ContinueLearningBanner({ activeLesson, onStartNextLesson }) {
  return (
    <section
      className="continue-journey-banner"
      onClick={onStartNextLesson}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onStartNextLesson) onStartNextLesson();
        }
      }}
      aria-label="Continue learning your next lesson"
    >
      <div className="banner-content">
        <div className="banner-eyebrow">
          <span>Keep going!</span>
          <span className="banner-wand-icon">🪄</span>
        </div>
        <h2 className="banner-heading">Continue your English journey</h2>
        <p className="banner-subtext">Complete lessons and unlock new levels</p>
      </div>

      <div className="banner-mascot-container">
        <Mascot pose="study" size={110} className="banner-mascot-svg" />
      </div>
    </section>
  );
}
