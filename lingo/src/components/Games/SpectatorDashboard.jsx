import React, { useRef, useState } from 'react';
import {
  Clock,
  Copy,
  Check,
  Users,
  CheckCircle2,
  BookOpen,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import { Mascot } from '../../Art.jsx';

/**
 * SpectatorDashboard: Live Leaderboard & Podium view for Spectator Hosts / Observers.
 * Matches the Friends Leaderboard podium design in Lingo's warm theme without duplicate headers,
 * question prompt cards, or playable options.
 */
export function SpectatorDashboard({
  game,
  user,
  tick,
  action,
  copyCode,
}) {
  const [copied, setCopied] = useState(false);
  const exitDialogRef = useRef(null);

  const clockOffset = (game.serverTime && game.clientReceivedAt)
    ? (game.serverTime - game.clientReceivedAt)
    : 0;
  const currentServerTime = (tick || Date.now()) + clockOffset;
  const totalRemainingSeconds = game.endsAt
    ? Math.max(0, Math.ceil((game.endsAt - currentServerTime) / 1000))
    : 0;
  const formattedTime = `${String(Math.floor(totalRemainingSeconds / 60)).padStart(2, '0')}:${String(totalRemainingSeconds % 60).padStart(2, '0')}`;

  // Sort active players live by score descending, then accuracy
  const activeSorted = [...(game.members || [])]
    .filter(m => m.role !== 'spectator')
    .sort((a, b) => (b.score || 0) - (a.score || 0) || (b.stats?.accuracy || 0) - (a.stats?.accuracy || 0));

  const completedCount = activeSorted.filter(m => m.completed).length;
  const totalActive = activeSorted.length;

  const first = activeSorted[0] || null;
  const second = activeSorted[1] || null;
  const third = activeSorted[2] || null;

  const avatarColorFor = idx => ['#fef08a', '#dbeafe', '#fed7aa', '#dcfce7', '#f3e8ff'][idx % 5];

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

  const handleCopyCode = async () => {
    if (copyCode) await copyCode();
    else if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(game.code); } catch { }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="solo-flow-page friends-leaderboard-page spectator-dashboard">
      {/* Clean Single Topbar */}
      <header className="solo-quiz-topbar">
        <button
          type="button"
          className="solo-exit-icon-btn exit-game-btn"
          onClick={openExitDialog}
          aria-label="Exit Game"
        >
          <LogOut size={15} />
          <span>Exit Game</span>
        </button>

        <span className="friends-live-lobby-pill">
          <span className="green-dot" />
          <span>LIVE LEADERBOARD</span>
        </span>

        <span className={`solo-clock-pill quiz-timer ${totalRemainingSeconds <= 30 ? 'urgent' : ''}`}>
          <Clock size={14} />
          <span>{formattedTime}</span>
        </span>
      </header>

      {/* Match Title & Copyable Room Code */}
      <div className="friends-lb-header">
        <div>
          <h2 className="friends-lb-title">Live Leaderboard</h2>
          <p className="friends-lb-subtitle">
            {game.topic} · {game.difficulty}
          </p>
        </div>

        <button
          type="button"
          className="spectator-room-pill"
          onClick={handleCopyCode}
          aria-label="Copy room code"
        >
          <span>ROOM</span>
          <strong>{game.code}</strong>
          {copied ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
        </button>
      </div>

      {/* Live Top-3 3D Podium Showcase */}
      <section className="friends-podium-stage" aria-label="Live top three podium">
        <div className="friends-podium-sunburst" aria-hidden="true" />

        {/* Rank 2 - Left */}
        <div className="friends-podium-col rank-2">
          {second ? (
            <>
              <div className="friends-podium-avatar-box" style={{ background: '#e0f2fe', borderColor: '#93c5fd' }}>
                <span>{(second.name || second.username || '?').slice(0, 1).toUpperCase()}</span>
              </div>
              <span className="friends-podium-name">{second.name || second.username}</span>
              <span className="friends-podium-pts">⚡ {second.score || 0}</span>
              <span className="friends-podium-acc">{second.stats?.accuracy ?? 0}% acc</span>
            </>
          ) : (
            <span className="friends-podium-empty">—</span>
          )}
          <div className="friends-pillar p2">
            <div className="friends-pillar-cap" />
            <span className="friends-pillar-num">2</span>
          </div>
        </div>

        {/* Rank 1 - Center */}
        <div className="friends-podium-col rank-1">
          {first ? (
            <>
              <div className="friends-podium-avatar-box is-winner" style={{ background: '#fef3c7', borderColor: '#fbbf24' }}>
                <span className="friends-winner-crown" aria-hidden="true">👑</span>
                <span>{(first.name || first.username || '?').slice(0, 1).toUpperCase()}</span>
              </div>
              <span className="friends-podium-name">{first.name || first.username}</span>
              <span className="friends-podium-pts winner">⚡ {first.score || 0}</span>
              <span className="friends-podium-acc">{first.stats?.accuracy ?? 0}% acc</span>
            </>
          ) : (
            <span className="friends-podium-empty">—</span>
          )}
          <div className="friends-pillar p1">
            <div className="friends-pillar-cap" />
            <span className="friends-pillar-num">1</span>
          </div>
        </div>

        {/* Rank 3 - Right */}
        <div className="friends-podium-col rank-3">
          {third ? (
            <>
              <div className="friends-podium-avatar-box" style={{ background: '#ffedd5', borderColor: '#fdba74' }}>
                <span>{(third.name || third.username || '?').slice(0, 1).toUpperCase()}</span>
              </div>
              <span className="friends-podium-name">{third.name || third.username}</span>
              <span className="friends-podium-pts">⚡ {third.score || 0}</span>
              <span className="friends-podium-acc">{third.stats?.accuracy ?? 0}% acc</span>
            </>
          ) : (
            <span className="friends-podium-empty">—</span>
          )}
          <div className="friends-pillar p3">
            <div className="friends-pillar-cap" />
            <span className="friends-pillar-num">3</span>
          </div>
        </div>
      </section>

      {/* Match Progress Metrics */}
      <section className="friends-my-metrics-grid cols-3" aria-label="Live match progress">
        <div className="friends-metric-box acc">
          <Users size={15} />
          <strong>{totalActive}</strong>
          <span>Players</span>
        </div>
        <div className="friends-metric-box corr">
          <CheckCircle2 size={15} />
          <strong>{completedCount}/{totalActive}</strong>
          <span>Finished</span>
        </div>
        <div className="friends-metric-box rank">
          <BookOpen size={15} />
          <strong>{game.total}</strong>
          <span>Questions</span>
        </div>
      </section>

      {/* Ranked Player Standings & Live Progress List */}
      <section className="friends-standings-card">
        <div className="friends-standings-head">
          <span>LIVE STANDINGS &amp; ACCURACY</span>
          <span>{totalActive} {totalActive === 1 ? 'competitor' : 'competitors'}</span>
        </div>

        <div className="friends-standings-list">
          {activeSorted.length === 0 ? (
            <div className="friends-standings-hint">
              No active competitors yet. Share room code <strong>{game.code}</strong> so players can join!
            </div>
          ) : (
            activeSorted.map((m, idx) => {
              const mStats = m.stats || {};
              const acc = mStats.accuracy ?? 0;
              const corr = mStats.correct ?? 0;
              const qNum = Math.min((m.index ?? 0) + 1, game.total);
              const progressLabel = m.completed
                ? 'Completed'
                : m.answered
                  ? `Q${qNum}/${game.total} · Answered`
                  : `Q${qNum}/${game.total} · Playing`;

              return (
                <div key={m.username || idx} className="friends-rank-row">
                  <span className="friends-rank-num">{idx + 1}</span>
                  <div className="friends-rank-avatar" style={{ background: avatarColorFor(idx) }}>
                    {(m.name || m.username || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="friends-rank-info">
                    <div className="friends-rank-name-row">
                      <b>{m.name || m.username}</b>
                    </div>
                    <span className="friends-rank-sub">
                      {acc}% accuracy · {corr}/{game.total} correct · {progressLabel}
                    </span>
                  </div>
                  <div className="friends-rank-score">
                    <strong>{m.score || 0}</strong>
                    <span>pts</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Lingo-Themed Native <dialog> Exit Confirmation Modal */}
      <dialog
        ref={exitDialogRef}
        className="solo-exit-dialog"
        aria-labelledby="spectator-exit-dialog-title"
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
          <h1 id="spectator-exit-dialog-title" className="solo-exit-title">Leave live leaderboard?</h1>
          <p className="solo-exit-desc">
            You’ll step out of observing this match. Players can still keep finishing their questions.
          </p>
          <div className="confirm-leave-actions">
            <button
              type="button"
              autoFocus
              className="button primary full-width"
              onClick={closeExitDialog}
            >
              Keep watching
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
