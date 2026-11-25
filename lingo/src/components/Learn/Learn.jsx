import React, { useState, useMemo, useCallback } from 'react';
import { CEFR_LEVELS, realLessons, getLevelLessons, getSectionLessons, calculateLevelProgress, getPrecedingCheckpointForLesson } from '../../curriculumData.js';
import { REWARD_BY_CEFR_ID } from '../../../server/rewardDefinitions.mjs';
import { ContinueLearningBanner } from './ContinueLearningBanner.jsx';
import { CEFRLevelCard } from './CEFRLevelCard.jsx';
import { SectionJourneyCard } from './SectionJourneyCard.jsx';
import { LessonPreviewModal } from './LessonPreviewModal.jsx';
import { Trophy, CheckCircle, Sparkles, Lock, Gift } from 'lucide-react';

export function Learn({ progress, openLesson, activeLesson, onOpenProgressModal, onClaimReward, claimingRewardId = null, onNotify }) {
  const userCompleted = progress?.completed || [];
  const userCheckpoints = progress?.checkpoints || [];
  const userRewards = progress?.rewards || {};

  const handleLockedRewardClick = useCallback((reward, fallbackMsg) => {
    if (onNotify) {
      onNotify(fallbackMsg || `Keep learning to unlock ${reward?.name || 'this reward'}!`);
    }
  }, [onNotify]);

  // Find which CEFR level the user is currently working on
  const currentLevelId = useMemo(() => {
    if (!activeLesson) return 'pre-a1';
    for (const lvl of CEFR_LEVELS) {
      const allLessons = getLevelLessons(lvl);
      if (allLessons.some(l => (l.realLessonId || l.id) === activeLesson.id)) {
        return lvl.id;
      }
    }
    return 'pre-a1';
  }, [activeLesson]);

  // Which levels are currently expanded in the continuous journey
  // Default: current level is expanded, plus Pre-A1 always accessible
  const [expandedLevelIds, setExpandedLevelIds] = useState(() => [currentLevelId]);

  // Which unit is currently expanded (showing its lesson drawer)
  const [expandedUnitId, setExpandedUnitId] = useState(null);

  // Lesson preview modal state
  const [previewModalLesson, setPreviewModalLesson] = useState(null);
  const [previewLocked, setPreviewLocked] = useState(false);
  const [previewPrerequisite, setPreviewPrerequisite] = useState('');

  // Toggle level expansion
  const handleToggleLevel = useCallback((levelId) => {
    setExpandedLevelIds(prev =>
      prev.includes(levelId) ? prev.filter(id => id !== levelId) : [...prev, levelId]
    );
  }, []);

  // Toggle unit expansion (accordion-like or toggle)
  const handleToggleUnit = useCallback((unitId) => {
    setExpandedUnitId(prev => (prev === unitId ? null : unitId));
  }, []);

  // Handler for "Continue English journey" banner click
  const handleStartNextLesson = useCallback(() => {
    if (activeLesson) {
      const pendingCheckpoint = getPrecedingCheckpointForLesson(activeLesson.id);
      if (pendingCheckpoint && !userCheckpoints.includes(pendingCheckpoint.id) && !userCompleted.includes(pendingCheckpoint.id) && openLesson) {
        openLesson(pendingCheckpoint);
        return;
      }
      const realObj = realLessons.find(r => r.id === activeLesson.id);
      if (realObj && openLesson) {
        openLesson(realObj);
        return;
      }
    }
    // Fallback to first real lesson
    if (realLessons[0] && openLesson) {
      openLesson(realLessons[0]);
    }
  }, [activeLesson, openLesson, userCheckpoints, userCompleted]);

  // Handler when user taps a lesson node or lesson card
  const handleSelectLesson = useCallback((lesson, status, prerequisiteName) => {
    if (status === 'locked') {
      setPreviewModalLesson(lesson);
      setPreviewLocked(true);
      setPreviewPrerequisite(prerequisiteName || 'the previous lesson');
      return;
    }

    if (lesson.isCheckpoint && openLesson) {
      openLesson(lesson);
      return;
    }

    if (lesson.realLessonId) {
      const realObj = realLessons.find(r => r.id === lesson.realLessonId);
      if (realObj && openLesson) {
        openLesson(realObj);
        return;
      }
    }

    // Fallback preview dialog
    setPreviewModalLesson(lesson);
    setPreviewLocked(false);
    setPreviewPrerequisite(prerequisiteName || 'the previous lesson');
  }, [openLesson]);

  return (
    <div className="learn-redesign-journey">
      {/* 1. Top "Continue English Journey" Banner with Mascot */}
      <div className="learn-banner-wrapper">
        <ContinueLearningBanner
          activeLesson={activeLesson}
          onStartNextLesson={handleStartNextLesson}
        />
      </div>

      {/* 3. Continuous Learning Path with CEFR Levels & Vertical Dotted Connection */}
      <div className="learn-levels-journey-flow">
        {CEFR_LEVELS.map((level, lvlIdx) => {
          const isExpanded = expandedLevelIds.includes(level.id);
          const isCurrent = level.id === currentLevelId;
          const levelStats = calculateLevelProgress(level, userCompleted);
          const isLevelMastered = levelStats.status === 'completed';

          return (
            <div
              key={level.id}
              className={`cefr-level-journey-block ${isExpanded ? 'is-level-open' : 'is-level-closed'} ${isCurrent ? 'is-user-current-level' : ''}`}
            >
              {/* Level Summary Header Card */}
              <CEFRLevelCard
                level={level}
                isExpanded={isExpanded}
                onToggleExpand={() => handleToggleLevel(level.id)}
                userCompleted={userCompleted}
                isCurrentLevel={isCurrent}
              />

              {/* Connecting vertical line segment into the sections */}
              {isExpanded && (
                <div className="level-sections-wrapper">
                  {/* Dotted path leading into section 1 */}
                  <div className="level-entry-dotted-connector" aria-hidden="true" />

                  {/* Sections of this CEFR Level */}
                  {(level.sections || []).map((section, sIdx) => (
                    <React.Fragment key={section.id || sIdx}>
                      <SectionJourneyCard
                        section={section}
                        sectionIndex={sIdx}
                        level={level}
                        userCompleted={userCompleted}
                        userCheckpoints={userCheckpoints}
                        userRewards={userRewards}
                        claimingRewardId={claimingRewardId}
                        onClaimReward={onClaimReward}
                        onLockedRewardClick={handleLockedRewardClick}
                        activeLessonId={activeLesson?.id}
                        expandedUnitId={expandedUnitId}
                        onToggleUnitExpand={handleToggleUnit}
                        onSelectLesson={handleSelectLesson}
                      />

                      {/* Dotted bridge between sections */}
                      {sIdx < (level.sections || []).length - 1 && (
                        <div className="section-bridge-dotted-line" aria-hidden="true" />
                      )}
                    </React.Fragment>
                  ))}

                  {/* Level Completion Island Milestone */}
                  {(() => {
                    const levelSections = level.sections || [];
                    const completedSections = levelSections.filter(sec => {
                      const secLessons = getSectionLessons(sec);
                      return secLessons.length > 0 && secLessons.every(l => userCompleted.includes(l.realLessonId || l.id));
                    }).length;
                    const levelReward = REWARD_BY_CEFR_ID.get(level.id) || null;
                    const levelRewardStatus = levelReward
                      ? (claimingRewardId === levelReward.id ? 'opening' : (userRewards?.[levelReward.id]?.status || 'locked'))
                      : (isLevelMastered ? 'available' : 'locked');
                    const pct = levelSections.length ? Math.round((completedSections / levelSections.length) * 100) : 0;

                    return (
                      <div
                        className={`level-milestone-island is-reward-${levelRewardStatus}`}
                        onClick={() => {
                          if (!levelReward) return;
                          if (levelRewardStatus === 'available' && onClaimReward) {
                            onClaimReward(levelReward.id);
                          } else if (levelRewardStatus === 'locked') {
                            handleLockedRewardClick(
                              levelReward,
                              `Finish all ${levelSections.length} sections and final assessment to unlock ${level.code} Milestone.`
                            );
                          }
                        }}
                      >
                        <div className="milestone-island-badge">
                          {levelRewardStatus === 'claimed' ? (
                            <CheckCircle size={24} className="milestone-trophy-icon" />
                          ) : levelRewardStatus === 'available' ? (
                            <Gift size={24} className="milestone-trophy-icon" />
                          ) : (
                            <Trophy size={24} className="milestone-trophy-icon" />
                          )}
                        </div>
                        <div className="milestone-island-content" style={{ flex: 1 }}>
                          <h4 className="milestone-title">
                            {levelRewardStatus === 'claimed'
                              ? `${level.code} Milestone Claimed!`
                              : levelRewardStatus === 'available'
                                ? `${level.code} Milestone Unlocked!`
                                : `${level.code} Milestone`}
                          </h4>
                          <p className="milestone-desc">
                            {levelRewardStatus === 'claimed'
                              ? `You earned the ${levelReward?.certificateTitle || `${level.code} Certificate`}!`
                              : levelRewardStatus === 'available'
                                ? `All ${levelSections.length} sections and final assessment complete! Tap to claim your rewards.`
                                : `${completedSections} / ${levelSections.length} sections completed · Finish all sections & final assessment to unlock.`}
                          </p>
                          <div className="milestone-progress-meta">
                            <div className="milestone-progress-track">
                              <div className="milestone-progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                            {levelReward && (
                              <div className="milestone-reward-preview-row">
                                <span>+{levelReward.xpAmount} XP</span>
                                <span>· +{levelReward.gemsAmount} Gems</span>
                                {levelReward.badgeId && <span>· Graduation Badge</span>}
                                {levelReward.certificateTitle && <span>· Certificate</span>}
                                {levelRewardStatus === 'available' && (
                                  <button
                                    type="button"
                                    className="milestone-action-pill"
                                    disabled={claimingRewardId === levelReward.id}
                                    onClick={e => {
                                      e.stopPropagation();
                                      if (onClaimReward) onClaimReward(levelReward.id);
                                    }}
                                  >
                                    <Sparkles size={12} /> {claimingRewardId === levelReward.id ? 'Opening...' : 'Claim Milestone'}
                                  </button>
                                )}
                                {levelRewardStatus === 'claimed' && (
                                  <span className="milestone-action-pill claimed">
                                    <CheckCircle size={12} /> Claimed
                                  </span>
                                )}
                                {levelRewardStatus === 'locked' && (
                                  <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px', opacity: 0.78 }}>
                                    <Lock size={11} /> Locked
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Connecting Dotted Path down to the next level card */}
              {lvlIdx < CEFR_LEVELS.length - 1 && (
                <div className="inter-level-dotted-track" aria-hidden="true">
                  <div className="inter-level-line" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Lesson Preview & Locked Requirement Modal */}
      {previewModalLesson && (
        <LessonPreviewModal
          lesson={previewModalLesson}
          isLocked={previewLocked}
          prerequisiteName={previewPrerequisite}
          onClose={() => setPreviewModalLesson(null)}
          onStartReal={lesson => {
            const realObj = realLessons.find(r => r.id === lesson.realLessonId);
            if (realObj && openLesson) openLesson(realObj);
          }}
        />
      )}
    </div>
  );
}
