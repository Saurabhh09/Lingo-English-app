import React, { useState } from 'react';
import { Copy, Check, BarChart2, Clock, UserPlus, ChevronRight, Users, Plus, Play, Loader2, Hourglass } from 'lucide-react';
import { ChallengeInvitePanel } from '../Social/GameInvitePanel.jsx';
import { copyTextReliably, getPublicShareOrigin } from '../../services/speechAudio.js';

/**
 * WaitingLobby: Redesigned Friends Mode Room Lobby matching the clean Lingo reference:
 * Trophy match header, leafy dashed Game Code card, vibrant Invite Friends CTA,
 * horizontal Players avatar showcase with Waiting placeholders, and Start Game action.
 */
export function WaitingLobby({
  game,
  user,
  busy,
  action,
  copyCode,
  api,
  notify,
  socialOverview,
  refreshSocial,
}) {
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const host = game.host === user.username;
  const allMembers = game.members || [];
  const activeMembers = allMembers.filter(m => m.role !== 'spectator');
  const activeCount = activeMembers.length;
  const maxPlayers = game.maxPlayers || 100;
  const onlineCount = allMembers.length;

  const formattedCode = (game.code || '').split('').join(' ');
  const avatarBgPalette = ['#dcfce7', '#fef3c7', '#e0f2fe', '#f3e8ff'];
  const slotCount = Math.max(4, Math.min(8, allMembers.length));
  const emptySlotsCount = Math.max(0, 4 - allMembers.length);

  async function handleCopy() {
    if (copyCode) {
      await copyCode();
    } else {
      await copyTextReliably(game.code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  async function handleInviteShare() {
    const shareData = {
      title: 'Join my English Game on Lingo!',
      text: `Join my English challenge on Lingo! Room code: ${game.code}`,
      url: getPublicShareOrigin(),
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2400);
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          await handleCopy();
        }
        return;
      }
    }
    await handleCopy();
  }

  return (
    <div className="friends-lobby-wrap">
      {/* 1. Topic & Match Summary Header Card with Laurel Trophy */}
      <section className="friends-topic-card">
        <div className="friends-trophy-emblem" aria-hidden="true">
          <svg viewBox="0 0 88 72" className="friends-trophy-svg">
            {/* Green Laurel Leaves Left & Right */}
            <path d="M22 54 C11 46 8 30 16 18 C19 25 22 33 25 41 Z" fill="#58cc02" />
            <path d="M18 46 C9 38 11 26 20 20 C21 28 22 36 24 44 Z" fill="#84e132" />
            <path d="M66 54 C77 46 80 30 72 18 C69 25 66 33 63 41 Z" fill="#58cc02" />
            <path d="M70 46 C79 38 77 26 68 20 C67 28 66 36 64 44 Z" fill="#84e132" />
            {/* Gold Cup */}
            <path d="M28 16 H60 V32 C60 44 52 50 44 50 C36 50 28 44 28 32 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="2.5" />
            <path d="M28 20 H20 C18 20 18 33 26 35" fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
            <path d="M60 20 H68 C70 20 70 33 62 35" fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
            {/* Stand */}
            <rect x="40" y="50" width="8" height="9" fill="#d97706" />
            <rect x="31" y="59" width="26" height="6" rx="3" fill="#92400e" />
            {/* Star on cup */}
            <polygon points="44,24 46.5,29.5 52.5,30 48,34 49.5,39.5 44,36.5 38.5,39.5 40,34 35.5,30 41.5,29.5" fill="#fef08a" />
          </svg>
        </div>

        <div className="friends-topic-divider" aria-hidden="true" />

        <div className="friends-topic-info">
          <h2 className="friends-topic-title">{(game.topic || 'Mixed English').toUpperCase()}</h2>
          <div className="friends-topic-meta">
            <span><BarChart2 size={14} /> {game.difficulty}</span>
            <span><Clock size={14} /> {game.duration} min</span>
          </div>
        </div>
      </section>

      {/* 2. Leaf-Tinted Game Code Card */}
      <section className="friends-code-card">
        <span className="friends-code-eyebrow">YOUR GAME CODE</span>

        <button
          type="button"
          className="friends-code-pill room-code"
          onClick={handleCopy}
          aria-label="Copy room code"
        >
          <span className="friends-code-chars">{formattedCode}</span>
          <span className="friends-code-copy-icon">
            {copied ? <Check size={20} color="#16a34a" /> : <Copy size={20} />}
          </span>
        </button>

        <button type="button" className="friends-share-caption" onClick={handleInviteShare}>
          <span>{shareSuccess ? 'Invite shared!' : copied ? 'Code copied to clipboard!' : 'Share this code to invite players'}</span>
        </button>
      </section>

      {/* 3. Invite Friends Primary Action Pill */}
      <button
        type="button"
        className="friends-invite-btn room-share-btn"
        onClick={handleInviteShare}
        aria-label="Invite Friends"
      >
        <UserPlus size={19} />
        <span className="friends-invite-label">{shareSuccess ? 'Invite Sent!' : 'Invite Friends'}</span>
        <ChevronRight size={19} className="friends-invite-arrow" />
      </button>

      {host && api && (
        <ChallengeInvitePanel
          game={game}
          api={api}
          notify={notify}
          socialOverview={socialOverview}
          refreshSocial={refreshSocial}
        />
      )}

      {/* 4. Players Card (Host + Joined Friends + Waiting Circles) */}
      <section className="friends-players-card">
        <div className="friends-players-head">
          <div className="friends-players-title">
            <Users size={17} />
            <span>PLAYERS ({activeCount} / {maxPlayers})</span>
          </div>
          <span className="friends-online-chip">
            <span className="green-dot" />
            <span>{onlineCount} online</span>
          </span>
        </div>

        <div className="friends-players-grid" style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(4, slotCount))}, minmax(0, 1fr))` }}>
          {allMembers.slice(0, 12).map((m, i) => {
            const isMemberHost = m.username === game.host;
            const isMe = m.username === user.username;
            const initial = (m.name || m.username || '?').slice(0, 1).toUpperCase();

            return (
              <div key={m.username} className="friends-player-slot">
                <div
                  className={`friends-avatar-circle ${isMemberHost ? 'is-host' : ''}`}
                  style={{ background: avatarBgPalette[i % avatarBgPalette.length] }}
                >
                  <span className="friends-avatar-letter">{initial}</span>
                  {isMemberHost && (
                    <span className="friends-crown-badge" aria-label="Host crown">👑</span>
                  )}
                  {(isMemberHost || isMe) && (
                    <span className={`friends-role-chip ${isMemberHost ? 'host' : 'me'}`}>
                      {isMemberHost ? 'Host' : 'You'}
                    </span>
                  )}
                </div>
                <span className="friends-player-name">{m.name || m.username}</span>
              </div>
            );
          })}

          {Array.from({ length: emptySlotsCount }).map((_, idx) => (
            <button
              key={`wait-${idx}`}
              type="button"
              className="friends-player-slot is-waiting"
              onClick={handleCopy}
              aria-label="Copy invite code for friend"
            >
              <div className="friends-waiting-circle">
                <Plus size={20} />
              </div>
              <span className="friends-waiting-label">Waiting...</span>
            </button>
          ))}
        </div>
      </section>

      {/* 5. Start Game CTA or Waiting Status */}
      <div className="friends-lobby-footer">
        {host ? (
          <button
            type="button"
            className="solo-primary-btn friends-start-btn start-game"
            disabled={busy}
            onClick={() => action('start')}
          >
            {busy ? (
              <Loader2 className="spin" size={18} />
            ) : (
              <>
                <Play size={18} fill="currentColor" />
                <span>START GAME</span>
              </>
            )}
          </button>
        ) : (
          <div className="friends-guest-waiting" role="status">
            <Loader2 className="spin" size={18} />
            <span>Waiting for the host to start the match…</span>
          </div>
        )}

        <div className="friends-waiting-foot">
          <Hourglass size={14} />
          <span>{allMembers.length < 2 ? 'Waiting for players...' : `${allMembers.length} players ready in lobby`}</span>
        </div>
      </div>
    </div>
  );
}
