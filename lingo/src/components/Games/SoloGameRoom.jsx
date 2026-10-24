import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  Check,
  Sparkles,
  Zap,
  Target,
  Trophy,
  BookOpen,
  Leaf,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { Mascot } from '../../Art.jsx';

/**
 * SoloGameRoom: Dedicated, self-contained flow for Solo Mode gameplay.
 * Renders Solo 10s pre-game countdown, active solo quiz, and solo completion results.
 * Completely decoupled from multiplayer rooms, codes, and lobbies.
 */
export function SoloGameRoom({
  game,
  user,
  tick,
  busy,
  action,
}) {
  // Pre-game countdown derivation (server deadline authoritative)
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [selectedChoice, setSelectedChoice] = useState(null);

  useEffect(() => {
    setSelectedChoice(null);
  }, [game?.index]);

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

  // Derive total game time remaining during active quiz
  const clockOffset = (game.serverTime && game.clientReceivedAt)
    ? (game.serverTime - game.clientReceivedAt)
    : 0;
  const currentServerTime = (tick || Date.now()) + clockOffset;
  const totalRemainingSeconds = game.endsAt
    ? Math.max(0, Math.ceil((game.endsAt - currentServerTime) / 1000))
    : 0;
  const formattedTime = totalRemainingSeconds >= 60
    ? `${Math.floor(totalRemainingSeconds / 60)}:${String(totalRemainingSeconds % 60).padStart(2, '0')}`
    : `${totalRemainingSeconds}s`;

  return (
    <div className="room-page solo-game-page">
      {/* Top Navigation & Status Pill */}
      <div className="room-top">
        <button
          className="exit-game-btn"
          aria-label="Exit Game"
          onClick={() => {
            if (game.status === 'playing' && !window.confirm('Are you sure you want to exit this challenge? Progress will not be saved.')) {
              return;
            }
            action('leave');
          }}
        >
          <LogOut size={15} /> Exit Game
        </button>

        <span className="pill outline">
          <span className="green-dot" />{' '}
          {game.status === 'countdown'
            ? 'STARTING SOON'
            : game.status === 'playing'
            ? 'SOLO CHALLENGE IN PROGRESS'
            : 'CHALLENGE COMPLETE'}
        </span>
      </div>

      <div className="room-grid">
        {/* Main Viewport */}
        {game.status === 'countdown' ? (
          <section className="room-main panel countdown-overlay-card solo-countdown-panel">
            <div className="countdown-badge-pill" role="status">
              <Sparkles size={14} />
              <span>GETTING READY · SOLO CHALLENGE</span>
            </div>

            <h2 style={{ fontSize: '32px', margin: '4px 0 0', color: '#2b2338' }}>
              Starting in
            </h2>

            {/* Prominent 10s Countdown Display */}
            <div
              className="countdown-ring-container"
              aria-live="polite"
              aria-atomic="true"
              aria-label={`Starting in ${secondsLeft} seconds`}
            >
              <span className={`countdown-number ${secondsLeft <= 0 ? 'is-start' : ''}`}>
                {secondsLeft > 0 ? secondsLeft : 'Start'}
              </span>
            </div>

            <p className="countdown-subtext">
              Sharpen your mind and take a breath. Your personal English challenge is loading!
            </p>

            {/* Preserved Configuration Summary */}
            <div className="room-settings room-settings-bar" style={{ marginTop: '14px' }}>
              <span><Leaf size={15} />{game.difficulty}</span>
              <span><BookOpen size={15} />{game.topic}</span>
              <span><Clock size={15} />{game.duration} min limit</span>
              <span><Target size={15} />{game.total} questions</span>
            </div>

            <span className="room-hint" style={{ marginTop: '20px' }}>
              No waiting or room codes needed. Your round begins automatically.
            </span>
          </section>
        ) : game.status === 'playing' ? (
          <section className="room-main panel gameplay-card">
            <div className="quiz-topline">
              <span className="eyebrow">QUESTION {game.index + 1} OF {game.total}</span>
              <span className={`quiz-timer ${totalRemainingSeconds <= 30 ? 'urgent' : ''}`}>
                <Clock size={16} /> {formattedTime}
              </span>
            </div>

            <div className="progress-track quiz-progress">
              <i style={{ width: `${((game.index + 1) / game.total) * 100}%` }} />
            </div>

            <div className="gameplay-prompt-area">
              <div className="question-category">
                <span>✨</span> {game.topic} · {game.difficulty}
              </div>

              <div className="gameplay-mascot-container" aria-hidden="true">
                <Mascot
                  pose={
                    game.answer
                      ? (game.answer.isCorrect || game.answer.selected === game.answer.correct ? 'celebrate' : 'cheer')
                      : 'listen'
                  }
                  size={80}
                  className="gameplay-mascot"
                />
              </div>

              <h2 className="question-prompt">{game.question?.prompt}</h2>
            </div>

            <div className="answer-options">
              {(game.question?.options || []).map((o, i) => {
                let btnClass = '';
                if (game.answer) {
                  if (i === game.answer.correct) btnClass = 'correct';
                  else if (i === game.answer.selected) btnClass = 'incorrect';
                  else btnClass = 'muted-answer';
                } else if (i === selectedChoice) {
                  btnClass = 'selected';
                }

                return (
                  <button
                    key={`${game.index}-${i}`}
                    disabled={busy || !!game.answer}
                    onClick={() => {
                      if (!game.answer) setSelectedChoice(i);
                    }}
                    className={btnClass}
                  >
                    <span>{String.fromCharCode(65 + i)}</span>
                    <span className="option-text">{o}</span>
                    {game.answer && i === game.answer.correct && <Check size={20} className="option-check-icon" />}
                  </button>
                );
              })}
            </div>

            {!game.answer && (
              <div className="answer-submit-bar" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  className="button primary submit-answer-btn"
                  disabled={busy || selectedChoice === null}
                  onClick={() => action('answer', { index: game.index, questionId: game.question?.id, choice: selectedChoice })}
                  style={{ minWidth: '150px' }}
                >
                  {busy ? 'Evaluating…' : 'Submit Answer'}
                </button>
                <span className="quiz-bottom-hint" style={{ margin: 0 }}>
                  {selectedChoice === null
                    ? 'Pick an option. Faster correct answers earn bonus points.'
                    : 'Choice selected. Click Submit Answer to verify.'}
                </span>
              </div>
            )}

            {game.answer && (
              <div
                className={`answer-feedback ${
                  game.answer.isCorrect || game.answer.selected === game.answer.correct ? 'positive' : 'negative'
                }`}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <b>
                    {game.answer.isCorrect || game.answer.selected === game.answer.correct
                      ? 'A little win! Nicely done.'
                      : 'A little lesson. You’ve got the next one.'}
                  </b>
                  <span className="answer-points-badge" style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '8px',
                    background: (game.answer.isCorrect || game.answer.selected === game.answer.correct) ? '#e0efd0' : '#faebd7',
                    color: (game.answer.isCorrect || game.answer.selected === game.answer.correct) ? '#38571e' : '#8c5324'
                  }}>
                    +{(game.answer.pointsEarned !== undefined) ? game.answer.pointsEarned : (game.answer.selected === game.answer.correct ? 100 : 0)} pts
                  </span>
                </div>
                <p>{game.answer.explanation}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: '11px', color: '#68775c' }}>
                    Score: <strong>{game.score || 0} pts</strong> · Question {game.index + 1} of {game.total}
                  </span>
                  {game.index + 1 < game.total && (
                    <button
                      className="button dark next-question-btn"
                      disabled={busy}
                      onClick={() => action('next')}
                      style={{ padding: '8px 16px', fontSize: '12px' }}
                    >
                      Next Question
                    </button>
                  )}
                </div>
                <small style={{ marginTop: '8px' }}>
                  {game.index + 1 < game.total
                    ? 'Click Next Question when you are ready to continue.'
                    : 'Final question complete! Preparing results…'}
                </small>
              </div>
            )}
          </section>
        ) : (
          <section className="room-main panel finished-game-view">
            <div className="celebration" aria-hidden="true">
              <span>✦</span>
              <Trophy size={62} />
              <span>✧</span>
            </div>

            <span className="eyebrow">SOLO PRACTICE · COMPLETE</span>
            <h2>That was a little brilliant.</h2>
            <p style={{ maxWidth: '420px', color: '#68775c', margin: '0 auto' }}>
              You completed your solo challenge! Consistent practice is how mastery is built.
            </p>

            <div className="result-card-banner">
              <div className="result-score">
                <strong>{game.score || 0}</strong>
                <span>your points</span>
              </div>
              <p className="result-winner" style={{ margin: '8px 0 0', fontWeight: 600, color: '#3f522f' }}>
                🎯 Finished {game.total} questions in {game.duration} min limit!
              </p>
            </div>

            {/* Solo Stats Breakdown */}
            <div className="results-stats-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              width: '100%',
              maxWidth: '440px',
              margin: '14px auto'
            }}>
              <div className="stat-pill" style={{ background: '#f6f9f0', border: '1px solid #e1e9d5', borderRadius: '10px', padding: '10px 8px', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: '#7a896d', fontWeight: 600, textTransform: 'uppercase' }}>Accuracy</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#314422' }}>{game.stats?.accuracy ?? 0}%</div>
              </div>
              <div className="stat-pill" style={{ background: '#f6f9f0', border: '1px solid #e1e9d5', borderRadius: '10px', padding: '10px 8px', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: '#7a896d', fontWeight: 600, textTransform: 'uppercase' }}>Correct</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#43682b' }}>{game.stats?.correct ?? 0}/{game.total}</div>
              </div>
              <div className="stat-pill" style={{ background: '#f6f9f0', border: '1px solid #e1e9d5', borderRadius: '10px', padding: '10px 8px', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: '#7a896d', fontWeight: 600, textTransform: 'uppercase' }}>Timeouts</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#887258' }}>{game.stats?.timedOut ?? 0}</div>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
              <button
                className="exit-game-btn"
                onClick={() => action('leave')}
              >
                <LogOut size={15} /> Exit Game
              </button>
            </div>
          </section>
        )}

        {/* Solo Sidebar: Personal Challenge Dashboard */}
        <aside className="room-leaderboard panel solo-sidebar">
          <div className="card-heading">
            <h3>Your challenge</h3>
            <Zap size={19} />
          </div>

          <div className="solo-stats-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <div style={{ background: '#f9faf5', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e7ede0' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7a896d', fontWeight: 600 }}>
                Score
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#2c3e1e', marginTop: '2px' }}>
                {game.score || 0} <small style={{ fontSize: '13px', fontWeight: 600, color: '#6f825e' }}>pts</small>
              </div>
            </div>

            <div style={{ background: '#f9faf5', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e7ede0' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7a896d', fontWeight: 600 }}>
                Progress
              </span>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#2c3e1e', marginTop: '2px' }}>
                Question {Math.min(game.total, game.index + 1)} of {game.total}
              </div>
            </div>

            <div style={{ background: '#f9faf5', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e7ede0' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7a896d', fontWeight: 600 }}>
                Target
              </span>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#4d5d3e', marginTop: '2px' }}>
                {game.topic} · {game.difficulty}
              </div>
            </div>
          </div>

          <div className="leaderboard-note" style={{ marginTop: '20px' }}>
            <Sparkles size={19} />
            <p>
              100 points per correct answer. Speed bonus up to 100 points. You’ve got this!
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
