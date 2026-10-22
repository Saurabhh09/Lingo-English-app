import React from 'react';
import { Crown, Sparkles, User, Loader2, Eye } from 'lucide-react';

/**
 * Reusable PlayerList presentation component for Lingo multiplayer.
 * Deduplicates players by username, handles loading/empty states,
 * and displays host badges, spectator tags, and (you) indicators accurately.
 */
export function PlayerList({
  members = [],
  hostUsername = '',
  currentUsername = '',
  status = 'waiting',
  loading = false,
  emptyMessage = 'No players in the room yet.',
  showScores = false,
}) {
  if (loading) {
    return (
      <div className="player-list-empty" style={{ padding: '24px 0', textAlign: 'center', color: '#7a896d' }}>
        <Loader2 className="spin" size={20} style={{ margin: '0 auto 8px' }} />
        <p style={{ margin: 0, fontSize: '13px' }}>Loading player roster…</p>
      </div>
    );
  }

  // Deduplicate by username while preserving order
  const seen = new Set();
  const dedupedMembers = [];
  for (const m of (members || [])) {
    if (m && m.username && !seen.has(m.username)) {
      seen.add(m.username);
      dedupedMembers.push(m);
    }
  }

  if (dedupedMembers.length === 0) {
    return (
      <div className="player-list-empty" style={{ padding: '20px 0', textAlign: 'center', color: '#88967b' }}>
        <p style={{ margin: 0, fontSize: '13px' }}>{emptyMessage}</p>
      </div>
    );
  }

  // In playing or finished state, place active players by score descending, spectators at bottom
  const sorted = showScores
    ? [...dedupedMembers].sort((a, b) => {
        if (a.role === 'spectator' && b.role !== 'spectator') return 1;
        if (b.role === 'spectator' && a.role !== 'spectator') return -1;
        return (b.score || 0) - (a.score || 0);
      })
    : dedupedMembers;

  let activePlayerRank = 0;

  return (
    <div className="player-list-roster">
      {sorted.map((m, i) => {
        const isHost = m.username === hostUsername;
        const isMe = m.username === currentUsername;
        const isSpectator = m.role === 'spectator';
        if (!isSpectator) activePlayerRank++;
        const rankDisplay = isSpectator ? '👁️' : (activePlayerRank === 1 ? '🏆' : activePlayerRank);

        const initial = (m.name || m.username || '?').slice(0, 1).toUpperCase();
        const colorClass = `avatar-color-${i % 4}`;

        return (
          <div
            className={`player-row player-list-item ${isMe ? 'is-me' : ''} ${isSpectator ? 'is-spectator' : ''}`}
            key={m.username}
          >
            <span className="player-rank">
              {showScores ? rankDisplay : <span className="green-dot" />}
            </span>

            <span className={`avatar player-avatar player-avatar-circle ${colorClass} color-${i % 4}`}>
              {initial}
            </span>

            <div className="player-meta">
              <b>
                {m.name || m.username}
                {isMe && <span className="player-you-tag">(you)</span>}
              </b>
              <span className="player-status-line">
                {isHost && (
                  <span className="player-badge-host">
                    <Crown size={10} /> Host
                  </span>
                )}
                {isSpectator && (
                  <span
                    className="player-badge-spectator"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      background: '#f5f0fb',
                      color: '#5b4773',
                      border: '1px solid #d5cae8',
                      borderRadius: '4px',
                      padding: '1px 5px',
                      fontSize: '10px',
                      fontWeight: 700,
                    }}
                  >
                    <Eye size={10} /> Spectator
                  </span>
                )}
                {!isSpectator && status === 'waiting' && !isHost && 'Ready to play'}
                {isSpectator && status === 'waiting' && 'Observing match'}
                {isSpectator && (status === 'starting' || status === 'countdown') && 'Observing match'}
                {!isSpectator && (status === 'starting' || status === 'countdown') && 'Getting ready'}
                {isSpectator && status === 'playing' && 'Watching players…'}
                {!isSpectator && status === 'playing' && (m.completed ? 'Completed' : (m.answered ? 'Answer locked in' : 'Thinking…'))}
                {status === 'finished' && (isSpectator ? 'Observer' : 'Completed')}
              </span>
            </div>

            {showScores && (
              <strong
                style={{
                  fontSize: isSpectator ? '11.5px' : '15px',
                  color: isSpectator ? '#7a6a8f' : '#27341e',
                  marginLeft: 'auto',
                  fontWeight: isSpectator ? 600 : 700,
                }}
              >
                {isSpectator ? 'Watching' : (m.score ?? 0)}
              </strong>
            )}
          </div>
        );
      })}
    </div>
  );
}
