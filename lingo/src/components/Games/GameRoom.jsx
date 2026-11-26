import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Clock,
  Check,
  X,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import { WaitingLobby } from './WaitingLobby.jsx';
import { CountdownLobby } from './CountdownLobby.jsx';
import { FinishedGame } from './FinishedGame.jsx';
import { SpectatorDashboard } from './SpectatorDashboard.jsx';
import { Mascot } from '../../Art.jsx';
import { getOrCreateStableShuffle, toOriginalIndex, toDisplayIndex, recordCorrectPositionMetric } from '../../../server/optionShuffler.mjs';

/**
 * GameRoom: Orchestrator component for Friends multiplayer rooms.
 * Uses clean Lingo-themed Lobby, Solo-style Countdown, Stacked Question Card Deck
 * with live Mascot expressions, native <dialog> Exit modal, and Podium Leaderboard
 * (with SpectatorDashboard preserved separately for host-spectator mode).
 */
export function GameRoom({
  game,
  user,
  tick,
  busy,
  action,
  copyCode,
  api,
  notify,
  socialOverview,
  refreshSocial,
}) {
  const [selectedChoice, setSelectedChoice] = useState(null);
  const exitDialogRef = useRef(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [game?.index]);

  const myMember = game.members?.find(m => m.username === user.username);
  const isSpectator = myMember?.role === 'spectator';

  // Derive total game time remaining during active quiz
  const clockOffset = (game.serverTime && game.clientReceivedAt)
    ? (game.serverTime - game.clientReceivedAt)
    : 0;
  const currentServerTime = (tick || Date.now()) + clockOffset;
  const totalRemainingSeconds = game.endsAt
    ? Math.max(0, Math.ceil((game.endsAt - currentServerTime) / 1000))
    : 0;
  const formattedTime = `${String(Math.floor(totalRemainingSeconds / 60)).padStart(2, '0')}:${String(totalRemainingSeconds % 60).padStart(2, '0')}`;

  const isCountdown = game.status === 'countdown' || game.status === 'starting';
  const isPlayingParticipant = game.status === 'playing' && !isSpectator && !(myMember?.completed || game.completed);
  const questionShuffle = useMemo(() => {
    if (!isPlayingParticipant || !game.question?.options?.length) return null;
    return getOrCreateStableShuffle(
      `lingo-shuf:room:${game.code}:${user?.username || 'p'}:${game.startedAt || 'pending'}:q${game.index}:${game.question.id || game.index}`,
      game.question.options
    );
  }, [isPlayingParticipant, game.code, user?.username, game.startedAt, game.index, game.question?.id, game.question?.options]);

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

  // =========================================================================
  // 1. WAITING LOBBY (Redesigned to Match Friends Lobby Reference)
  // =========================================================================
  if (game.status === 'waiting') {
    return (
      <div className="solo-flow-page friends-lobby-page">
        <header className="friends-top-header">
          <button
            type="button"
            className="friends-back-pill exit-game-btn"
            aria-label="Exit Game"
            onClick={() => action('leave')}
          >
            <ArrowLeft size={15} />
            <span>Exit Game</span>
          </button>

          <span className="friends-live-lobby-pill">
            <span className="green-dot" />
            <span>LIVE LOBBY</span>
          </span>
        </header>

        <WaitingLobby
          game={game}
          user={user}
          busy={busy}
          action={action}
          copyCode={copyCode}
          api={api}
          notify={notify}
          socialOverview={socialOverview}
          refreshSocial={refreshSocial}
        />
      </div>
    );
  }

  // =========================================================================
  // 2. PRE-GAME COUNTDOWN TIMER (Clean Solo-Style Theme, No Live Leaderboard)
  // =========================================================================
  if (isCountdown) {
    return (
      <CountdownLobby
        game={game}
        user={user}
        initialSeconds={10}
        serverDeadline={game.countdownDeadline}
      />
    );
  }

  // =========================================================================
  // 3. SPECTATOR MODE (Live Leaderboard + Top-3 Podium View)
  // =========================================================================
  if (game.status === 'playing' && isSpectator) {
    return (
      <SpectatorDashboard
        game={game}
        user={user}
        tick={tick}
        busy={busy}
        action={action}
        copyCode={copyCode}
      />
    );
  }

  // =========================================================================
  // 4. ACTIVE PARTICIPANT GAMEPLAY (Stacked Deck + Dynamic Mascot + Lingo Theme)
  // =========================================================================
  if (isPlayingParticipant) {
    const isAnswered = Boolean(game.answer);
    const isCorrectAnswer = isAnswered && (game.answer.isCorrect || game.answer.selected === game.answer.correct);
    const isFinalQuestion = (game.index + 1) >= game.total;
    const qNumberLabel = `${String(Math.min(game.total, game.index + 1)).padStart(2, '0')} of ${String(game.total).padStart(2, '0')}`;
    const progressPct = Math.min(100, Math.round(((game.index + 1) / Math.max(1, game.total)) * 100));
    const mascotPose = isAnswered ? (isCorrectAnswer ? 'celebrate' : 'sad') : 'study';
    const correctDisplayIndex = isAnswered && Number.isInteger(game.answer.correct)
      ? toDisplayIndex(questionShuffle, game.answer.correct)
      : -1;
    const selectedDisplayIndex = isAnswered && Number.isInteger(game.answer.selected)
      ? toDisplayIndex(questionShuffle, game.answer.selected)
      : -1;

    return (
      <div className="solo-flow-page solo-quiz-stage">
        {/* Clean Minimal Quiz Header */}
        <header className="solo-quiz-topbar">
          <button
            type="button"
            className="solo-exit-icon-btn exit-game-btn"
            onClick={openExitDialog}
            aria-label="Exit Game"
          >
            <LogOut size={15} />
            <span>Exit</span>
          </button>

          <span className="solo-counter-pill" aria-label={`Question ${game.index + 1} of ${game.total}`}>
            {qNumberLabel}
          </span>

          <span className={`solo-clock-pill quiz-timer ${totalRemainingSeconds <= 30 ? 'urgent' : ''}`}>
            <Clock size={14} />
            <span>{formattedTime}</span>
          </span>
        </header>

        <div className="solo-progress-track" aria-hidden="true">
          <div className="solo-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Stacked Question Card Deck */}
        <div className="solo-deck-wrap">
          {game.index + 2 < game.total && <div className="solo-deck-back layer-2" aria-hidden="true" />}
          {game.index + 1 < game.total && <div className="solo-deck-back layer-1" aria-hidden="true" />}

          <article className="solo-question-card" key={game.index}>
            <div className="solo-card-meta-row">
              <span className="solo-card-topic">{game.topic} · {game.difficulty}</span>
              <span className="solo-card-score">{myMember?.score || 0} pts</span>
            </div>

            <div className="solo-card-hero">
              <div className={`solo-mascot-stage ${isAnswered ? (isCorrectAnswer ? 'is-happy' : 'is-sad') : 'is-thinking'}`}>
                <Mascot pose={mascotPose} size={54} />
              </div>
              <h2 className="solo-card-prompt question-prompt">{game.question?.prompt}</h2>
            </div>

            {/* Clean Minimal Stacked Options */}
            <div className="solo-options-stack answer-options" role="radiogroup" aria-label="Answer choices">
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

            {isAnswered && (
              <div className={`solo-feedback-strip answer-feedback ${isCorrectAnswer ? 'positive' : 'negative'}`}>
                <div className="solo-feedback-top">
                  <strong>
                    {isCorrectAnswer ? 'Spot on! Nicely done.' : 'Not quite — keep going!'}
                  </strong>
                  <span className="solo-pts-chip">
                    +{(game.answer.pointsEarned !== undefined) ? game.answer.pointsEarned : (isCorrectAnswer ? 100 : 0)} pts
                  </span>
                </div>
                {game.answer.explanation && (
                  <p className="solo-feedback-explain">{game.answer.explanation}</p>
                )}
              </div>
            )}
          </article>
        </div>

        {/* Submit / Next / Show Results CTA */}
        <div className="solo-action-footer">
          {!isAnswered ? (
            <button
              type="button"
              className="solo-primary-btn"
              disabled={busy || selectedChoice === null}
              onClick={() => {
                const canonicalChoice = toOriginalIndex(questionShuffle, selectedChoice);
                action('answer', { index: game.index, questionId: game.question?.id, choice: canonicalChoice });
              }}
            >
              <span>{busy ? 'Checking...' : 'Submit Answer'}</span>
            </button>
          ) : (
            <button
              type="button"
              className="solo-primary-btn"
              disabled={busy}
              onClick={() => {
                if (correctDisplayIndex >= 0) recordCorrectPositionMetric(correctDisplayIndex);
                action('next');
              }}
            >
              <span>{isFinalQuestion ? 'Show Results' : 'Next Question'}</span>
              <ArrowRight size={18} />
            </button>
          )}
        </div>

        {/* Lingo-Themed Native <dialog> Exit Confirmation Modal */}
        <dialog
          ref={exitDialogRef}
          className="solo-exit-dialog"
          aria-labelledby="friends-exit-dialog-title"
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
            <h1 id="friends-exit-dialog-title" className="solo-exit-title">Leave this match?</h1>
            <p className="solo-exit-desc">
              Your points and rank in this friends game won’t be saved if you leave now.
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
  // 5. FINISHED / LEADERBOARD SCREEN (Podium + Ranked Accuracy List)
  // =========================================================================
  return (
    <FinishedGame
      game={game}
      user={user}
      action={action}
    />
  );
}
