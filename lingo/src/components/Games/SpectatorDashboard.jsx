import React from 'react';
import {
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Users,
  Sparkles,
  Loader2,
  Crown,
  LogOut,
} from 'lucide-react';

/**
 * SpectatorDashboard: Dedicated UI for spectator-hosts and non-host spectators.
 * Displays real-time match state, question prompts, total game time remaining,
 * independent active player progress, and live leaderboard.
 * Never renders playable answer options, round countdowns, or question progression controls.
 */
export function SpectatorDashboard({
  game,
  user,
  tick,
  busy,
  action,
  copyCode,
}) {
  const isHost = game.host === user.username;

  // Derive total game time remaining
  const clockOffset = (game.serverTime && game.clientReceivedAt)
    ? (game.serverTime - game.clientReceivedAt)
    : 0;
  const currentServerTime = (tick || Date.now()) + clockOffset;

  const totalRemainingSeconds = game.endsAt
    ? Math.max(0, Math.ceil((game.endsAt - currentServerTime) / 1000))
    : 0;
  const formattedTotalTime = totalRemainingSeconds >= 60
    ? `${Math.floor(totalRemainingSeconds / 60)}:${String(totalRemainingSeconds % 60).padStart(2, '0')}`
    : `${totalRemainingSeconds}s`;

  // Active players (excluding spectators)
  const allMembers = game.members || [];
  const activePlayers = allMembers.filter(m => m.role !== 'spectator');
  const completedCount = activePlayers.filter(m => m.completed).length;
  const totalActive = activePlayers.length;
  const completedPercent = totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0;

  return (
    <section className="room-main panel spectator-dashboard">
      {/* Spectator Header Bar */}
      <div className="spectator-header-bar">
        <div className="spectator-identity">
          <span className="spectator-icon-badge">
            <Eye size={18} />
          </span>
          <div>
            <div className="spectator-title-row">
              <span className="eyebrow">SPECTATOR DASHBOARD</span>
              {isHost && (
                <span className="host-pill-badge">
                  <Crown size={11} /> Host
                </span>
              )}
            </div>
            <h3>
              {isHost ? 'Spectator Host Control Center' : 'Live Match Observer'}
            </h3>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="spectator-room-tag">
            <span className="room-code-label">ROOM</span>
            <span className="room-code-val">{game.code}</span>
            {copyCode && (
              <button
                className="icon-button small copy-code-btn"
                onClick={copyCode}
                title="Copy Room Code"
                aria-label="Copy Room Code"
              >
                <Copy size={13} />
              </button>
            )}
          </div>
          <button
            className="exit-game-btn small"
            type="button"
            aria-label="Exit Game"
            onClick={() => {
              if (window.confirm('Are you sure you want to exit the game?')) {
                action('leave');
              }
            }}
          >
            <LogOut size={13} /> Exit Game
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="spectator-mode-banner">
        <Eye size={16} />
        <span>
          <strong>Spectator Mode:</strong> You are observing this round. Live scores and player progress update in real time.
        </span>
      </div>

      {/* Topline Question & Timer Status */}
      <div className="quiz-topline">
        <span className="eyebrow">
          QUESTION SET · {game.total} QUESTIONS
        </span>
        <div className="spectator-timers">
          <span
            className={`quiz-timer ${totalRemainingSeconds <= 30 ? 'urgent' : ''}`}
            title="Total game time remaining"
          >
            <Clock size={16} /> {formattedTotalTime}
          </span>
        </div>
      </div>

      {/* Category / Topic */}
      <div className="question-category">
        <span>✨</span> {game.topic} · {game.cefrLevel || game.difficulty}
      </div>

      {/* Question Prompt (Display for spectators - NO playable answer options) */}
      <div className="spectator-prompt-card">
        <span className="spectator-card-label">CURRENT QUESTION PROMPT</span>
        <h2 className="question-prompt">{game.question?.prompt}</h2>
        <p className="spectator-prompt-subtext">
          Players are choosing their answers from multiple options at their own pace. Answer submission is disabled for spectators.
        </p>
      </div>

      {/* Active Player Progress Card */}
      <div className="spectator-player-progress-card">
        <div className="progress-card-header">
          <div className="progress-header-left">
            <Users size={16} />
            <h4>Active Player Status</h4>
          </div>
          <span className="progress-count-pill">
            {completedCount} / {totalActive} Finished
          </span>
        </div>

        {/* Mini progress bar */}
        <div className="progress-track" style={{ height: '6px', margin: '8px 0 14px' }}>
          <i
            style={{
              width: `${completedPercent}%`,
              background: completedCount === totalActive ? '#689f38' : '#7cb342',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Active Player List Roster */}
        <div className="spectator-player-roster">
          {activePlayers.length === 0 ? (
            <p className="spectator-empty-text">No active competitors in this room.</p>
          ) : (
            activePlayers.map((player, idx) => {
              const isCompleted = !!player.completed;
              const hasAnswered = !!player.answered;
              const pIndex = Math.min((player.index ?? 0) + 1, game.total);

              let statusClass = 'thinking';
              let statusText = `Question ${pIndex} (Thinking…)`;
              let StatusIcon = Loader2;

              if (isCompleted) {
                statusClass = 'answered';
                statusText = 'Completed all questions';
                StatusIcon = CheckCircle2;
              } else if (hasAnswered) {
                statusClass = 'answered';
                statusText = `Question ${pIndex} (Answer locked in)`;
                StatusIcon = CheckCircle2;
              }

              return (
                <div key={player.username || idx} className={`spectator-player-row ${statusClass}`}>
                  <div className="player-row-main">
                    <span className={`avatar player-avatar small color-${idx % 4}`}>
                      {(player.name || player.username || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <div className="player-name-wrap">
                      <strong className="player-name">{player.name || player.username}</strong>
                      {player.username === game.host && (
                        <span className="player-badge-host-mini">
                          <Crown size={9} /> Host
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="player-row-status">
                    <span className={`status-pill ${statusClass}`}>
                      <StatusIcon size={12} className={statusClass === 'thinking' ? 'spin' : ''} />
                      {statusText}
                    </span>
                    <span className="player-score-tag">{player.score || 0} pts</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Match Status Section */}
      <div className="spectator-action-section">
        <div className="round-waiting-alert" style={{ background: '#f8faf5', borderColor: '#e4ecdb', color: '#526640' }}>
          <Clock size={16} />
          <span>
            {completedCount === totalActive && totalActive > 0
              ? 'All active players have finished their questions! Finalizing match results…'
              : 'Players progress independently through their questions. Live scores update in real time until the match concludes.'}
          </span>
        </div>
      </div>
    </section>
  );
}
