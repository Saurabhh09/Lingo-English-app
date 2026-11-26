import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Sparkles, Check, Search, Send, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { notifyChallengeSentOnDevice } from '../../services/deviceNotifications.js';

/**
 * ChallengeInvitePanel: Phase 5 Multiplayer Invitation Hub embedded inside WaitingLobby.
 * Supports:
 *   A. Invite Selected Friends
 *   B. Invite All Eligible Friends
 *   C. Invite Entire Community (with deduplication)
 * Plus real-time sent invitation statuses.
 */
export function ChallengeInvitePanel({
  game,
  api,
  notify,
  socialOverview,
  refreshSocial,
}) {
  const [tab, setTab] = useState('friends'); // 'friends' | 'all' | 'communities'
  const [friendSearch, setFriendSearch] = useState('');
  const [selectedUsernames, setSelectedUsernames] = useState([]);
  const [selectedCommunityIds, setSelectedCommunityIds] = useState([]);
  const [roomInvites, setRoomInvites] = useState([]);
  const [sending, setSending] = useState(false);

  const friends = socialOverview?.friends || [];
  const communities = socialOverview?.communities || [];
  const existingMemberSet = new Set((game?.members || []).map(m => m.username));

  async function loadRoomInvites() {
    if (!api || !game?.code) return;
    try {
      const res = await api(`/games/${encodeURIComponent(game.code)}/invites`);
      if (Array.isArray(res?.invites)) setRoomInvites(res.invites);
    } catch { }
  }

  useEffect(() => {
    refreshSocial?.();
    loadRoomInvites();
  }, [game?.code]);

  const activeInvitedSet = new Set(
    roomInvites.filter(ri => ['pending', 'accepted'].includes(ri.status)).map(ri => ri.receiverId)
  );

  const eligibleFriends = friends.filter(
    f => !existingMemberSet.has(f.username) && !activeInvitedSet.has(f.username)
  );

  const filteredFriends = friends.filter(f => {
    const q = friendSearch.trim().toLowerCase();
    if (!q) return true;
    return String(f.name || '').toLowerCase().includes(q) || String(f.username || '').toLowerCase().includes(q);
  });

  const toggleFriend = uname => {
    setSelectedUsernames(prev =>
      prev.includes(uname) ? prev.filter(x => x !== uname) : [...prev, uname]
    );
  };

  const toggleCommunity = cId => {
    setSelectedCommunityIds(prev =>
      prev.includes(cId) ? prev.filter(x => x !== cId) : [...prev, cId]
    );
  };

  async function sendInvite(payload) {
    if (!api || sending) return;
    setSending(true);
    try {
      const res = await api(`/games/${encodeURIComponent(game.code)}/invite`, payload);
      const count = res?.invited?.length || 0;
      if (Array.isArray(res?.invites)) setRoomInvites(res.invites);
      setSelectedUsernames([]);
      setSelectedCommunityIds([]);
      notify?.(
        count > 0
          ? `Sent ${count} game invitation${count === 1 ? '' : 's'}!`
          : 'All selected users are already in the room or invited.'
      );
      if (count > 0) {
        notifyChallengeSentOnDevice({
          targetNames: (res?.invited || []).map(x => x.receiverName || x.receiverId),
          topic: game?.topic || 'English Match',
          gameCode: game?.code || ''
        }).catch(() => { });
      }
      refreshSocial?.();
    } catch (err) {
      notify?.(err.message || 'Failed to send invitations.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="challenge-invite-panel" aria-label="Challenge your friends">
      <div className="cip-head">
        <span className="cip-eyebrow"><Sparkles size={12} /> CHALLENGE YOUR FRIENDS</span>
        <p className="cip-desc">Your game is ready. Invite your friends to join the challenge.</p>
      </div>

      <div className="cip-mode-tabs">
        <button type="button" className={tab === 'friends' ? 'active' : ''} onClick={() => setTab('friends')}>
          Invite Friends
        </button>
        <button type="button" className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
          Invite All ({eligibleFriends.length})
        </button>
        <button type="button" className={tab === 'communities' ? 'active' : ''} onClick={() => setTab('communities')}>
          Community ({communities.length})
        </button>
      </div>

      {/* A. Invite Selected Friends */}
      {tab === 'friends' && (
        <div className="cip-tab-body">
          {friends.length === 0 ? (
            <p className="cip-empty">Add friends in the Friends tab to invite them directly here!</p>
          ) : (
            <>
              <div className="cip-search">
                <Search size={14} />
                <input
                  type="search"
                  placeholder="Search friends..."
                  value={friendSearch}
                  onChange={e => setFriendSearch(e.target.value)}
                />
              </div>

              <div className="cip-checklist">
                {filteredFriends.map(f => {
                  const inRoom = existingMemberSet.has(f.username);
                  const alreadyInv = activeInvitedSet.has(f.username);
                  const disabled = inRoom || alreadyInv;
                  const checked = selectedUsernames.includes(f.username);

                  return (
                    <button
                      key={f.username}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleFriend(f.username)}
                      className={`cip-friend-row ${checked ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                    >
                      <span className="cip-avatar">{f.avatar || '🌱'}</span>
                      <div className="cip-fmeta">
                        <b>{f.name}</b>
                        <small>
                          @{f.username} · {f.isOnline ? '🟢 Online' : 'Offline'}
                        </small>
                      </div>
                      {disabled ? (
                        <span className="cip-state-badge">
                          {inRoom ? 'In Room' : 'Invited'}
                        </span>
                      ) : (
                        <span className={`cip-checkbox ${checked ? 'checked' : ''}`}>
                          {checked && <Check size={13} strokeWidth={3} />}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="cip-send-btn"
                disabled={sending || selectedUsernames.length === 0}
                onClick={() => sendInvite({ mode: 'selected', usernames: selectedUsernames })}
              >
                <Send size={15} />
                <span>{sending ? 'Sending...' : `Invite Selected (${selectedUsernames.length})`}</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* B. Invite All Friends */}
      {tab === 'all' && (
        <div className="cip-tab-body">
          <div className="cip-all-summary">
            <UserPlus size={20} />
            <div>
              <strong>Invite All Eligible Friends</strong>
              <p>
                {eligibleFriends.length > 0
                  ? `${eligibleFriends.length} accepted friend${eligibleFriends.length === 1 ? '' : 's'} will receive an instant notification (excluding players already joined or invited).`
                  : 'All of your friends have either joined or already been invited.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="cip-send-btn"
            disabled={sending || eligibleFriends.length === 0}
            onClick={() => sendInvite({ mode: 'all_friends' })}
          >
            <Send size={15} />
            <span>{sending ? 'Sending...' : `Invite All Friends (${eligibleFriends.length})`}</span>
          </button>
        </div>
      )}

      {/* C. Invite Entire Community */}
      {tab === 'communities' && (
        <div className="cip-tab-body">
          {communities.length === 0 ? (
            <p className="cip-empty">Join or create a private community in the Friends tab to challenge them all at once.</p>
          ) : (
            <>
              <div className="cip-checklist">
                {communities.map(c => {
                  const picked = selectedCommunityIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCommunity(c.id)}
                      className={`cip-friend-row ${picked ? 'selected' : ''}`}
                    >
                      <span className="cip-avatar">{c.icon || '🌟'}</span>
                      <div className="cip-fmeta">
                        <b>{c.name}</b>
                        <small>{c.memberCount} {c.memberCount === 1 ? 'member' : 'members'}</small>
                      </div>
                      <span className={`cip-checkbox ${picked ? 'checked' : ''}`}>
                        {picked && <Check size={13} strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="cip-send-btn"
                disabled={sending || selectedCommunityIds.length === 0}
                onClick={() => sendInvite({ mode: 'community', communityIds: selectedCommunityIds })}
              >
                <Users size={15} />
                <span>{sending ? 'Inviting...' : `Invite Selected Communities (${selectedCommunityIds.length})`}</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Sent Invitations Status Tracker */}
      {roomInvites.length > 0 && (
        <div className="cip-sent-status">
          <span className="cip-sent-label">INVITATION STATUS ({roomInvites.length})</span>
          <div className="cip-sent-pills">
            {roomInvites.map(ri => (
              <span key={ri.id} className={`cip-sent-pill ${ri.status}`}>
                {ri.status === 'accepted' ? <CheckCircle2 size={11} /> : ri.status === 'declined' ? <XCircle size={11} /> : <Clock size={11} />}
                <span>{ri.receiverName}</span>
                <em>{ri.status}</em>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
