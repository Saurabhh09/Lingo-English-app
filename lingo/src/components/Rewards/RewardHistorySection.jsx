import React from 'react';
import { Gem, Zap, Trophy, ScrollText, Gift, Sparkles, CheckCircle2 } from 'lucide-react';
import { REWARD_DEFINITIONS } from '../../../server/rewardDefinitions.mjs';
import { ensureRewardState, formatRewardHistory } from '../../../server/rewardEngine.mjs';

export function RewardHistorySection({ progress, onClaimReward, claimingId = null }) {
  const safeProgress = progress ? ensureRewardState({ ...progress }) : { gems: 0, rewards: {}, certificates: {} };
  const history = formatRewardHistory(safeProgress);
  const availableRewards = REWARD_DEFINITIONS.filter(
    def => safeProgress.rewards?.[def.id]?.status === 'available'
  );
  const totalRewardXp = history.reduce((acc, item) => acc + (item.xpAmount || 0), 0);
  const certs = Object.values(safeProgress.certificates || {});

  return (
    <section className="reward-history-panel" aria-label="Reward Chests & Gems Wallet">
      <div className="reward-history-header">
        <div>
          <span className="reward-history-eyebrow">TREASURE WALLET &amp; MILESTONES</span>
          <h3 className="reward-history-heading">Reward History</h3>
        </div>
        <div className="reward-wallet-badges">
          <div className="reward-wallet-chip gems">
            <Gem size={15} />
            <b>{safeProgress.gems || 0}</b>
            <span>Gems</span>
          </div>
          <div className="reward-wallet-chip xp">
            <Zap size={15} fill="currentColor" />
            <b>+{totalRewardXp}</b>
            <span>Bonus XP</span>
          </div>
        </div>
      </div>

      {/* Claimable chests waiting for user */}
      {availableRewards.length > 0 && (
        <div className="reward-ready-banner">
          <div className="reward-ready-title">
            <Sparkles size={16} />
            <b>{availableRewards.length} {availableRewards.length === 1 ? 'Reward' : 'Rewards'} Ready to Open!</b>
          </div>
          <div className="reward-ready-list">
            {availableRewards.map(rw => (
              <div key={rw.id} className="reward-ready-item">
                <div>
                  <strong>{rw.name}</strong>
                  <small>
                    {rw.xpAmount ? `+${rw.xpAmount} XP` : ''}
                    {rw.gemsAmount ? ` · +${rw.gemsAmount} Gems` : ''}
                    {rw.badgeId ? ' · + Badge' : ''}
                  </small>
                </div>
                <button
                  type="button"
                  className="reward-claim-inline-btn"
                  disabled={claimingId === rw.id}
                  onClick={() => onClaimReward && onClaimReward(rw.id)}
                >
                  <Gift size={14} />
                  <span>{claimingId === rw.id ? 'Opening...' : 'Open'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earned CEFR Certificates */}
      {certs.length > 0 && (
        <div className="reward-certificates-strip">
          {certs.map((cert, idx) => (
            <div key={cert.levelId || cert.id || idx} className="reward-cert-pill">
              <ScrollText size={16} />
              <div>
                <strong>{cert.title}</strong>
                <span>
                  Awarded {(cert.awardedAt || cert.earnedAt) ? new Date(cert.awardedAt || cert.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'recently'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Claimed Rewards List */}
      {history.length > 0 ? (
        <div className="reward-history-list">
          {history.map(item => (
            <div key={item.id} className="reward-history-row">
              <div className="reward-history-icon">
                {item.triggerType === 'cefr_level' ? (
                  <Trophy size={18} />
                ) : item.triggerType === 'section' ? (
                  <Sparkles size={18} />
                ) : (
                  <Gift size={18} />
                )}
              </div>
              <div className="reward-history-meta">
                <div className="reward-history-title-row">
                  <strong>{item.name}</strong>
                  <span className="reward-history-claimed-pill">
                    <CheckCircle2 size={11} /> Claimed
                  </span>
                </div>
                <p>{item.description}</p>
                <div className="reward-history-tags">
                  {item.xpAmount > 0 && <span className="rw-tag xp">+{item.xpAmount} XP</span>}
                  {item.gemsAmount > 0 && <span className="rw-tag gems">+{item.gemsAmount} Gems</span>}
                  {item.badge && <span className="rw-tag badge">Badge: {item.badge.name}</span>}
                  {item.claimedAt && (
                    <span className="rw-tag date">
                      {new Date(item.claimedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="reward-history-empty">
          <Gift size={24} />
          <div>
            <b>No chests claimed yet</b>
            <p>Complete Unit 1 for +50 XP, Unit 5 for +100 XP &amp; +10 Gems, and finish sections to unlock treasure chests!</p>
          </div>
        </div>
      )}
    </section>
  );
}
