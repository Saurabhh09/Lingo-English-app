import React, { useState } from 'react';
import { Copy, Share2, Play, Users, Clock, BookOpen, Leaf, Plus, Loader2, Check } from 'lucide-react';
import { PlayerList } from './PlayerList.jsx';

/**
 * WaitingLobby presentation component for Lingo multiplayer room lobby.
 * Displays room code, share action, roster, host start controls, and room settings.
 */
export function WaitingLobby({
  game,
  user,
  busy,
  action,
  copyCode,
  onPreviewCountdown,
}) {
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const host = game.host === user.username;
  const allMembers = game.members || [];
  const activeMembers = allMembers.filter(m => m.role !== 'spectator');
  const spectatorMembers = allMembers.filter(m => m.role === 'spectator');
  const activeCount = activeMembers.length;
  const spectatorCount = spectatorMembers.length;
  const maxPlayers = game.maxPlayers || 100;
  const memberCount = allMembers.length;

  async function handleCopy() {
    if (copyCode) {
      await copyCode();
    } else if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(game.code);
      } catch {
        // Fallback handled gracefully
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  async function handleShare() {
    const shareData = {
      title: 'Join my English Game on Lingo!',
      text: `Join my English challenge on Lingo! Use room code: ${game.code}`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
        return;
      }
    }
    // Fallback: Copy invite link/code
    handleCopy();
  }

  return (
    <div className="room-main panel room-waiting">
      <span className="room-emoji">🎮</span>
      <span className="eyebrow">YOUR GAME ROOM</span>
      <h2>{host ? 'Invite your people.' : 'You’re in. Get comfortable.'}</h2>
      <p style={{ maxWidth: '420px', color: '#66755a', margin: '4px auto 16px' }}>
        {host
          ? 'Share this code with your friends and let the learning begin.'
          : 'Waiting for the host to get the round started. Get ready!'}
      </p>

      {/* Room Code & Share Controls */}
      <div className="room-code-group">
        <button
          className="room-code"
          onClick={handleCopy}
          aria-label="Copy room code"
          type="button"
        >
          <span>{game.code}</span>
          {copied ? <Check size={22} color="#3b7324" /> : <Copy size={23} />}
        </button>

        <button
          className="room-share-btn"
          onClick={handleShare}
          type="button"
          aria-label="Share room invite"
        >
          <Share2 size={16} />
          <span>{shareSuccess ? 'Invite Shared!' : copied ? 'Code Copied!' : 'Share Invite'}</span>
        </button>
      </div>

      {/* Room Settings Bar */}
      <div className="room-settings room-settings-bar">
        <span><Leaf size={15} />{game.difficulty}</span>
        <span><BookOpen size={15} />{game.topic}</span>
        <span><Clock size={15} />{game.duration} min limit</span>
      </div>

      {/* Host Identity & Participation Preference */}
      <div
        className="host-participation-badge"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: '#5b4773',
          background: '#f6f1fc',
          border: '1px solid #dfd5ed',
          borderRadius: '16px',
          padding: '4px 12px',
          margin: '10px auto 4px',
          fontWeight: 600,
        }}
      >
        <span>👑 Host: <strong>{game.members?.find(m => m.username === game.host)?.name || game.host}</strong></span>
        <span>•</span>
        <span>{game.hostRole === 'spectator' ? 'Spectating (Observer)' : 'Playing with everyone'}</span>
      </div>

      {/* Lobby Avatars & Quick Count (preserves existing selectors) */}
      <div className="lobby-avatars" aria-hidden="true">
        {allMembers.slice(0, 12).map((m, i) => (
          <span
            key={m.username}
            style={{
              background: ['#d1e5b8', '#d5cbe9', '#c6dde6', '#ead8aa'][i % 4],
            }}
          >
            {(m.name || m.username || '?').slice(0, 1).toUpperCase()}
          </span>
        ))}
        {allMembers.length > 12 && (
          <span style={{ background: '#dce8d3', color: '#3d522a', fontSize: '11px', fontWeight: 700 }}>
            +{allMembers.length - 12}
          </span>
        )}
        <button onClick={handleCopy} aria-label="Copy invite code" type="button">
          <Plus size={20} />
        </button>
      </div>

      {/* Dynamic player count reflecting active players and capacity */}
      <p className="lobby-count">
        {activeCount} / {maxPlayers} players in your room
        {spectatorCount > 0 ? ` (+${spectatorCount} spectator${spectatorCount > 1 ? 's' : ''})` : ''}
      </p>

      {/* Host or Guest Action Area */}
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '340px' }}>
        {host ? (
          <>
            <button
              className="button dark start-game"
              disabled={busy}
              onClick={() => action('start')}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {busy ? (
                <Loader2 className="spin" size={17} />
              ) : (
                <>
                  <Play size={17} fill="currentColor" />
                  {memberCount === 1 ? 'Start solo or with friends' : 'Let’s play!'}
                </>
              )}
            </button>

            {onPreviewCountdown && (
              <button
                className="button light"
                type="button"
                onClick={onPreviewCountdown}
                style={{ width: '100%', justifyContent: 'center', fontSize: '12px', padding: '8px 14px' }}
                title="Preview the Phase 1 Countdown Lobby presentation state without altering backend state"
              >
                Preview Countdown Lobby (UI Mode)
              </button>
            )}
          </>
        ) : (
          <div className="waiting-message" role="status">
            <Loader2 className="spin" size={18} /> Waiting for the host to start…
          </div>
        )}
      </div>

      <span className="room-hint" style={{ marginTop: '20px' }}>
        The lobby updates automatically. No refreshing needed.
      </span>
    </div>
  );
}
