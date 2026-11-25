import React from 'react';
import { UnitNodeRow } from './UnitNodeRow.jsx';
import { getSectionLessons } from '../../curriculumData.js';
import { REWARD_BY_SECTION_ID } from '../../../server/rewardDefinitions.mjs';
import { CheckCircle2, Gift, Lock, Sparkles } from 'lucide-react';

export function SectionJourneyCard({
  section,
  sectionIndex,
  level,
  userCompleted = [],
  userCheckpoints = [],
  userRewards = {},
  claimingRewardId = null,
  onClaimReward,
  onLockedRewardClick,
  activeLessonId = null,
  expandedUnitId = null,
  onToggleUnitExpand,
  onSelectLesson,
}) {
  const sectionLessons = getSectionLessons(section);
  const totalLessons = sectionLessons.length;
  const completedLessons = sectionLessons.filter(l => userCompleted.includes(l.realLessonId || l.id)).length;
  const isSectionMastered = completedLessons >= totalLessons && totalLessons > 0;
  const units = section.units || [];
  const sectionReward = REWARD_BY_SECTION_ID.get(section.id) || null;
  const sectionRewardStatus = sectionReward
    ? (claimingRewardId === sectionReward.id ? 'opening' : (userRewards?.[sectionReward.id]?.status || 'locked'))
    : 'locked';

  const rewardLabel = sectionReward
    ? [
        sectionReward.xpAmount ? `+${sectionReward.xpAmount} XP` : null,
        sectionReward.gemsAmount ? `+${sectionReward.gemsAmount} Gems` : null,
        sectionReward.badgeId ? '+Badge' : null
      ].filter(Boolean).join(' · ')
    : '';

  return (
    <div className={`section-journey-container ${isSectionMastered ? 'is-section-mastered' : ''}`} id={`section-${section.id}`}>
      {/* Section Milestone Header Banner */}
      <div className="section-journey-header">
        <div className="section-header-left">
          <div className="section-tag-row">
            <span className="section-number-pill">
              SECTION {section.sectionNumber || (sectionIndex + 1).toString().padStart(2, '0')}
            </span>
            {isSectionMastered && (
              <span className="section-mastered-pill">
                <CheckCircle2 size={12} /> Mastered
              </span>
            )}
          </div>
          <h3 className="section-journey-title">{section.title}</h3>
          {(section.tagline || section.description) && (
            <p className="section-journey-tagline">{section.tagline || section.description}</p>
          )}
        </div>

        <div className="section-header-right">
          <span className="section-progress-counter">
            {completedLessons} / {totalLessons} lessons
          </span>
          {sectionReward && (
            <button
              type="button"
              className={`section-reward-pill ${sectionRewardStatus}`}
              disabled={claimingRewardId === sectionReward.id || sectionRewardStatus === 'claimed'}
              onClick={() => {
                if (sectionRewardStatus === 'available' && onClaimReward) {
                  onClaimReward(sectionReward.id);
                } else if (sectionRewardStatus === 'locked' && onLockedRewardClick) {
                  onLockedRewardClick(sectionReward, `Finish all lessons in ${section.title} to unlock`);
                }
              }}
            >
              {sectionRewardStatus === 'claimed' ? (
                <><CheckCircle2 size={13} /> Claimed · {rewardLabel}</>
              ) : sectionRewardStatus === 'available' ? (
                <><Sparkles size={13} /> Claim {rewardLabel}</>
              ) : (
                <><Lock size={12} /> <Gift size={12} /> {rewardLabel}</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Continuous Learning Path of Units with Dotted Connecting Line */}
      <div className="section-units-path">
        {/* Continuous Dotted SVG Guide Line that connects the unit nodes vertically */}
        <div className="path-dotted-track" aria-hidden="true">
          <div className="vertical-dotted-line" />
        </div>

        {/* Units mapped in continuous sequence */}
        <div className="section-units-list">
          {units.map((unit, uIdx) => (
            <UnitNodeRow
              key={unit.id || uIdx}
              unit={unit}
              unitIndex={uIdx}
              section={section}
              level={level}
              userCompleted={userCompleted}
              userCheckpoints={userCheckpoints}
              userRewards={userRewards}
              claimingRewardId={claimingRewardId}
              onClaimReward={onClaimReward}
              onLockedRewardClick={onLockedRewardClick}
              activeLessonId={activeLessonId}
              isExpanded={expandedUnitId === unit.id}
              onToggleExpand={onToggleUnitExpand}
              onSelectLesson={onSelectLesson}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
