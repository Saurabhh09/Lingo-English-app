import React from 'react';
import { Check, Lock, Play, Zap, Clock, Trophy, Star, ArrowRight, RotateCcw } from 'lucide-react';

export function LessonNode({
  lesson,
  index,
  status, // 'completed' | 'current' | 'available' | 'locked' | 'preview'
  onClick,
  prerequisiteName,
  alignment = 'center' // 'left' | 'center' | 'right'
}) {
  const isCheckpoint = lesson.isCheckpoint;
  const isCompleted = status === 'completed';
  const isCurrent = status === 'current';
  const isLocked = status === 'locked';

  // Construct accessible label that includes levelLabel (e.g. "LEVEL 01: Hello, world!")
  const accessibleName = [
    lesson.levelLabel || (isCheckpoint ? 'Checkpoint' : `Lesson ${index + 1}`),
    lesson.title,
    lesson.subtitle,
    isCompleted ? '(Completed, practice again)' : isCurrent ? '(Current lesson)' : isLocked ? '(Locked)' : ''
  ].filter(Boolean).join(' · ');

  return (
    <div className={`lesson-node-wrapper align-${alignment} status-${status} ${isCheckpoint ? 'is-checkpoint-node' : ''}`}>
      {/* Node Button */}
      <button
        type="button"
        className={`lesson-node-btn ${lesson.color || 'lime'} ${isCurrent ? 'is-pulse' : ''}`}
        onClick={onClick}
        aria-label={accessibleName}
      >
        <span className="node-icon-inner">
          {isCompleted ? (
            <Check size={24} className="node-check-icon" strokeWidth={2.8} />
          ) : isLocked ? (
            <Lock size={20} className="node-lock-icon" />
          ) : isCheckpoint ? (
            <Trophy size={24} className="node-trophy-icon" />
          ) : (
            <span className="node-emoji">{lesson.icon || '📖'}</span>
          )}
        </span>

        {/* Small floating status badge */}
        {isCurrent && (
          <span className="node-current-ping">
            <span className="ping-dot" />
          </span>
        )}
      </button>

      {/* Lesson Details Card Attached to Node */}
      <div className="lesson-node-card">
        <div className="node-card-top">
          <span className="eyebrow node-level-label">
            {lesson.levelLabel || (isCheckpoint ? 'MILESTONE' : `LESSON ${String(index + 1).padStart(2, '0')}`)}
          </span>

          {isCompleted ? (
            <span className="node-status-pill completed">
              <Check size={12} /> Done
            </span>
          ) : isCurrent ? (
            <span className="node-status-pill current">
              Up Next
            </span>
          ) : isLocked ? (
            <span className="node-status-pill locked">
              <Lock size={12} /> Locked
            </span>
          ) : (
            <span className="node-status-pill available">
              Available
            </span>
          )}
        </div>

        <h4 className="node-card-title">{lesson.title}</h4>
        <p className="node-card-subtitle">{lesson.subtitle}</p>

        <div className="node-card-meta">
          {lesson.xp && (
            <span className="node-xp">
              <Zap size={12} /> {isCompleted ? `+${lesson.xp} XP earned` : `${lesson.xp} XP`}
            </span>
          )}
          {lesson.duration && (
            <span className="node-duration">
              <Clock size={12} /> {lesson.duration}
            </span>
          )}
        </div>

        {/* Action Button inside card */}
        <div className="node-card-action">
          <button
            type="button"
            className={`button ${isCurrent ? 'dark' : 'light'} node-action-btn`}
            onClick={onClick}
          >
            {isCompleted ? (
              <>
                <RotateCcw size={13} />
                <span>Practice again</span>
              </>
            ) : isCurrent ? (
              <>
                <Play size={13} fill="currentColor" />
                <span>Start lesson</span>
                <ArrowRight size={13} />
              </>
            ) : isLocked ? (
              <>
                <Lock size={13} />
                <span>View prerequisite</span>
              </>
            ) : (
              <>
                <span>Explore lesson</span>
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </div>

        {isLocked && prerequisiteName && (
          <div className="node-locked-hint">
            <span>Prerequisite: {prerequisiteName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
