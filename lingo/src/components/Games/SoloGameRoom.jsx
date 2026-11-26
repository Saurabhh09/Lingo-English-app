import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Check,
  X,
  Sparkles,
  Trophy,
  LogOut,
  ArrowRight,
  Target,
  CheckCircle2,
  Timer
} from 'lucide-react';
import { Mascot } from '../../Art.jsx';
import { GameClockTimer } from './GameClockTimer.jsx';
import { getOrCreateStableShuffle, toOriginalIndex, toDisplayIndex, recordCorrectPositionMetric } from '../../../server/optionShuffler.mjs';

/**
 * SoloGameRoom: Dedicated, self-contained flow for Solo Mode gameplay.
 * - Pre-game countdown: clean Lingo-themed timer card without exit/summary clutter.
 * - Active gameplay: layered card stack inspired by minimal quiz decks + Lingo touches,
 *   dynamic mascot reactions (happy bounce vs worried shake), native <dialog> leave confirm,
 *   and explicit final-question answer review before transitioning to results.
 * - Challenge Complete: clean Lingo-themed celebration & stats without extra sidebars.
 */
export function SoloGameRoom({
  game,
  user,
  busy,
  action
}) {
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [reviewingFinalAnswer, setReviewingFinalAnswer] = useState(false);
  const lastQuestionRef = useRef(null);
  const exitDialogRef = useRef(null);

  // Reset choice when advancing to a new question
  useEffect(() => {
    setSelectedChoice(null);
  }, [game?.index]);

  // Keep snapshot of active question so final-question review works seamlessly
  useEffect(() => {
    if (game?.status === 'playing' && game?.question) {
      lastQuestionRef.current = game.question;
    }
    if (game?.status === 'countdown') {
      setReviewingFinalAnswer(false);
      lastQuestionRef.current = null;
    }
  }, [game?.status, game?.question]);

  // Countdown tick synced to server deadline
  useEffect(() => {
    if (game.status === 'countdown' && game.countdownDeadline) {
      const calc = () => {
        const clockOffset = (game.serverTime && game.clientReceivedAt)
          ? (game.serverTime - game.clientReceivedAt)
          : 0;
        const currentServerTime = Date.now() + clockOffset;
        const remaining = Math.max(0, Math.ceil((game.countdownDeadline - currentServerTime) / 1000));
        setSecondsLeft(remaining);
      };
      calc();
      const interval = setInterval(calc, 250);
      return () => clearInterval(interval);
    }
  }, [game.status, game.countdownDeadline, game.serverTime, game.clientReceivedAt]);

  const isQuizStage =
    game.status === 'playing' ||
    (game.status === 'finished' && reviewingFinalAnswer && Boolean(game.answer));

  const displayQuestion = game.question || lastQuestionRef.current;
  const displayAnswer = game.answer;
  const isAnswered = Boolean(displayAnswer);
  const isCorrectAnswer = isAnswered && (displayAnswer.isCorrect || displayAnswer.selected === displayAnswer.correct);
  const isFinalQuestion = (game.index + 1) >= game.total;

  const questionShuffle = useMemo(() => {
    if (!displayQuestion?.options?.length) return null;
    return getOrCreateStableShuffle(
      `lingo-shuf:solo:${game.id}:${game.startedAt || 'pending'}:q${game.index}:${displayQuestion.id || game.index}`,
      displayQuestion.options
    );
  }, [game.id, game.startedAt, game.index, displayQuestion?.id, displayQuestion?.options]);

  const correctDisplayIndex = isAnswered && Number.isInteger(displayAnswer.correct)
    ? toDisplayIndex(questionShuffle, displayAnswer.correct)
    : -1;
  const selectedDisplayIndex = isAnswered && Number.isInteger(displayAnswer.selected)
    ? toDisplayIndex(questionShuffle, displayAnswer.selected)
    : -1;

  // Dynamic Mascot Pose during gameplay
  const mascotPose = isAnswered
    ? (isCorrectAnswer ? 'celebrate' : 'sad')
    : 'study';

  // Ring progress for countdown (10s total)
  const ringRadius = 56;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(10, Math.max(0, secondsLeft)) / 10);

  const openExitDialog = () => {
    const dlg = exitDialogRef.current;
    if (dlg && typeof dlg.showModal === 'function') {
      if (!dlg.open) dlg.showModal();
    }
  };

  const closeExitDialog = () => {
    const dlg = exitDialogRef.current;
    if (dlg && dlg.open) {
      dlg.returnValue = '';
      dlg.close();
    }
  };

  const handleSubmitOrAdvance = () => {
    if (!isAnswered) {
      if (selectedChoice === null || busy) return;
      if (isFinalQuestion && displayQuestion) {
        lastQuestionRef.current = displayQuestion;
        setReviewingFinalAnswer(true);
      }
      const canonicalChoice = toOriginalIndex(questionShuffle, selectedChoice);
      action('answer', {
        index: game.index,
        questionId: displayQuestion?.id,
        choice: canonicalChoice
      });
      return;
    }

    if (isAnswered && correctDisplayIndex >= 0) {
      recordCorrectPositionMetric(correctDisplayIndex);
    }

    if (isFinalQuestion || game.status === 'finished') {
      setReviewingFinalAnswer(false);
    } else {
      action('next');
    }
  };

  // =========================================================================
  // 1. PRE-GAME COUNTDOWN TIMER VIEW (Clean, zero clutter, no Exit button)
  // =========================================================================
  if (game.status === 'countdown') {
    return (
      <div className="solo-flow-page solo-countdown-stage">
        <div className="solo-countdown-card">
          <div className="solo-countdown-pill">
            <Sparkles size={13} />
            <span>SOLO CHALLENGE</span>
          </div>

          <div className="solo-countdown-mascot" aria-hidden="true">
            <Mascot pose="wave" size={88} />
          </div>

          <h2 className="solo-countdown-heading">Get ready!</h2>
          <p className="solo-countdown-lead">Take a quick breath—your questions are coming up.</p>

          <div
            className="solo-timer-ring-wrap"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Starting in ${secondsLeft} seconds`}
          >
            <svg viewBox="0 0 132 132" className="solo-timer-ring-svg" aria-hidden="true">
              <circle cx="66" cy="66" r={ringRadius} className="solo-ring-track" />
              <circle
                cx="66"
                cy="66"
                r={ringRadius}
                className="solo-ring-fill"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
              />
            </svg>
            <span className={`solo-countdown-digit ${secondsLeft <= 0 ? 'is-go' : ''}`}>
              {secondsLeft > 0 ? secondsLeft : 'Go!'}
            </span>
          </div>

          <div className="solo-countdown-dots" aria-hidden="true">
            <span className="is-lit" />
            <span className={secondsLeft <= 6 ? 'is-lit' : ''} />
            <span className={secondsLeft <= 3 ? 'is-lit' : ''} />
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. ACTIVE GAMEPLAY & FINAL-QUESTION REVIEW (Stacked Deck + Lingo Theme)
  // =========================================================================
  if (isQuizStage) {
    const qNumberLabel = `${String(Math.min(game.total, game.index + 1)).padStart(2, '0')} of ${String(game.total).padStart(2, '0')}`;
    const progressPct = Math.min(100, Math.round(((game.index + 1) / Math.max(1, game.total)) * 100));

    return (
      <div className="solo-flow-page solo-quiz-stage">
        {/* Clean Quiz Header: Exit left, Question counter center, Timer pill right */}
        <header className="solo-quiz-topbar">
          <button
            type="button"
            className="solo-exit-icon-btn"
            onClick={openExitDialog}
            aria-label="Exit challenge"
          >
            <LogOut size={15} />
            <span>Exit</span>
          </button>

          <span className="solo-counter-pill" aria-label={`Question ${game.index + 1} of ${game.total}`}>
            {qNumberLabel}
          </span>

          <GameClockTimer
            endsAt={game.endsAt}
            serverTime={game.serverTime}
            clientReceivedAt={game.clientReceivedAt}
            className="solo-clock-pill"
          />
        </header>

        {/* Crisp Progress Bar */}
        <div className="solo-progress-track" aria-hidden="true">
          <div className="solo-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Stacked Question Cards Deck (inspired by minimal quiz reference + Lingo theme) */}
        <div className="solo-deck-wrap">
          {/* Underlying Stacked Cards giving layered deck depth */}
          {game.index + 2 < game.total && <div className="solo-deck-back layer-2" aria-hidden="true" />}
          {game.index + 1 < game.total && <div className="solo-deck-back layer-1" aria-hidden="true" />}

          <article className="solo-question-card" key={game.index}>
            <div className="solo-card-meta-row">
              <span className="solo-card-topic">{game.topic} · {game.difficulty}</span>
              <span className="solo-card-score">{game.score || 0} pts</span>
            </div>

            <div className="solo-card-hero">
              <div className={`solo-mascot-stage ${isAnswered ? (isCorrectAnswer ? 'is-happy' : 'is-sad') : 'is-thinking'}`}>
                <Mascot pose={mascotPose} size={54} />
              </div>
              <h2 className="solo-card-prompt question-prompt">{displayQuestion?.prompt}</h2>
            </div>

            {/* Clean Minimal Option Cards with Right-Side Feedback Icon */}
            <div className="solo-options-stack" role="radiogroup" aria-label="Answer choices">
              {(questionShuffle?.options || []).map((optObj, i) => {
                let stateClass = '';
                if (isAnswered) {
                  if (i === correctDisplayIndex) stateClass = 'is-correct';
                  else if (i === selectedDisplayIndex) stateClass = 'is-wrong';
                  else stateClass = 'is-muted';
                } else if (i === selectedChoice) {
                  stateClass = 'is-selected';
                }

                return (
                  <button
                    key={`${game.index}-${optObj.id}`}
                    type="button"
                    role="radio"
                    aria-checked={i === selectedChoice || (isAnswered && i === selectedDisplayIndex)}
                    disabled={busy || isAnswered}
                    onClick={() => {
                      if (!isAnswered) setSelectedChoice(i);
                    }}
                    className={`solo-option-pill ${stateClass}`}
                  >
                    <span className="solo-option-letter">{String.fromCharCode(65 + i)}</span>
                    <span className="solo-option-copy">{optObj.text}</span>
                    {isAnswered && i === correctDisplayIndex && (
                      <span className="solo-option-status ok" aria-label="Correct answer">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}
                    {isAnswered && i === selectedDisplayIndex && i !== correctDisplayIndex && (
                      <span className="solo-option-status bad" aria-label="Your incorrect choice">
                        <X size={14} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Compact Explanation & Points Strip after Submitting */}
            {isAnswered && (
              <div className={`solo-feedback-strip ${isCorrectAnswer ? 'positive' : 'negative'}`}>
                <div className="solo-feedback-top">
                  <strong>
                    {isCorrectAnswer ? 'Spot on! Nicely done.' : 'Not quite — keep going!'}
                  </strong>
                  <span className="solo-pts-chip">
                    +{(displayAnswer.pointsEarned !== undefined) ? displayAnswer.pointsEarned : (isCorrectAnswer ? 100 : 0)} pts
                  </span>
                </div>
                {displayAnswer.explanation && (
                  <p className="solo-feedback-explain">{displayAnswer.explanation}</p>
                )}
              </div>
            )}
          </article>
        </div>

        {/* Primary Action Button anchored cleanly below deck */}
        <div className="solo-action-footer">
          <button
            type="button"
            className="solo-primary-btn"
            disabled={busy || (!isAnswered && selectedChoice === null)}
            onClick={handleSubmitOrAdvance}
          >
            {busy ? (
              'Checking...'
            ) : !isAnswered ? (
              <span>Submit Answer</span>
            ) : isFinalQuestion ? (
              <><span>Show Results</span> <ArrowRight size={18} /></>
            ) : (
              <><span>Next Question</span> <ArrowRight size={18} /></>
            )}
          </button>
        </div>

        {/* Lingo-Themed Native <dialog> Exit Confirmation Modal */}
        <dialog
          ref={exitDialogRef}
          className="solo-exit-dialog"
          aria-labelledby="solo-exit-dialog-title"
          onCancel={closeExitDialog}
          onClose={() => {
            if (exitDialogRef.current) exitDialogRef.current.returnValue = '';
          }}
        >
          <div className="solo-exit-dialog-card">
            <div className="solo-exit-dialog-mascot" aria-hidden="true">
              <Mascot pose="sad" size={72} />
            </div>
            <span className="confirm-leave-badge">HEADS UP</span>
            <h1 id="solo-exit-dialog-title" className="solo-exit-title">Leave this challenge?</h1>
            <p className="solo-exit-desc">
              Your answers and score for this solo run won’t be saved if you quit now.
            </p>
            <div className="confirm-leave-actions">
              <button
                type="button"
                autoFocus
                className="button primary full-width"
                onClick={closeExitDialog}
              >
                Keep playing
              </button>
              <button
                type="button"
                className="solo-confirm-quit-btn"
                onClick={() => {
                  closeExitDialog();
                  action('leave');
                }}
              >
                Exit game
              </button>
            </div>
          </div>
        </dialog>
      </div>
    );
  }

  // =========================================================================
  // 3. CHALLENGE COMPLETE / RESULTS SCREEN (Clean Lingo Theme, No Clutter)
  // =========================================================================
  const accuracy = game.stats?.accuracy ?? 0;
  const correctCount = game.stats?.correct ?? 0;
  const timedOutCount = game.stats?.timedOut ?? 0;
  const resultMood = accuracy >= 60 ? 'celebrate' : 'cheer';

  return (
    <div className="solo-flow-page solo-results-stage">
      <section className="solo-results-card">
        <span className="solo-results-pill">
          <Trophy size={13} />
          <span>CHALLENGE COMPLETE</span>
        </span>

        <div className="solo-results-mascot" aria-hidden="true">
          <div className="solo-results-glow" />
          <Mascot pose={resultMood} size={96} />
        </div>

        <h2 className="solo-results-title">
          {accuracy >= 80 ? 'Brilliant finish!' : accuracy >= 50 ? 'Nice effort!' : 'Great practice run!'}
        </h2>
        <p className="solo-results-subtitle">
          {game.topic} · {game.difficulty}
        </p>

        <div className="solo-score-banner">
          <span className="solo-score-label">TOTAL POINTS</span>
          <strong className="solo-score-value">{game.score || 0}</strong>
          <small className="solo-score-sub">
            Completed {game.total} questions in {game.duration} min limit
          </small>
        </div>

        <div className="solo-results-metrics">
          <div className="solo-metric-tile acc">
            <Target size={16} />
            <strong>{accuracy}%</strong>
            <span>Accuracy</span>
          </div>
          <div className="solo-metric-tile corr">
            <CheckCircle2 size={16} />
            <strong>{correctCount}/{game.total}</strong>
            <span>Correct</span>
          </div>
          <div className="solo-metric-tile tout">
            <Timer size={16} />
            <strong>{timedOutCount}</strong>
            <span>Timeouts</span>
          </div>
        </div>

        <button
          type="button"
          className="solo-primary-btn solo-done-btn"
          onClick={() => action('leave')}
        >
          <span>Back to Play</span>
          <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}
