import React from 'react';
import { Crown, Sparkles, User, Loader2 } from 'lucide-react';

/**
 * Reusable PlayerList presentation component for Lingo multiplayer.
 * Deduplicates players by username, handles loading/empty states,
 * and displays host badges and (you) indicators accurately.
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

  // In playing or finished state, sort by score descending if scores are shown
  const sorted = showScores
    ? [...dedupedMembers].sort((a, b) => (b.score || 0) - (a.score || 0))
    : dedupedMembers;

  return (
    <div className="player-list-roster">
      {sorted.map((m, i) => {
        const isHost = m.username === hostUsername;
        const isMe = m.username === currentUsername;
        const initial = (m.name || m.username || '?').slice(0, 1).toUpperCase();
        const colorClass = `avatar-color-${i % 4}`;

        return (
          <div
            className={`player-row player-list-item ${isMe ? 'is-me' : ''}`}
            key={m.username}
          >
            <span className="player-rank">
              {showScores ? (
                i === 0 ? '🏆' : (i + 1)
              ) : (
                <span className="green-dot" />
              )}
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
                {status === 'waiting' && !isHost && 'Ready to play'}
                {(status === 'starting' || status === 'countdown') && 'Getting ready'}
                {status === 'playing' && (m.answered ? 'Answer locked in' : 'Thinking…')}
                {status === 'finished' && (isHost ? '' : 'Completed')}
              </span>
            </div>

            {showScores && (
              <strong style={{ fontSize: '15px', color: '#27341e', marginLeft: 'auto' }}>
                {m.score ?? 0}
              </strong>
            )}
          </div>
        );
      })}
    </div>
  );
}
