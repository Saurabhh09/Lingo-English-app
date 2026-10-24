import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  Check,
  Users,
  Sparkles,
  Eye,
  LogOut,
} from 'lucide-react';
import { WaitingLobby } from './WaitingLobby.jsx';
import { CountdownLobby } from './CountdownLobby.jsx';
import { FinishedGame } from './FinishedGame.jsx';
import { PlayerList } from './PlayerList.jsx';
import { SpectatorDashboard } from './SpectatorDashboard.jsx';
import { Mascot } from '../../Art.jsx';

/**
 * GameRoom: Orchestrator component for multiplayer rooms.
 * Transitions between Waiting Lobby, Countdown Lobby, Active Quiz / Spectator Dashboard, and Finished State.
 */
export function GameRoom({
  game,
  user,
  tick,
  busy,
  action,
  copyCode,
}) {
  const [previewCountdown, setPreviewCountdown] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(null);

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
  const formattedTime = totalRemainingSeconds >= 60
    ? `${Math.floor(totalRemainingSeconds / 60)}:${String(totalRemainingSeconds % 60).padStart(2, '0')}`
    : `${totalRemainingSeconds}s`;

  const isCountdown = game.status === 'countdown' || game.status === 'starting' || (game.status === 'waiting' && previewCountdown);

  return (
    <div className="room-page">
      {/* Room Topbar / Breadcrumb & Status */}
      <div className="room-top">
        <button
          className="exit-game-btn"
          aria-label="Exit Game"
          onClick={() => {
            if ((game.status === 'playing' || game.status === 'countdown') && !window.confirm('Are you sure you want to exit the game?')) {
              return;
            }
            action('leave');
          }}
        >
          <LogOut size={15} /> Exit Game
        </button>

        <span className="pill outline">
          <span className="green-dot" />{' '}
          {game.status === 'waiting'
            ? previewCountdown ? 'COUNTDOWN PREVIEW' : 'LIVE LOBBY'
            : (game.status === 'countdown' || game.status === 'starting')
            ? 'COUNTDOWN LOBBY'
            : game.status === 'playing'
            ? isSpectator ? 'SPECTATING MATCH' : 'GAME IN PROGRESS'
            : 'CHALLENGE COMPLETE'}
        </span>
      </div>

      <div className="room-grid">
        {/* Main Room Viewport */}
        {game.status === 'waiting' && !previewCountdown ? (
          <WaitingLobby
            game={game}
            user={user}
            busy={busy}
            action={action}
            copyCode={copyCode}
            onPreviewCountdown={() => setPreviewCountdown(true)}
          />
        ) : isCountdown ? (
          <CountdownLobby
            game={game}
            user={user}
            initialSeconds={10}
            serverDeadline={game.countdownDeadline}
            onCancel={previewCountdown ? () => setPreviewCountdown(false) : null}
          />
        ) : game.status === 'playing' ? (
          isSpectator ? (
            <SpectatorDashboard
              game={game}
              user={user}
              tick={tick}
              busy={busy}
              action={action}
              copyCode={copyCode}
            />
          ) : (myMember?.completed || game.completed) ? (
            <FinishedGame
              game={game}
              user={user}
              action={action}
            />
          ) : (
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
                    Score: <strong>{myMember?.score || 0} pts</strong> · Question {game.index + 1} of {game.total}
                  </span>
                  {game.index + 1 < game.total ? (
                    <button
                      className="button dark next-question-btn"
                      disabled={busy}
                      onClick={() => action('next')}
                      style={{ padding: '8px 16px', fontSize: '12px' }}
                    >
                      Next Question
                    </button>
                  ) : (
                    <button
                      className="button dark next-question-btn"
                      disabled={busy}
                      onClick={() => action('next')}
                      style={{ padding: '8px 16px', fontSize: '12px' }}
                    >
                      View Final Results
                    </button>
                  )}
                </div>
                <small style={{ marginTop: '8px' }}>
                  {game.index + 1 < game.total
                    ? 'Click Next Question when you are ready to continue.'
                    : 'Final question answered! Click to view your results.'}
                </small>
              </div>
            )}
          </section>
          )
        ) : (
          <FinishedGame
            game={game}
            user={user}
            action={action}
          />
        )}

        {/* Sidebar Roster / Live Leaderboard (using PlayerList presentation) */}
        <aside className="room-leaderboard panel">
          <div className="card-heading">
            <h3>{game.status === 'waiting' ? 'Your crew' : 'Live leaderboard'}</h3>
            <Users size={19} />
          </div>

          <PlayerList
            members={game.members || []}
            hostUsername={game.host}
            currentUsername={user.username}
            status={game.status}
            showScores={game.status !== 'waiting'}
          />

          <div className="leaderboard-note">
            <Sparkles size={19} />
            <p>
              {game.status === 'waiting'
                ? 'Good company makes learning a little sweeter.'
                : '100 points per correct answer. Up to 100 speed bonus points. You’ve got this.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
