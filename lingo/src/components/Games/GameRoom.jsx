import React, { useState } from 'react';
import {
  ArrowLeft,
  Clock,
  Check,
  Users,
  Sparkles,
} from 'lucide-react';
import { WaitingLobby } from './WaitingLobby.jsx';
import { CountdownLobby } from './CountdownLobby.jsx';
import { FinishedGame } from './FinishedGame.jsx';
import { PlayerList } from './PlayerList.jsx';

/**
 * GameRoom: Orchestrator component for multiplayer rooms.
 * Transitions between Waiting Lobby, Countdown Lobby, Active Quiz, and Finished State.
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

  // Derive time remaining for active quiz question
  const time = Math.max(
    0,
    Math.ceil(
      (game.roundEnd - (tick + (game.serverTime - (game.clientReceivedAt || game.serverTime)))) / 1000
    )
  );

  const isCountdown = game.status === 'countdown' || game.status === 'starting' || (game.status === 'waiting' && previewCountdown);

  return (
    <div className="room-page">
      {/* Room Topbar / Breadcrumb & Status */}
      <div className="room-top">
        <button
          className="text-button"
          onClick={() => {
            if (game.status !== 'playing' || window.confirm('Leave this game?')) {
              action('leave');
            }
          }}
        >
          <ArrowLeft size={16} /> {game.status === 'finished' ? 'Back to games' : 'Leave room'}
        </button>

        <span className="pill outline">
          <span className="green-dot" />{' '}
          {game.status === 'waiting'
            ? previewCountdown ? 'COUNTDOWN PREVIEW' : 'LIVE LOBBY'
            : (game.status === 'countdown' || game.status === 'starting')
            ? 'COUNTDOWN LOBBY'
            : game.status === 'playing'
            ? 'GAME IN PROGRESS'
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
          <section className="room-main panel">
            <div className="quiz-topline">
              <span className="eyebrow">QUESTION {game.index + 1} OF {game.total}</span>
              <span className={`quiz-timer ${time <= 5 ? 'urgent' : ''}`}>
                <Clock size={17} />{time}s
              </span>
            </div>

            <div className="progress-track quiz-progress">
              <i style={{ width: `${((game.index + 1) / game.total) * 100}%` }} />
            </div>

            <div className="question-category">
              <span>✨</span> {game.topic} · {game.difficulty}
            </div>

            <h2 className="question-prompt">{game.question.prompt}</h2>

            <div className="answer-options">
              {game.question.options.map((o, i) => {
                let btnClass = '';
                if (game.answer) {
                  if (i === game.answer.correct) btnClass = 'correct';
                  else if (i === game.answer.selected) btnClass = 'incorrect';
                  else btnClass = 'muted-answer';
                }

                return (
                  <button
                    key={`${game.index}-${i}`}
                    disabled={busy || !!game.answer}
                    onClick={() => action('answer', { index: game.index, choice: i })}
                    className={btnClass}
                  >
                    <span>{String.fromCharCode(65 + i)}</span>
                    {o}
                    {game.answer && i === game.answer.correct && <Check size={19} />}
                  </button>
                );
              })}
            </div>

            {game.answer ? (
              <div
                className={`answer-feedback ${
                  game.answer.selected === game.answer.correct ? 'positive' : 'negative'
                }`}
              >
                <b>
                  {game.answer.selected === game.answer.correct
                    ? 'A little win! Nicely done.'
                    : 'A little lesson. You’ve got the next one.'}
                </b>
                <p>{game.answer.explanation}</p>
                <small>Next question starts automatically…</small>
              </div>
            ) : (
              <p className="quiz-bottom-hint">
                Pick an answer. Faster correct answers earn bonus points.
              </p>
            )}
          </section>
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
