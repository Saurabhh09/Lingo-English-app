import React from 'react';
import { Sparkles, ArrowRight, Award } from 'lucide-react';
import { BadgeArtwork } from './BadgeArtwork.jsx';

const RARITY_LABELS = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary'
};

export function BadgeUnlockModal({ badge, queueCount = 1, onViewBadge, onContinue }) {
  if (!badge) return null;

  return (
    <div className="badge-unlock-overlay" role="dialog" aria-modal="true" aria-labelledby="badge-unlock-title">
      <div className="badge-confetti-layer" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className={`confetti-piece p-${i + 1}`} />
        ))}
      </div>

      <div className={`badge-unlock-card rarity-${badge.rarity || 'common'}`}>
        <div className="badge-unlock-top-row">
          <span className="badge-unlock-eyebrow">
            <Sparkles size={13} />
            <span>NEW ACHIEVEMENT UNLOCKED!</span>
          </span>
          {queueCount > 1 && (
            <span className="badge-queue-chip">1 of {queueCount}</span>
          )}
        </div>

        <div className="badge-unlock-hero">
          <div className="badge-glow-ring" aria-hidden="true" />
          <BadgeArtwork
            icon={badge.icon}
            color={badge.color}
            rarity={badge.rarity}
            ribbonText={badge.ribbonText}
            size={128}
          />
        </div>

        <span className={`badge-rarity-pill rarity-${badge.rarity || 'common'}`}>
          {RARITY_LABELS[badge.rarity] || 'Common'}
        </span>

        <h2 id="badge-unlock-title" className="badge-unlock-name">{badge.name}</h2>
        <p className="badge-unlock-desc">{badge.description}</p>

        <div className="badge-unlock-actions">
          <button type="button" className="button primary full-width" onClick={onContinue}>
            <span>{queueCount > 1 ? 'Next Achievement' : 'Continue Learning'}</span>
            <ArrowRight size={17} />
          </button>
          <button type="button" className="button light full-width" onClick={() => onViewBadge && onViewBadge(badge)}>
            <Award size={16} />
            <span>View Badge</span>
          </button>
        </div>
      </div>
    </div>
  );
}
