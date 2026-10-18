import React from 'react';
import { Trophy, ArrowRight, ArrowLeft, Sparkles, Award } from 'lucide-react';
import { PlayerList } from './PlayerList.jsx';

/**
 * FinishedGame presentation component for Lingo multiplayer.
 * Displays celebration header, user's final score, winner announcement,
 * full room ranking, and replay/return action.
 */
export function FinishedGame({
  game,
  user,
  action,
}) {
  const sorted = [...(game.members || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
  const mine = game.members?.find(m => m.username === user.username);
  const isTopWinner = sorted[0]?.username === user.username;
  const winner = sorted[0];

  return (
    <div className="room-main panel finished-game-view">
      {/* Celebration Header */}
      <div className="celebration" aria-hidden="true">
        <span>✦</span>
        <Trophy size={62} />
        <span>✧</span>
      </div>

      <span className="eyebrow">GOOD WORDS. GREAT EFFORT.</span>
      <h2>That was a little brilliant.</h2>
      <p style={{ maxWidth: '420px', color: '#68775c', margin: '0 auto' }}>
        {isTopWinner
          ? 'You topped the leaderboard! Look at all those quick, accurate answers.'
          : 'Every round is another step forward. Wonderful effort!'}
      </p>

      {/* Result Score Card (Preserves .result-score strong for automated testing) */}
      <div className="result-card-banner">
        <div className="result-score">
          <strong>{mine?.score || 0}</strong>
          <span>your points</span>
        </div>
        <p className="result-winner" style={{ margin: '8px 0 0', fontWeight: 600, color: '#3f522f' }}>
          🏆 {winner?.name || 'Everyone'} takes the win with {winner?.score || 0} points!
        </p>
      </div>

      {/* Full Leaderboard Breakdown */}
      <div style={{ width: '100%', maxWidth: '480px', marginTop: '12px' }}>
        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7a896d', marginBottom: '10px', textAlign: 'left' }}>
          Final Standings
        </h4>
        <PlayerList
          members={sorted}
          hostUsername={game.host}
          currentUsername={user.username}
          status="finished"
          showScores={true}
        />
      </div>

      {/* Return to Play & Learn / Next Challenge button */}
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <button
          className="button dark start-game"
          onClick={() => action('leave')}
        >
          Another little challenge? <ArrowRight size={18} />
        </button>

        <span className="room-hint">
          Game scores stay in this room. Lesson XP is earned on your learning path.
        </span>
      </div>
    </div>
  );
}
