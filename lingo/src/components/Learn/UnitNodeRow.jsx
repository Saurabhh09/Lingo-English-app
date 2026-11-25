import React from 'react';
import { Star, Lock, Check, ChevronRight, ChevronDown, Mic, Headphones, Video, Dumbbell, Trophy, Sparkles, Gift } from 'lucide-react';
import { getLessonStatus, getPrecedingCheckpointForLesson } from '../../curriculumData.js';
import { REWARD_BY_UNIT_ID } from '../../../server/rewardDefinitions.mjs';
import { RewardChestNode } from '../Rewards/RewardChestNode.jsx';

// Map each lesson to a clean Duolingo-inspired icon matching user reference
function getLessonIcon(lesson, idx) {
  if (lesson.isCheckpoint) {
    return <Trophy size={24} className="node-svg-icon" color="#ffffff" />;
  }
  const type = (lesson.type || '').toLowerCase();
  const title = (lesson.title || '').toLowerCase();

  if (type.includes('speak') || title.includes('hello') || title.includes('conversation') || idx % 4 === 0) {
    return <Mic size={24} className="node-svg-icon" color="#ffffff" />;
  }
  if (type.includes('vocab') || title.includes('word') || idx % 4 === 1) {
    return <Dumbbell size={24} className="node-svg-icon" color="#ffffff" />;
  }
  if (type.includes('grammar') || title.includes('sentence') || idx % 4 === 2) {
    return <Video size={24} className="node-svg-icon" color="#ffffff" />;
  }
  if (type.includes('listen') || title.includes('sound') || idx % 4 === 3) {
    return <Headphones size={24} className="node-svg-icon" color="#ffffff" />;
  }
  return <Sparkles size={24} className="node-svg-icon" color="#ffffff" />;
}

export function UnitNodeRow({
  unit,
  unitIndex,
  section,
  level,
  userCompleted = [],
  userCheckpoints = [],
  userRewards = {},
  claimingRewardId = null,
  onClaimReward,
  onLockedRewardClick,
  activeLessonId = null,
  isExpanded = false,
  onToggleExpand,
  onSelectLesson,
}) {
  const lessons = unit.lessons || [];
  const unitReward = REWARD_BY_UNIT_ID.get(unit.id) || null;
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter(
    l => userCompleted.includes(l.realLessonId || l.id) || userCheckpoints.includes(l.id)
  ).length;
  const isCompleted = completedLessons >= totalLessons && totalLessons > 0;

  // Check if unit has the current next recommended lesson
  const hasCurrentLesson = lessons.some(l => {
    const status = getLessonStatus(l, userCompleted, activeLessonId, userCheckpoints);
    return status === 'current';
  });

  const hasAvailableLesson = lessons.some(l => {
    const status = getLessonStatus(l, userCompleted, activeLessonId, userCheckpoints);
    return status === 'available' || status === 'completed' || status === 'current';
  });

  let unitState = 'locked';
  if (isCompleted) {
    unitState = 'completed';
  } else if (hasCurrentLesson || (unitIndex === 0 && section?.sectionNumber === '01' && level?.id === 'pre-a1')) {
    unitState = 'current';
  } else if (hasAvailableLesson) {
    unitState = 'available';
  }

  const isLocked = unitState === 'locked';
  const unitNumber = unit.unitNumber ? parseInt(unit.unitNumber, 10) : unitIndex + 1;

  function handleUnitClick() {
    if (onToggleExpand) {
      onToggleExpand(unit.id);
    }
  }

  return (
    <div className={`unit-node-row unit-state-${unitState} ${isExpanded ? 'is-unit-expanded' : ''}`}>
      {/* Upper row: 3D Unit Marker + Attached Unit Card */}
      <div className="unit-row-main">
        {/* Circular 3D Node representing the unit */}
        <div className="unit-node-anchor">
          {unitState === 'current' && (
            <div className="unit-node-halo" aria-hidden="true">
              <span className="halo-radiance-spark top-left" />
              <span className="halo-radiance-spark top-right" />
              <span className="halo-radiance-spark bottom-left" />
              <span className="halo-radiance-spark bottom-right" />
            </div>
          )}

          <button
            type="button"
            className={`unit-3d-node ${unitState}`}
            onClick={handleUnitClick}
            aria-label={`Unit ${unitNumber}: ${unit.title}. ${isExpanded ? 'Collapse' : 'Expand'}`}
          >
            <div className="node-surface">
              {isCompleted ? (
                <Star size={24} className="node-icon-star filled" fill="#ffffff" color="#ffffff" />
              ) : unitState === 'current' ? (
                <Star size={24} className="node-icon-star pulsing" fill="#ffffff" color="#ffffff" />
              ) : unitState === 'available' ? (
                <Star size={22} className="node-icon-star" fill="#ffffff" color="#ffffff" />
              ) : (
                <Lock size={20} className="node-icon-lock" color="#94a3b8" />
              )}
            </div>
          </button>
        </div>

        {/* Attached Unit Card on the Right */}
        <div
          className={`unit-details-card ${isLocked ? 'is-card-locked' : 'is-card-active'}`}
          onClick={handleUnitClick}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleUnitClick();
            }
          }}
          aria-expanded={isExpanded}
          aria-label={`Unit ${unitNumber}: ${unit.title}. ${isExpanded ? 'Collapse lessons' : 'Expand lessons'}`}
        >
          <div className="unit-card-header">
            <span className={`unit-card-label ${isLocked ? 'label-locked' : 'label-active'}`}>
              Unit {unitNumber}
            </span>
            <span className="unit-card-chevron">
              {isExpanded ? (
                <ChevronDown size={18} className={isLocked ? 'text-slate-400' : 'text-emerald-600'} />
              ) : (
                <ChevronRight size={18} className={isLocked ? 'text-slate-400' : 'text-emerald-600'} />
              )}
            </span>
          </div>

          <h4 className="unit-card-title">{unit.title}</h4>

          <div className="unit-card-footer">
            {isCompleted ? (
              <span className="unit-status-text completed">
                <Check size={14} className="status-icon" />
                <span>{completedLessons} / {totalLessons} lessons</span>
              </span>
            ) : unitState === 'current' || unitState === 'available' ? (
              <span className="unit-status-text in-progress">
                <Sparkles size={14} className="status-icon" />
                <span>{completedLessons} / {totalLessons} lessons</span>
              </span>
            ) : (
              <span className="unit-status-text locked">
                <Lock size={13} className="status-icon" />
                <span>Locked</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Duolingo-Inspired Winding Lesson Trail inside Unit */}
      {isExpanded && (
        <div className="unit-winding-lessons-path" role="region" aria-label={`Lessons path for Unit ${unitNumber}`}>
          {unit.objective && (
            <div className="unit-objective-pill-card">
              <span className="goal-eyebrow">UNIT GOAL</span>
              <p className="goal-text">{unit.objective}</p>
            </div>
          )}

          <div className="winding-trail-nodes-container">
            {lessons.map((lesson, idx) => {
              const status = getLessonStatus(lesson, userCompleted, activeLessonId, userCheckpoints);
              const isLessonCompleted = status === 'completed';
              const isLessonCurrent = status === 'current';
              const isLessonLocked = status === 'locked';
              const prevCheckpoint = lesson.realLessonId ? getPrecedingCheckpointForLesson(lesson.realLessonId) : null;
              const prereqTitle = idx > 0
                ? lessons[idx - 1].title
                : (prevCheckpoint?.title || null);

              // Alternate alignment (left, center-left, right, center-right)
              const alignPatterns = ['left', 'center', 'right', 'center'];
              const align = alignPatterns[idx % alignPatterns.length];

              return (
                <React.Fragment key={lesson.id || idx}>
                  {/* Vertical connecting line between lesson nodes */}
                  {idx > 0 && (
                    <div className={`trail-connector-line from-${alignPatterns[(idx - 1) % alignPatterns.length]}-to-${align}`} aria-hidden="true" />
                  )}

                  <div className={`winding-lesson-step align-${align} status-${status}`}>
                    {/* Left side label when node is aligned right */}
                    {align === 'right' && (
                      <div
                        className="lesson-side-label text-right"
                        onClick={() => onSelectLesson && onSelectLesson(lesson, status, prereqTitle)}
                      >
                        <span className="lesson-label-num">LESSON {idx + 1}</span>
                        <h5 className="lesson-label-title">{lesson.title}</h5>
                        <span className="lesson-label-meta">
                          {lesson.duration || '4 min'} · +{lesson.xp || 50} XP
                        </span>
                      </div>
                    )}

                    {/* Circular 3D Lesson Node Button */}
                    <div className="lesson-circle-node-anchor">
                      {isLessonCurrent && (
                        <div className="lesson-start-floating-beacon">
                          <span>START</span>
                        </div>
                      )}

                      <button
                        type="button"
                        className={`lesson-3d-circle-btn ${status}`}
                        onClick={() => onSelectLesson && onSelectLesson(lesson, status, prereqTitle)}
                        aria-label={`Lesson ${idx + 1}: ${lesson.title}. Status: ${status}.`}
                      >
                        <div className="circle-btn-surface">
                          {isLessonCompleted ? (
                            <Check size={24} strokeWidth={3.2} color="#ffffff" />
                          ) : isLessonLocked ? (
                            <Lock size={20} color="#94a3b8" />
                          ) : (
                            getLessonIcon(lesson, idx)
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Right side label when node is aligned left or center */}
                    {align !== 'right' && (
                      <div
                        className="lesson-side-label text-left"
                        onClick={() => onSelectLesson && onSelectLesson(lesson, status, prereqTitle)}
                      >
                        <span className="lesson-label-num">LESSON {idx + 1}</span>
                        <h5 className="lesson-label-title">{lesson.title}</h5>
                        <span className="lesson-label-meta">
                          {lesson.duration || '4 min'} · +{lesson.xp || 50} XP
                        </span>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}

            {/* Milestone Reward Chest at end of milestone units */}
            {unitReward && (
              <>
                <div className="trail-connector-line to-chest" aria-hidden="true" />
                <RewardChestNode
                  reward={unitReward}
                  unitNumber={unitNumber}
                  status={
                    claimingRewardId === unitReward.id
                      ? 'opening'
                      : (userRewards?.[unitReward.id]?.status || 'locked')
                  }
                  busy={claimingRewardId === unitReward.id}
                  requirementText={`Complete Unit ${unitNumber} to unlock`}
                  onClaim={onClaimReward}
                  onLockedClick={onLockedRewardClick}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
