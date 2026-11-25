import React, { useState, useMemo } from 'react';
import { Award, Lock, CheckCircle2, Sparkles, X, Calendar, Target } from 'lucide-react';
import { BadgeArtwork } from './BadgeArtwork.jsx';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unit', label: 'Units' },
  { id: 'section', label: 'Sections' },
  { id: 'cefr', label: 'CEFR Levels' },
  { id: 'streak', label: 'Streaks' },
  { id: 'learning', label: 'Learning' }
];

const RARITY_LABELS = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary'
};

export function AchievementsSection({
  catalog = [],
  earnedBadges = {},
  achievementProgress = {},
  initialSelectedBadge = null,
  onClearInitialBadge
}) {
  const [filter, setFilter] = useState('all');
  const [selectedBadge, setSelectedBadge] = useState(initialSelectedBadge);

  const summary = useMemo(() => {
    const totalCount = catalog.length;
    const earnedList = catalog
      .filter(b => Boolean(earnedBadges[b.id]))
      .map(b => ({ ...b, ...earnedBadges[b.id] }))
      .sort((a, b) => String(b.earnedAt || '').localeCompare(String(a.earnedAt || '')));
    const earnedCount = earnedList.length;
    const percentage = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;
    return { totalCount, earnedCount, percentage, recent: earnedList.slice(0, 4) };
  }, [catalog, earnedBadges]);

  const filteredBadges = useMemo(() => {
    if (filter === 'all') return catalog;
    return catalog.filter(b => b.category === filter);
  }, [catalog, filter]);

  const activeBadge = selectedBadge || initialSelectedBadge;

  const formatDate = iso => {
    if (!iso) return 'Earned recently';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return iso.slice(0, 10);
    }
  };

  return (
    <div className="achievements-collection-wrap">
      {/* Header */}
      <div className="achievements-header-card">
        <div className="achievements-header-top">
          <div className="achievements-title-block">
            <span className="achievements-eyebrow">
              <Award size={13} /> COLLECTIBLE BADGES
            </span>
            <h3>My Achievements</h3>
            <p>Collect badges as you progress through English.</p>
          </div>
          <div className="achievements-pct-ring">
            <strong>{summary.percentage}%</strong>
            <span>complete</span>
          </div>
        </div>

        <div className="achievements-stats-row">
          <div className="ach-stat-chip earned">
            <strong>{summary.earnedCount}</strong>
            <span>Earned</span>
          </div>
          <div className="ach-stat-chip total">
            <strong>{summary.totalCount}</strong>
            <span>Available</span>
          </div>
          <div className="ach-stat-chip pct">
            <strong>{summary.totalCount - summary.earnedCount}</strong>
            <span>Remaining</span>
          </div>
        </div>

        <div className="ach-overall-track">
          <div className="ach-overall-fill" style={{ width: `${summary.percentage}%` }} />
        </div>
      </div>

      {/* Recent Achievements */}
      {summary.recent.length > 0 && (
        <div className="achievements-recent-block">
          <span className="profile-box-label">RECENT ACHIEVEMENTS</span>
          <div className="achievements-recent-strip">
            {summary.recent.map(b => (
              <button
                key={b.id}
                type="button"
                className="recent-badge-pill"
                onClick={() => setSelectedBadge(b)}
              >
                <BadgeArtwork
                  icon={b.icon}
                  color={b.color}
                  rarity={b.rarity}
                  ribbonText={b.ribbonText}
                  size={44}
                />
                <div className="recent-badge-meta">
                  <b>{b.name}</b>
                  <small>{formatDate(b.earnedAt)}</small>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="achievements-filter-bar" role="tablist" aria-label="Badge categories">
        {CATEGORY_FILTERS.map(cat => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={filter === cat.id}
            className={`ach-filter-pill ${filter === cat.id ? 'active' : ''}`}
            onClick={() => setFilter(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Responsive Badge Grid */}
      <div className="achievements-badge-grid">
        {filteredBadges.map(badge => {
          const earnedRecord = earnedBadges[badge.id];
          const isUnlocked = Boolean(earnedRecord);
          const prog = achievementProgress[badge.id] || {
            currentProgress: 0,
            targetProgress: badge.unlockCondition?.target || 1
          };
          const current = isUnlocked ? prog.targetProgress : (prog.currentProgress || 0);
          const target = Math.max(1, prog.targetProgress || 1);

          return (
            <button
              key={badge.id}
              type="button"
              className={`badge-grid-card ${isUnlocked ? 'unlocked' : 'locked'} rarity-${badge.rarity}`}
              onClick={() => setSelectedBadge(badge)}
            >
              <div className="badge-card-top-meta">
                <span className={`badge-rarity-mini rarity-${badge.rarity}`}>
                  {RARITY_LABELS[badge.rarity]}
                </span>
                {isUnlocked ? (
                  <CheckCircle2 size={14} className="badge-state-icon unlocked" />
                ) : (
                  <Lock size={13} className="badge-state-icon locked" />
                )}
              </div>

              <div className="badge-card-art">
                <BadgeArtwork
                  icon={badge.icon}
                  color={badge.color}
                  rarity={badge.rarity}
                  locked={!isUnlocked}
                  ribbonText={badge.ribbonText}
                  size={74}
                />
              </div>

              <b className="badge-card-name">{badge.name}</b>
              <p className="badge-card-desc">{badge.description}</p>

              <div className="badge-card-footer">
                <div className="badge-mini-bar">
                  <i style={{ width: `${Math.min(100, Math.round((current / target) * 100))}%` }} />
                </div>
                <span className="badge-card-prog">
                  {isUnlocked ? 'Unlocked' : `${current}/${target}`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Badge Detail Modal */}
      {activeBadge && (() => {
        const earnedRecord = earnedBadges[activeBadge.id];
        const isUnlocked = Boolean(earnedRecord);
        const prog = achievementProgress[activeBadge.id] || {
          currentProgress: 0,
          targetProgress: activeBadge.unlockCondition?.target || 1
        };
        const current = isUnlocked ? prog.targetProgress : (prog.currentProgress || 0);
        const target = Math.max(1, prog.targetProgress || 1);
        const unitLabel = activeBadge.unlockCondition?.unitLabel || 'steps';
        const pct = Math.min(100, Math.round((current / target) * 100));

        const closeDetail = () => {
          setSelectedBadge(null);
          if (onClearInitialBadge) onClearInitialBadge();
        };

        return (
          <div className="badge-detail-overlay" onMouseDown={e => { if (e.target === e.currentTarget) closeDetail(); }}>
            <div className="badge-detail-card" role="dialog" aria-modal="true" aria-labelledby="badge-detail-title">
              <button type="button" className="modal-close icon-button" onClick={closeDetail} aria-label="Close badge details">
                <X size={18} />
              </button>

              <div className="badge-detail-art">
                <BadgeArtwork
                  icon={activeBadge.icon}
                  color={activeBadge.color}
                  rarity={activeBadge.rarity}
                  locked={!isUnlocked}
                  ribbonText={activeBadge.ribbonText}
                  size={112}
                />
              </div>

              <span className={`badge-rarity-pill rarity-${activeBadge.rarity}`}>
                {RARITY_LABELS[activeBadge.rarity]}
              </span>

              <h3 id="badge-detail-title" className="badge-detail-name">{activeBadge.name}</h3>
              <p className="badge-detail-desc">{activeBadge.description}</p>

              <div className="badge-detail-info-box">
                <div className="detail-row-head">
                  <Target size={15} />
                  <span>Unlock Requirement</span>
                </div>
                <p>{activeBadge.requirementText || activeBadge.description}</p>
              </div>

              <div className="badge-detail-progress-box">
                <div className="detail-prog-labels">
                  <span>Your progress</span>
                  <strong>{current} / {target} {unitLabel}</strong>
                </div>
                <div className="detail-prog-track">
                  <i style={{ width: `${pct}%` }} />
                </div>
              </div>

              {isUnlocked ? (
                <div className="badge-detail-earned-pill">
                  <Calendar size={14} />
                  <span>Earned on {formatDate(earnedRecord.earnedAt)}</span>
                  {earnedRecord.relatedEntityId && (
                    <small> · {earnedRecord.relatedEntityId}</small>
                  )}
                </div>
              ) : (
                <div className="badge-detail-locked-note">
                  <Lock size={14} />
                  <span>Complete the requirement above to unlock this badge.</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
