import React, { useState, useEffect } from 'react';
import { Sparkles, Users, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import { PlayerList } from './PlayerList.jsx';

/**
 * CountdownLobby presentation component for Lingo multiplayer.
 * Displays "GETTING READY", countdown display, room code, joined player count,
 * and player roster.
 *
 * Designed to consume authoritative server deadline or controlled seconds prop.
 * Separation of presentation from server timing logic strictly maintained.
 */
export function CountdownLobby({
  game,
  user,
  initialSeconds = 10,
  serverDeadline = null,
  onCancel = null,
}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const memberCount = game?.members?.length || 0;

  // Derive remaining countdown time authoritatively from server deadline
  useEffect(() => {
    const deadline = serverDeadline || game?.countdownDeadline;
    if (deadline) {
      const calc = () => {
        const clockOffset = (game?.serverTime && game?.clientReceivedAt)
          ? (game.serverTime - game.clientReceivedAt)
          : 0;
        const currentServerTime = Date.now() + clockOffset;
        const remaining = Math.max(0, Math.ceil((deadline - currentServerTime) / 1000));
        setSecondsLeft(remaining);
      };
      calc();
      const interval = setInterval(calc, 250);
      return () => clearInterval(interval);
    } else {
      // Local presentation mode for UI preview
      const timer = setInterval(() => {
        setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [serverDeadline, game?.countdownDeadline, game?.serverTime, game?.clientReceivedAt, initialSeconds]);

  return (
    <div className="room-main panel countdown-overlay-card">
      <div className="countdown-badge-pill" role="status">
        <Sparkles size={14} />
        <span>GETTING READY · GAME STARTING</span>
      </div>

      <h2 style={{ fontSize: '32px', margin: '4px 0 0', color: '#2b2338' }}>
        Starting in
      </h2>

      {/* Prominent Animated Countdown Display */}
      <div
        className="countdown-ring-container"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`Starting in ${secondsLeft} seconds`}
      >
        <span className="countdown-number">{secondsLeft}</span>
      </div>

      <p className="countdown-subtext">
        Sharpen your pencils and take a breath. English questions are loading for everyone!
      </p>

      {/* Room & Player Stats */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '10px 20px',
          background: '#f8faf3',
          border: '1px solid #e5ecd9',
          borderRadius: '14px',
          fontSize: '13px',
          fontWeight: 600,
          color: '#556546',
        }}
      >
        <span>Room Code: <strong>{game?.code}</strong></span>
        <span>•</span>
        <span><Users size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{memberCount} players joined</span>
      </div>

      {/* Roster during countdown */}
      <div style={{ width: '100%', maxWidth: '380px', marginTop: '12px' }}>
        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7a896d', marginBottom: '8px', textAlign: 'left' }}>
          Players in this round ({memberCount})
        </h4>
        <PlayerList
          members={game?.members || []}
          hostUsername={game?.host}
          currentUsername={user?.username}
          status="starting"
        />
      </div>

      {onCancel && (
        <button
          className="text-button"
          onClick={onCancel}
          style={{ marginTop: '16px', fontSize: '13px', color: '#7a896d' }}
          type="button"
        >
          <ArrowLeft size={14} /> Return to Waiting Lobby
        </button>
      )}

      <span className="room-hint" style={{ marginTop: '10px' }}>
        Players can still join before the timer hits zero.
      </span>
    </div>
  );
}
