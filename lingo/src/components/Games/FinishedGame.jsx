import React from 'react';
import { Trophy, ArrowRight, Sparkles, CheckCircle2, XCircle, Clock, Target, Award, LogOut } from 'lucide-react';
import { PlayerList } from './PlayerList.jsx';

/**
 * FinishedGame presentation component for Lingo multiplayer.
 * Displays celebration header, user's final score, winner announcement,
 * detailed performance breakdown, full room ranking, and replay/return action.
 */
export function FinishedGame({
  game,
  user,
  action,
}) {
  const activeSorted = [...(game.members || [])]
    .filter(m => m.role !== 'spectator')
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  const mine = game.members?.find(m => m.username === user.username);
  const isSpectator = mine?.role === 'spectator';
  const winner = activeSorted[0] || game.members?.[0];
  const isTopWinner = !isSpectator && activeSorted[0]?.username === user.username;
  const myRank = !isSpectator ? activeSorted.findIndex(m => m.username === user.username) + 1 : null;
  const stats = mine?.stats || game.stats || {
    correct: 0,
    incorrect: 0,
    timedOut: 0,
    answered: 0,
    accuracy: 0,
    total: game.total || 0
  };

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
      <p style={{ maxWidth: '440px', color: '#68775c', margin: '0 auto' }}>
        {isSpectator
          ? 'Match concluded! What an exciting round of English practice.'
          : isTopWinner
          ? 'You topped the leaderboard! Look at all those quick, accurate answers.'
          : 'Every round is another step forward. Wonderful effort!'}
      </p>

      {/* Result Score Card (Preserves .result-score strong for automated testing) */}
      <div className="result-card-banner">
        <div className="result-score">
          <strong>{isSpectator ? 'Observing' : (mine?.score || 0)}</strong>
          <span>{isSpectator ? 'spectator host' : 'your points'}</span>
        </div>
        <p className="result-winner" style={{ margin: '8px 0 0', fontWeight: 600, color: '#3f522f' }}>
          🏆 {winner?.name || 'Everyone'} {game.status === 'playing' ? 'currently leads' : 'takes the win'} with {winner?.score || 0} points!
        </p>
      </div>

      {game.status === 'playing' && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: '#f4f8ee',
          border: '1px solid #dbe6cb',
          borderRadius: '20px',
          padding: '6px 14px',
          margin: '12px auto 0',
          fontSize: '12px',
          color: '#46642d',
          fontWeight: 600,
        }}>
          <Clock size={14} />
          <span>You finished all questions! Standings update as other players finish.</span>
        </div>
      )}

      {/* Detailed Stats Breakdown */}
      {!isSpectator && (
        <div className="results-stats-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          width: '100%',
          maxWidth: '480px',
          margin: '14px auto'
        }}>
          <div className="stat-pill" style={{ background: '#f6f9f0', border: '1px solid #e1e9d5', borderRadius: '10px', padding: '10px 8px', textAlign: 'center' }}>
            <span style={{ fontSize: '10px', color: '#7a896d', fontWeight: 600, textTransform: 'uppercase' }}>Rank</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#314422' }}>{myRank ? `#${myRank}` : '-'}</div>
          </div>
          <div className="stat-pill" style={{ background: '#f6f9f0', border: '1px solid #e1e9d5', borderRadius: '10px', padding: '10px 8px', textAlign: 'center' }}>
            <span style={{ fontSize: '10px', color: '#7a896d', fontWeight: 600, textTransform: 'uppercase' }}>Accuracy</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#314422' }}>{stats.accuracy}%</div>
          </div>
          <div className="stat-pill" style={{ background: '#f6f9f0', border: '1px solid #e1e9d5', borderRadius: '10px', padding: '10px 8px', textAlign: 'center' }}>
            <span style={{ fontSize: '10px', color: '#7a896d', fontWeight: 600, textTransform: 'uppercase' }}>Correct</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#43682b' }}>{stats.correct}/{game.total}</div>
          </div>
          <div className="stat-pill" style={{ background: '#f6f9f0', border: '1px solid #e1e9d5', borderRadius: '10px', padding: '10px 8px', textAlign: 'center' }}>
            <span style={{ fontSize: '10px', color: '#7a896d', fontWeight: 600, textTransform: 'uppercase' }}>Timeouts</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#887258' }}>{stats.timedOut}</div>
          </div>
        </div>
      )}

      {/* Full Leaderboard Breakdown */}
      <div style={{ width: '100%', maxWidth: '480px', marginTop: '12px' }}>
        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7a896d', marginBottom: '10px', textAlign: 'left' }}>
          Final Standings
        </h4>
        <PlayerList
          members={game.members || []}
          hostUsername={game.host}
          currentUsername={user.username}
          status="finished"
          showScores={true}
        />
      </div>

      {/* Learning tip */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        margin: '14px auto 0',
        padding: '12px 14px',
        background: '#fcfdfa',
        border: '1px solid #ebf0e4',
        borderRadius: '12px',
        textAlign: 'left',
        fontSize: '12px',
        color: '#5e6d51',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <Sparkles size={18} style={{ color: '#8aa667', flexShrink: 0 }} />
        <span>
          {stats.accuracy >= 80
            ? `Outstanding command of ${game.topic} (${game.cefrLevel || game.difficulty})! Ready to level up your challenge?`
            : `Great practice with ${game.topic}. Review your word library to strengthen vocabulary for the next match.`}
        </span>
      </div>

      {/* Return to Play & Learn / Next Challenge button */}
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <button
          className="exit-game-btn"
          onClick={() => action('leave')}
          style={{ width: '100%', maxWidth: '280px', justifyContent: 'center' }}
        >
          <LogOut size={16} /> Exit Game
        </button>

        <span className="room-hint">
          Game scores stay in this room. Lesson XP is earned on your learning path.
        </span>
      </div>
    </div>
  );
}
