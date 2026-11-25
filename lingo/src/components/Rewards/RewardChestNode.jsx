import React from 'react';
import { Lock, Sparkles, CheckCircle2 } from 'lucide-react';

/**
 * Custom tactile 3D-styled Treasure Chest SVG across locked / available / opening / claimed states.
 */
function TreasureChestSvg({ status, isSpecial }) {
  const isLocked = status === 'locked';
  const isOpen = status === 'opening' || status === 'claimed';
  const bodyWood = isLocked ? '#b8b2a6' : isSpecial ? '#b45309' : '#c9782b';
  const bodyShade = isLocked ? '#979185' : isSpecial ? '#78350f' : '#944e14';
  const lidTop = isLocked ? '#c8c3b8' : isSpecial ? '#d97706' : '#e08b36';
  const trimGold = isLocked ? '#94a3b8' : '#fbbf24';
  const trimStroke = isLocked ? '#64748b' : '#b45309';

  return (
    <svg viewBox="0 0 112 96" className="reward-chest-svg" aria-hidden="true">
      {/* Glow ring when available or opening */}
      {(status === 'available' || status === 'opening') && (
        <ellipse cx="56" cy="54" rx="46" ry="34" fill="rgba(250, 204, 21, 0.28)" />
      )}
      {/* Shadow */}
      <ellipse cx="56" cy="84" rx="34" ry="7" fill="rgba(15, 23, 42, 0.14)" />

      {/* Open Chest Interior Coins & Gems */}
      {isOpen && (
        <g className="chest-interior-treasure">
          <path d="M26 48 Q56 34 86 48 L82 58 L30 58 Z" fill="#451a03" />
          <circle cx="42" cy="49" r="6" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
          <circle cx="55" cy="46" r="7" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
          <circle cx="69" cy="49" r="6" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
          {/* Faceted Gem */}
          <polygon points="56,34 65,43 56,52 47,43" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.6" />
          <polygon points="56,34 61,43 56,52 51,43" fill="#bae6fd" opacity="0.55" />
        </g>
      )}

      {/* Chest Base */}
      <g className="chest-base-group">
        <rect x="20" y="48" width="72" height="34" rx="8" fill={bodyWood} stroke={trimStroke} strokeWidth="2.5" />
        <path d="M22 64 H90 V74 C90 78 87 80 83 80 H29 C25 80 22 78 22 74 Z" fill={bodyShade} opacity="0.45" />
        {/* Vertical Metal Straps */}
        <rect x="30" y="48" width="8" height="34" fill={trimGold} stroke={trimStroke} strokeWidth="1.5" />
        <rect x="74" y="48" width="8" height="34" fill={trimGold} stroke={trimStroke} strokeWidth="1.5" />
        {/* Front Rim */}
        <rect x="18" y="45" width="76" height="8" rx="4" fill={trimGold} stroke={trimStroke} strokeWidth="2" />
      </g>

      {/* Chest Lid */}
      <g className={`chest-lid-group ${isOpen ? 'is-lid-open' : ''}`}>
        <path
          d="M20 46 C20 26 32 18 56 18 C80 18 92 26 92 46 Z"
          fill={lidTop}
          stroke={trimStroke}
          strokeWidth="2.5"
        />
        <rect x="30" y="20" width="8" height="26" rx="2" fill={trimGold} stroke={trimStroke} strokeWidth="1.5" />
        <rect x="74" y="20" width="8" height="26" rx="2" fill={trimGold} stroke={trimStroke} strokeWidth="1.5" />
        {/* Center Clasp */}
        <rect x="49" y="38" width="14" height="16" rx="4" fill={trimGold} stroke={trimStroke} strokeWidth="2" />
        <circle cx="56" cy="45" r="2.5" fill={trimStroke} />
      </g>

      {/* Lock badge overlay */}
      {isLocked && (
        <g transform="translate(46, 52)">
          <rect x="0" y="6" width="20" height="15" rx="4" fill="#e2e8f0" stroke="#475569" strokeWidth="1.8" />
          <path d="M5 6 V3.5 C5 0.5 15 0.5 15 3.5 V6" fill="none" stroke="#475569" strokeWidth="2" />
          <circle cx="10" cy="13.5" r="2" fill="#475569" />
        </g>
      )}
    </svg>
  );
}

export function RewardChestNode({
  reward,
  status = 'locked',
  unitNumber,
  requirementText,
  onClaim,
  onLockedClick,
  busy = false
}) {
  if (!reward) return null;

  const isLocked = status === 'locked';
  const isAvailable = status === 'available';
  const isOpening = status === 'opening';
  const isClaimed = status === 'claimed';
  const isSpecial = (reward.gemsAmount || 0) > 0 || Boolean(reward.badgeId);

  const rewardParts = [];
  if (reward.xpAmount) rewardParts.push(`+${reward.xpAmount} XP`);
  if (reward.gemsAmount) rewardParts.push(`+${reward.gemsAmount} Gems`);
  if (reward.badgeId) rewardParts.push('+ Badge');

  const handleClick = () => {
    if (busy || isOpening) return;
    if (isAvailable && onClaim) {
      onClaim(reward.id);
    } else if (isLocked && onLockedClick) {
      onLockedClick(reward, requirementText);
    }
  };

  return (
    <div className={`unit-milestone-chest-wrapper reward-chest-status-${status}`}>
      <button
        type="button"
        className={`reward-chest-node ${status} ${isSpecial ? 'is-special-chest' : ''}`}
        onClick={handleClick}
        disabled={busy || isClaimed}
        aria-label={
          isAvailable
            ? `Claim ${reward.name}: ${rewardParts.join(', ')}`
            : isClaimed
              ? `${reward.name} already claimed`
              : `${reward.name} locked. ${requirementText || `Finish Unit ${unitNumber} to unlock`}`
        }
      >
        {isAvailable && <span className="reward-chest-sparkle" aria-hidden="true"><Sparkles size={14} /></span>}
        <TreasureChestSvg status={status} isSpecial={isSpecial} />
        {isLocked && (
          <span className="reward-chest-lock-chip" aria-hidden="true">
            <Lock size={11} />
          </span>
        )}
        {isClaimed && (
          <span className="reward-chest-claimed-chip" aria-hidden="true">
            <CheckCircle2 size={12} />
          </span>
        )}
      </button>

      <span className="milestone-chest-title">
        {reward.name || `Unit ${unitNumber} Chest`}
      </span>

      <span className={`reward-chest-sublabel ${status}`}>
        {isAvailable && `Tap to open · ${rewardParts.join(' · ')}`}
        {isOpening && 'Opening chest...'}
        {isClaimed && `Claimed · ${rewardParts.join(' · ')}`}
        {isLocked && (requirementText || `Complete Unit ${unitNumber} to unlock`)}
      </span>
    </div>
  );
}
