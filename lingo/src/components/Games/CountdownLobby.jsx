import React, { useState, useEffect } from 'react';
import { Sparkles, Users } from 'lucide-react';
import { Mascot } from '../../Art.jsx';

/**
 * CountdownLobby: Clean Solo-style pre-game timer screen for Friends Mode.
 * Removes header/sidebar clutter and uses the Lingo ring countdown + mascot design.
 */
export function CountdownLobby({
  game,
  user,
  initialSeconds = 10,
  serverDeadline = null,
}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const memberCount = game?.members?.length || 0;

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
    }
    const timer = setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [serverDeadline, game?.countdownDeadline, game?.serverTime, game?.clientReceivedAt, initialSeconds]);

  const ringRadius = 56;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(10, Math.max(0, secondsLeft)) / 10);

  return (
    <div className="solo-flow-page solo-countdown-stage">
      <div className="solo-countdown-card">
        <div className="solo-countdown-pill">
          <Sparkles size={13} />
          <span>FRIENDS CHALLENGE · {memberCount} {memberCount === 1 ? 'PLAYER' : 'PLAYERS'}</span>
        </div>

        <div className="solo-countdown-mascot" aria-hidden="true">
          <Mascot pose="wave" size={86} />
        </div>

        <h2 className="solo-countdown-heading">Starting in</h2>
        <p className="solo-countdown-lead">Take a quick breath—match questions load for everyone.</p>

        <div
          className="solo-timer-ring-wrap"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`Starting in ${secondsLeft} seconds`}
        >
          <svg viewBox="0 0 132 132" className="solo-timer-ring-svg" aria-hidden="true">
            <circle cx="66" cy="66" r={ringRadius} className="solo-ring-track" />
            <circle
              cx="66"
              cy="66"
              r={ringRadius}
              className="solo-ring-fill"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
            />
          </svg>
          <span className={`solo-countdown-digit ${secondsLeft <= 0 ? 'is-go' : ''}`}>
            {secondsLeft > 0 ? secondsLeft : 'Go!'}
          </span>
        </div>

        {(game?.members || []).length > 0 && (
          <div className="friends-countdown-roster">
            <Users size={13} />
            <span>
              {(game.members || []).slice(0, 4).map(m => m.name || m.username).join(', ')}
              {(game.members || []).length > 4 ? ` +${game.members.length - 4} more` : ''}
            </span>
          </div>
        )}

        <div className="solo-countdown-dots" aria-hidden="true">
          <span className="is-lit" />
          <span className={secondsLeft <= 6 ? 'is-lit' : ''} />
          <span className={secondsLeft <= 3 ? 'is-lit' : ''} />
        </div>
      </div>
    </div>
  );
}
