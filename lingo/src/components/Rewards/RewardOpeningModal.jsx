import React, { useEffect, useState } from 'react';
import { Sparkles, Zap, Gem, Award, ScrollText, ArrowRight, CheckCircle2 } from 'lucide-react';
import { BadgeArtwork } from '../Achievements/BadgeArtwork.jsx';
import { BADGE_CATALOG } from '../../../server/badgeCatalog.mjs';

const CONFETTI_PIECES = [
  { left: '10%', delay: '0s', color: '#58cc02' },
  { left: '20%', delay: '0.12s', color: '#fbbf24' },
  { left: '32%', delay: '0.05s', color: '#38bdf8' },
  { left: '44%', delay: '0.18s', color: '#f59e0b' },
  { left: '56%', delay: '0.08s', color: '#84cc16' },
  { left: '68%', delay: '0.15s', color: '#fbbf24' },
  { left: '80%', delay: '0.04s', color: '#38bdf8' },
  { left: '90%', delay: '0.2s', color: '#58cc02' }
];

export function RewardOpeningModal({
  entry,
  queueCount = 1,
  onContinue
}) {
  const [stage, setStage] = useState('opening');

  const reward = entry?.reward;
  const xpAdded = entry?.xpAdded ?? reward?.xpAmount ?? 0;
  const gemsAdded = entry?.gemsAdded ?? reward?.gemsAmount ?? 0;
  const badgeObj =
    entry?.badge ||
    (reward?.badgeId ? BADGE_CATALOG.find(b => b.id === reward.badgeId) : null);

  useEffect(() => {
    setStage('opening');
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setStage('revealed');
      return undefined;
    }
    const t = setTimeout(() => setStage('revealed'), 450);
    return () => clearTimeout(t);
  }, [reward?.id]);

  if (!reward) return null;

  const triggerLabel =
    reward.triggerType === 'cefr_level'
      ? 'CEFR LEVEL MILESTONE'
      : reward.triggerType === 'section'
        ? 'SECTION COMPLETION REWARD'
        : 'UNIT MILESTONE CHEST';

  return (
    <div
      className="reward-open-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reward-modal-title"
    >
      <div className={`reward-opening-modal stage-${stage}`}>
        <div className="reward-modal-sunbeams" aria-hidden="true" />
        <div className="reward-confetti-layer" aria-hidden="true">
          {CONFETTI_PIECES.map((p, idx) => (
            <span
              key={idx}
              className="reward-confetti-dot"
              style={{ left: p.left, animationDelay: p.delay, backgroundColor: p.color }}
            />
          ))}
        </div>

        <span className="reward-modal-eyebrow">
          <Sparkles size={13} /> {triggerLabel}
        </span>

        {/* 3D Animated Treasure Chest */}
        <div className={`reward-modal-chest-stage stage-${stage}`} aria-hidden="true">
          <div className="reward-modal-glow-orb" />
          <svg viewBox="0 0 128 110" className="reward-modal-chest-svg">
            <ellipse cx="64" cy="96" rx="42" ry="9" fill="rgba(120, 53, 15, 0.22)" />
            {/* Open Interior Treasure */}
            <path d="M28 54 Q64 38 100 54 L94 66 L34 66 Z" fill="#451a03" />
            <circle cx="48" cy="54" r="7" fill="#fde047" stroke="#b45309" strokeWidth="1.6" />
            <circle cx="64" cy="50" r="8" fill="#fef08a" stroke="#b45309" strokeWidth="1.6" />
            <circle cx="80" cy="54" r="7" fill="#facc15" stroke="#b45309" strokeWidth="1.6" />
            <polygon points="64,32 75,44 64,56 53,44" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.8" />
            {/* Base */}
            <rect x="22" y="54" width="84" height="38" rx="9" fill="#c9782b" stroke="#78350f" strokeWidth="2.8" />
            <rect x="34" y="54" width="9" height="38" fill="#fbbf24" stroke="#92400e" strokeWidth="1.6" />
            <rect x="85" y="54" width="9" height="38" fill="#fbbf24" stroke="#92400e" strokeWidth="1.6" />
            <rect x="19" y="50" width="90" height="9" rx="4.5" fill="#fbbf24" stroke="#92400e" strokeWidth="2.2" />
            {/* Animated Opening Lid */}
            <g className="reward-modal-lid">
              <path d="M22 52 C22 28 36 18 64 18 C92 18 106 28 106 52 Z" fill="#e08b36" stroke="#78350f" strokeWidth="2.8" />
              <rect x="34" y="21" width="9" height="31" rx="2" fill="#fbbf24" stroke="#92400e" strokeWidth="1.6" />
              <rect x="85" y="21" width="9" height="31" rx="2" fill="#fbbf24" stroke="#92400e" strokeWidth="1.6" />
              <rect x="56" y="42" width="16" height="17" rx="4" fill="#fbbf24" stroke="#92400e" strokeWidth="2.2" />
              <circle cx="64" cy="50" r="3" fill="#78350f" />
            </g>
          </svg>
        </div>

        <h2 id="reward-modal-title" className="reward-modal-title">
          {reward.name}
        </h2>
        <p className="reward-modal-subtitle">{reward.description}</p>

        {/* Staggered Loot Cards */}
        <div className="reward-loot-grid">
          {xpAdded > 0 && (
            <div className="reward-loot-card loot-xp" style={{ animationDelay: '0.12s' }}>
              <div className="loot-icon-wrap xp">
                <Zap size={22} fill="currentColor" />
              </div>
              <strong>+{xpAdded} XP</strong>
              <span>Experience</span>
            </div>
          )}

          {gemsAdded > 0 && (
            <div className="reward-loot-card loot-gems" style={{ animationDelay: '0.24s' }}>
              <div className="loot-icon-wrap gems">
                <Gem size={22} />
              </div>
              <strong>+{gemsAdded} Gems</strong>
              <span>Wallet Balance</span>
            </div>
          )}

          {badgeObj && (
            <div className="reward-loot-card loot-badge" style={{ animationDelay: '0.36s' }}>
              <BadgeArtwork
                icon={badgeObj.icon}
                color={badgeObj.color}
                rarity={badgeObj.rarity}
                ribbonText={badgeObj.ribbonText}
                size={54}
              />
              <strong>{badgeObj.name}</strong>
              <span>Badge Unlocked</span>
            </div>
          )}

          {reward.certificateTitle && (
            <div className="reward-loot-card loot-cert" style={{ animationDelay: '0.44s' }}>
              <div className="loot-icon-wrap cert">
                <ScrollText size={22} />
              </div>
              <strong>{reward.certificateTitle}</strong>
              <span>Verified Milestone Certificate</span>
            </div>
          )}
        </div>

        <div className="reward-modal-saved-note">
          <CheckCircle2 size={14} />
          <span>Saved to your profile &amp; wallet</span>
        </div>

        <button
          type="button"
          className="reward-continue-btn"
          onClick={onContinue}
        >
          <span>{queueCount > 1 ? `Continue (${queueCount - 1} more reward)` : 'Continue Learning'}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
