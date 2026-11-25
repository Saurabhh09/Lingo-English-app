import React from 'react';
import { Trophy, Clock, Target, CheckCircle2, Timer, ArrowRight, Zap } from 'lucide-react';

/**
 * FinishedGame: Redesigned Friends Mode Leaderboard & Podium Results Screen.
 * Follows the Top-3 Podium + Ranked List reference adapted cleanly into Lingo's cream/green/gold theme,
 * while highlighting accuracy, correct counts, timeouts, and live standing status.
 */
export function FinishedGame({
  game,
  user,
  action,
}) {
  const activeSorted = [...(game.members || [])]
    .filter(m => m.role !== 'spectator')
    .sort((a, b) => (b.score || 0) - (a.score || 0) || (b.stats?.accuracy || 0) - (a.stats?.accuracy || 0));

  const mine = game.members?.find(m => m.username === user.username);
  const isSpectator = mine?.role === 'spectator';
  const myRank = !isSpectator ? activeSorted.findIndex(m => m.username === user.username) + 1 : null;
  const stats = mine?.stats || game.stats || {
    correct: 0,
    incorrect: 0,
    timedOut: 0,
    answered: 0,
    accuracy: 0,
    total: game.total || 0
  };

  const first = activeSorted[0] || null;
  const second = activeSorted[1] || null;
  const third = activeSorted[2] || null;
  const remainingPlayers = activeSorted.slice(3);

  const avatarColorFor = idx => ['#fef08a', '#dbeafe', '#fed7aa', '#dcfce7', '#f3e8ff'][idx % 5];

  return (
    <div className="solo-flow-page friends-leaderboard-page">
      {/* Header */}
      <header className="friends-lb-header">
        <div>
          <span className="friends-lb-status-pill">
            {game.status === 'playing' ? '● LIVE STANDINGS' : '★ FINAL LEADERBOARD'}
          </span>
          <h2 className="friends-lb-title">Leaderboard</h2>
          <p className="friends-lb-subtitle">
            {game.topic} · {game.difficulty}
          </p>
        </div>

        {/* Hidden/Clean Score Hook preserving .result-score strong for existing assertions */}
        <div className="friends-my-score-badge result-score">
          <Zap size={15} fill="currentColor" />
          <div>
            <strong>{isSpectator ? '0' : (mine?.score || 0)}</strong>
            <span>pts</span>
          </div>
        </div>
      </header>

      {game.status === 'playing' && (
        <div className="friends-live-wait-pill">
          <Clock size={14} />
          <span>You finished! Standings refresh automatically as others complete.</span>
        </div>
      )}

      {/* Top 3 3D Podium Showcase (2nd Left · 1st Center · 3rd Right) */}
      <section className="friends-podium-stage" aria-label="Top three players podium">
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

      {/* Personal Performance Details Strip (Rank, Accuracy, Correct, Timeouts) */}
      {!isSpectator && (
        <section className="friends-my-metrics-grid" aria-label="Your match summary">
          <div className="friends-metric-box rank">
            <Trophy size={15} />
            <strong>{myRank ? `#${myRank}` : '-'}</strong>
            <span>Your Rank</span>
          </div>
          <div className="friends-metric-box acc">
            <Target size={15} />
            <strong>{stats.accuracy ?? 0}%</strong>
            <span>Accuracy</span>
          </div>
          <div className="friends-metric-box corr">
            <CheckCircle2 size={15} />
            <strong>{stats.correct ?? 0}/{game.total}</strong>
            <span>Correct</span>
          </div>
          <div className="friends-metric-box tout">
            <Timer size={15} />
            <strong>{stats.timedOut ?? 0}</strong>
            <span>Timeouts</span>
          </div>
        </section>
      )}

      {/* Ranked Player Breakdown Rows (Rank 4+ highlighted, plus full accuracy per player) */}
      <section className="friends-standings-card">
        <div className="friends-standings-head">
          <span>MATCH STANDINGS &amp; ACCURACY</span>
          <span>{activeSorted.length} {activeSorted.length === 1 ? 'player' : 'players'}</span>
        </div>

        <div className="friends-standings-list">
          {activeSorted.map((m, idx) => {
            const isMe = m.username === user.username;
            const isHost = m.username === game.host;
            const mStats = m.stats || {};
            const acc = mStats.accuracy ?? 0;
            const corr = mStats.correct ?? 0;
            return (
              <div key={m.username} className={`friends-rank-row ${isMe ? 'is-me' : ''} ${idx >= 3 ? 'is-challenger' : ''}`}>
                <span className="friends-rank-num">{idx + 1}</span>
                <div className="friends-rank-avatar" style={{ background: avatarColorFor(idx) }}>
                  {(m.name || m.username || '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="friends-rank-info">
                  <div className="friends-rank-name-row">
                    <b>{m.name || m.username}</b>
                    {isMe && <span className="friends-mini-tag me">You</span>}
                    {isHost && <span className="friends-mini-tag host">Host</span>}
                  </div>
                  <span className="friends-rank-sub">
                    {acc}% accuracy · {corr}/{game.total} correct · {m.completed ? 'Finished' : `Q${Math.min(game.total, (m.index || 0) + 1)}`}
                  </span>
                </div>
                <div className="friends-rank-score">
                  <strong>{m.score || 0}</strong>
                  <span>pts</span>
                </div>
              </div>
            );
          })}

          {remainingPlayers.length === 0 && activeSorted.length < 3 && (
            <div className="friends-standings-hint">
              Share your room code with more friends to fill all 3 podium spots!
            </div>
          )}
        </div>
      </section>

      {/* Primary Action */}
      <button
        type="button"
        className="solo-primary-btn"
        onClick={() => action('leave')}
      >
        <span>Back to Play</span>
        <ArrowRight size={18} />
      </button>
    </div>
  );
}
