import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Bell,
  UserPlus,
  Search,
  Trophy,
  Flame,
  Zap,
  Gamepad2,
  UserCheck,
  UserX,
  Copy,
  Share2,
  Check,
  Plus,
  Loader2,
  Shield,
  ChevronRight,
  Clock,
  Sparkles,
  UserMinus
} from 'lucide-react';
import { FriendProfileModal, CommunityDetailModal, CreateCommunityModal } from './SocialModals.jsx';
import { copyTextReliably, getPublicShareOrigin } from '../../services/speechAudio.js';

export function FriendsPage({
  api,
  user,
  notify,
  socialOverview,
  refreshSocial,
  onOpenNotifications,
  onChallengeFriend,
  onJoinGameFromInvite,
  initialSubTab = 'friends'
}) {
  const [subTab, setSubTab] = useState(initialSubTab);
  const [friendFilter, setFriendFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedProfileUsername, setSelectedProfileUsername] = useState(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState(null);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const searchSeqRef = useRef(0);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const me = socialOverview?.me || user;
  const friends = socialOverview?.friends || [];
  const incomingRequests = socialOverview?.incomingRequests || [];
  const outgoingRequests = socialOverview?.outgoingRequests || [];
  const blockedUsers = socialOverview?.blockedUsers || [];
  const communities = socialOverview?.communities || [];
  const communityInvitations = socialOverview?.communityInvitations || [];
  const gameInvitations = socialOverview?.gameInvitations || [];
  const unreadCount = socialOverview?.unreadCount || 0;
  const onlineFriendsCount = friends.filter(f => f.isOnline).length;
  const pendingTotal = incomingRequests.length + communityInvitations.length;

  useEffect(() => {
    if (!socialOverview) refreshSocial?.();
  }, []);

  const runSearch = useCallback(async q => {
    const clean = q.trim().replace(/^@+/, '');
    const seq = ++searchSeqRef.current;
    if (clean.length < 2) {
      setSearchResults([]);
      setSearchError('');
      setSearching(false);
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const res = await api('/social/search?q=' + encodeURIComponent(clean));
      if (seq !== searchSeqRef.current) return;
      setSearchResults(res?.users || []);
    } catch (e) {
      if (seq !== searchSeqRef.current) return;
      setSearchResults([]);
      setSearchError(e?.message || 'Unable to search users right now.');
    } finally {
      if (seq === searchSeqRef.current) setSearching(false);
    }
  }, [api]);

  useEffect(() => {
    const clean = searchQuery.trim().replace(/^@+/, '');
    if (clean.length < 2) {
      setSearchResults([]);
      setSearchError('');
      setSearching(false);
      return undefined;
    }
    const t = setTimeout(() => {
      if (subTab === 'find') runSearch(searchQuery);
    }, 150);
    return () => clearTimeout(t);
  }, [searchQuery, subTab, runSearch]);

  const personalInviteUrl = `${getPublicShareOrigin()}/?invite=${encodeURIComponent(me?.lingoId || '')}`;

  async function handleCopyInviteLink() {
    await copyTextReliably(personalInviteUrl);
    setCopiedLink(true);
    notify?.(`Copied invite ID ${me?.lingoId || ''}!`);
    setTimeout(() => setCopiedLink(false), 2200);
  }

  async function handleShareInviteLink() {
    const shareData = {
      title: 'Join me on Lingo!',
      text: `Add me as a friend on Lingo! My Lingo ID is ${me?.lingoId || ''} (or search @${me?.username}).`,
      url: personalInviteUrl
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
    handleCopyInviteLink();
  }

  async function handleSendRequest(targetUsername) {
    setBusyId(`req:${targetUsername}`);
    setSearchResults(prev =>
      prev.map(u => (u.username === targetUsername ? { ...u, friendStatus: 'request_sent' } : u))
    );
    try {
      const res = await api('/social/friends/request', { username: targetUsername });
      const nextStatus = res.status === 'accepted' ? 'friends' : 'request_sent';
      setSearchResults(prev =>
        prev.map(u => (u.username === targetUsername ? { ...u, friendStatus: nextStatus } : u))
      );
      notify?.(res.status === 'accepted' ? 'Friend request accepted!' : 'Friend request sent!');
      refreshSocial?.().catch(() => { });
    } catch (e) {
      setSearchResults(prev =>
        prev.map(u => (u.username === targetUsername ? { ...u, friendStatus: 'not_connected' } : u))
      );
      notify?.(e.message || 'Could not send request.');
    } finally {
      setBusyId('');
    }
  }

  async function handleRespondFriendReq(reqId, actionType) {
    setBusyId(`fr:${reqId}`);
    try {
      await api(`/social/friends/requests/${encodeURIComponent(reqId)}/respond`, { action: actionType });
      notify?.(
        actionType === 'accept'
          ? 'Friend added!'
          : actionType === 'reject'
            ? 'Request declined.'
            : 'Request cancelled.'
      );
      refreshSocial?.().catch(() => { });
    } catch (e) {
      notify?.(e.message || 'Failed to update friend request.');
    } finally {
      setBusyId('');
    }
  }

  async function handleRemoveFriend(targetUsername, displayName) {
    setBusyId(`rm:${targetUsername}`);
    try {
      await api(`/social/friends/${encodeURIComponent(targetUsername)}`, undefined, 'DELETE');
      notify?.(`Removed ${displayName || targetUsername} from friends.`);
      await refreshSocial?.();
    } catch (e) {
      notify?.(e.message || 'Failed to remove friend.');
    } finally {
      setBusyId('');
    }
  }

  async function handleRespondCommunityInvite(invId, actionType) {
    setBusyId(`ci:${invId}`);
    try {
      await api(`/communities/invitations/${encodeURIComponent(invId)}/respond`, { action: actionType });
      notify?.(actionType === 'accept' ? 'Joined community!' : 'Community invitation declined.');
      await refreshSocial?.();
    } catch (e) {
      notify?.(e.message || 'Unable to respond to invitation.');
    } finally {
      setBusyId('');
    }
  }

  async function handleRespondGameInvite(invId, actionType) {
    setBusyId(`gi:${invId}`);
    try {
      const res = await api(`/games/invites/${encodeURIComponent(invId)}/respond`, { action: actionType });
      if (actionType === 'accept' && res?.game) {
        onJoinGameFromInvite?.(res.game);
      } else {
        notify?.('Challenge declined.');
      }
      await refreshSocial?.();
    } catch (e) {
      notify?.(e.message || 'Could not respond to game invitation.');
      await refreshSocial?.();
    } finally {
      setBusyId('');
    }
  }

  async function handleUnblock(username) {
    setBusyId(`ub:${username}`);
    try {
      await api('/social/blocks', { username, action: 'unblock' });
      notify?.(`Unblocked @${username}.`);
      await refreshSocial?.();
    } catch (e) {
      notify?.(e.message || 'Could not unblock user.');
    } finally {
      setBusyId('');
    }
  }

  const filteredFriends = friends.filter(f => {
    const q = friendFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      String(f.name || '').toLowerCase().includes(q) ||
      String(f.username || '').toLowerCase().includes(q) ||
      String(f.lingoId || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="social-page-wrap">
      {/* Header */}
      <header className="social-page-header">
        <div>
          <span className="social-eyebrow">SOCIAL &amp; COMMUNITIES</span>
          <h1 className="social-title">Friends</h1>
        </div>
        <div className="social-header-actions">
          <button
            type="button"
            className="social-bell-btn"
            onClick={onOpenNotifications}
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="social-badge-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          <button
            type="button"
            className="social-add-btn"
            onClick={() => setSubTab('find')}
          >
            <UserPlus size={16} />
            <span>Add Friends</span>
          </button>
        </div>
      </header>

      {/* Pending Game Invitations Live Alert */}
      {gameInvitations.length > 0 && (
        <section className="social-game-invites-strip" aria-label="Game invitations">
          {gameInvitations.map(gi => (
            <div key={gi.id} className="social-game-invite-card">
              <div className="sgi-top">
                <span className="sgi-badge"><Gamepad2 size={13} /> GAME INVITATION!</span>
                <span className="sgi-players">Players: {gi.playerCount}/{gi.maxPlayers}</span>
              </div>
              <p className="sgi-message">
                <strong>{gi.senderName}</strong> challenged you to a <b>{gi.topic}</b> ({gi.difficulty}) battle.
              </p>
              <div className="sgi-actions">
                <button
                  type="button"
                  className="sgi-accept-btn"
                  disabled={busyId === `gi:${gi.id}`}
                  onClick={() => handleRespondGameInvite(gi.id, 'accept')}
                >
                  {busyId === `gi:${gi.id}` ? 'Joining…' : 'ACCEPT CHALLENGE'}
                </button>
                <button
                  type="button"
                  className="sgi-decline-btn"
                  disabled={busyId === `gi:${gi.id}`}
                  onClick={() => handleRespondGameInvite(gi.id, 'decline')}
                >
                  DECLINE
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Overview Stats Row */}
      <section className="social-overview-grid" aria-label="Social overview">
        <button type="button" className="social-overview-tile" onClick={() => setSubTab('friends')}>
          <strong>{friends.length}</strong>
          <span>Total Friends</span>
        </button>
        <button type="button" className="social-overview-tile" onClick={() => setSubTab('requests')}>
          <strong>{pendingTotal}</strong>
          <span>Pending Requests</span>
        </button>
        <div className="social-overview-tile">
          <strong>{onlineFriendsCount}</strong>
          <span>Online Now</span>
        </div>
      </section>

      {/* 4 Main Section Switcher */}
      <nav className="social-tabs-bar" aria-label="Friends sections">
        {[
          ['friends', `My Friends (${friends.length})`, 0],
          ['communities', `Communities (${communities.length})`, communityInvitations.length],
          ['requests', 'Requests', incomingRequests.length],
          ['find', 'Find Friends', 0]
        ].map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            className={`social-tab-pill ${subTab === id ? 'active' : ''}`}
            onClick={() => setSubTab(id)}
          >
            <span>{label}</span>
            {count > 0 && <span className="social-tab-dot">{count}</span>}
          </button>
        ))}
      </nav>

      {/* SECTION 1: MY FRIENDS */}
      {subTab === 'friends' && (
        <section className="social-section-panel">
          {friends.length > 0 && (
            <div className="social-search-bar">
              <Search size={16} />
              <input
                type="search"
                placeholder="Search your friends by name or @username..."
                value={friendFilter}
                onChange={e => setFriendFilter(e.target.value)}
              />
            </div>
          )}

          {filteredFriends.length === 0 ? (
            <div className="social-empty-card">
              <Users size={30} />
              <h3>{friends.length === 0 ? 'Your study crew starts here' : 'No matching friends'}</h3>
              <p>
                {friends.length === 0
                  ? 'Add friends by username or Lingo ID to challenge each other and form communities!'
                  : 'Try another name or clear your search filter.'}
              </p>
              {friends.length === 0 && (
                <button type="button" className="social-cta-green" onClick={() => setSubTab('find')}>
                  <UserPlus size={16} /> Add Friends
                </button>
              )}
            </div>
          ) : (
            <div className="social-cards-stack">
              {filteredFriends.map(friend => (
                <article key={friend.username} className="social-friend-card">
                  <div className="sf-top">
                    <div className="sf-avatar-wrap">
                      <span className={`avatar small ${friend.avatarColor || 'lime'}`}>{friend.avatar || '🌱'}</span>
                      <span className={`sf-presence-dot ${friend.isOnline ? 'online' : 'offline'}`} title={friend.isOnline ? 'Online' : 'Offline'} />
                    </div>
                    <div className="sf-meta">
                      <div className="sf-name-row">
                        <b>{friend.name}</b>
                        <span className="sf-cefr-pill">{friend.cefrLevel}</span>
                      </div>
                      <span className="sf-handle">@{friend.username} · {friend.lingoId}</span>
                      <div className="sf-stats-line">
                        <span><Zap size={12} fill="currentColor" /> {friend.xp} XP</span>
                        <span><Flame size={12} /> {friend.streak}d streak</span>
                        <span className={friend.isOnline ? 'txt-online' : 'txt-offline'}>
                          {friend.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="sf-actions">
                    <button
                      type="button"
                      className="sf-btn view"
                      onClick={() => setSelectedProfileUsername(friend.username)}
                    >
                      View Profile
                    </button>
                    <button
                      type="button"
                      className="sf-btn challenge"
                      onClick={() => onChallengeFriend?.(friend)}
                    >
                      <Gamepad2 size={14} /> Challenge
                    </button>
                    <button
                      type="button"
                      className="sf-btn remove"
                      disabled={busyId === `rm:${friend.username}`}
                      onClick={() => handleRemoveFriend(friend.username, friend.name)}
                      aria-label={`Remove ${friend.name}`}
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* SECTION 2: COMMUNITIES */}
      {subTab === 'communities' && (
        <section className="social-section-panel">
          <div className="social-section-top">
            <div>
              <h3>Private Communities</h3>
              <p>Create study squads and challenge whole communities together.</p>
            </div>
            <button type="button" className="social-cta-green compact" onClick={() => setShowCreateCommunity(true)}>
              <Plus size={15} /> Create
            </button>
          </div>

          {communityInvitations.length > 0 && (
            <div className="social-subblock">
              <span className="social-sub-label">PENDING COMMUNITY INVITES ({communityInvitations.length})</span>
              <div className="social-cards-stack">
                {communityInvitations.map(inv => (
                  <div key={inv.id} className="social-request-card">
                    <div className="sr-info">
                      <span className="comm-emoji-badge">{inv.communityIcon || '🌟'}</span>
                      <div>
                        <b>{inv.communityName}</b>
                        <p>Invited by {inv.inviterName} · {inv.memberCount} {inv.memberCount === 1 ? 'member' : 'members'}</p>
                      </div>
                    </div>
                    <div className="sr-actions">
                      <button
                        type="button"
                        className="sr-accept"
                        disabled={busyId === `ci:${inv.id}`}
                        onClick={() => handleRespondCommunityInvite(inv.id, 'accept')}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="sr-reject"
                        disabled={busyId === `ci:${inv.id}`}
                        onClick={() => handleRespondCommunityInvite(inv.id, 'decline')}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {communities.length === 0 ? (
            <div className="social-empty-card">
              <Shield size={28} />
              <h3>No communities yet</h3>
              <p>Create a private community for your study partners or accept an invitation.</p>
              <button type="button" className="social-cta-green" onClick={() => setShowCreateCommunity(true)}>
                <Plus size={16} /> Create Community
              </button>
            </div>
          ) : (
            <div className="social-cards-stack">
              {communities.map(comm => (
                <button
                  key={comm.id}
                  type="button"
                  className="social-community-card"
                  onClick={() => setSelectedCommunityId(comm.id)}
                >
                  <span className="comm-emoji-badge lg">{comm.icon || '🌟'}</span>
                  <div className="comm-card-meta">
                    <div className="comm-name-row">
                      <b>{comm.name}</b>
                      <span className={`comm-role-tag ${comm.myRole}`}>{comm.myRole}</span>
                    </div>
                    {comm.description && <p>{comm.description}</p>}
                    <span className="comm-member-meta">
                      <Users size={12} /> {comm.memberCount} {comm.memberCount === 1 ? 'member' : 'members'} · Private
                    </span>
                  </div>
                  <ChevronRight size={18} className="comm-arrow" />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* SECTION 3: FRIEND REQUESTS */}
      {subTab === 'requests' && (
        <section className="social-section-panel">
          <div className="social-subblock">
            <span className="social-sub-label">INCOMING REQUESTS ({incomingRequests.length})</span>
            {incomingRequests.length === 0 ? (
              <p className="social-muted-note">No pending incoming friend requests.</p>
            ) : (
              <div className="social-cards-stack">
                {incomingRequests.map(reqItem => (
                  <div key={reqItem.id} className="social-request-card">
                    <div className="sr-info">
                      <span className={`avatar small ${reqItem.sender?.avatarColor || 'lime'}`}>
                        {reqItem.sender?.avatar || '🌱'}
                      </span>
                      <div>
                        <b>{reqItem.sender?.name}</b>
                        <p>@{reqItem.sender?.username} · {reqItem.sender?.cefrLevel} · {reqItem.sender?.xp} XP</p>
                      </div>
                    </div>
                    <div className="sr-actions">
                      <button
                        type="button"
                        className="sr-accept"
                        disabled={busyId === `fr:${reqItem.id}`}
                        onClick={() => handleRespondFriendReq(reqItem.id, 'accept')}
                      >
                        <UserCheck size={14} /> Accept
                      </button>
                      <button
                        type="button"
                        className="sr-reject"
                        disabled={busyId === `fr:${reqItem.id}`}
                        onClick={() => handleRespondFriendReq(reqItem.id, 'reject')}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="social-subblock">
            <span className="social-sub-label">SENT REQUESTS ({outgoingRequests.length})</span>
            {outgoingRequests.length === 0 ? (
              <p className="social-muted-note">No pending sent requests.</p>
            ) : (
              <div className="social-cards-stack">
                {outgoingRequests.map(reqItem => (
                  <div key={reqItem.id} className="social-request-card">
                    <div className="sr-info">
                      <span className={`avatar small ${reqItem.receiver?.avatarColor || 'blue'}`}>
                        {reqItem.receiver?.avatar || '🌱'}
                      </span>
                      <div>
                        <b>{reqItem.receiver?.name}</b>
                        <p>@{reqItem.receiver?.username} · <Clock size={11} /> Pending</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="sr-reject"
                      disabled={busyId === `fr:${reqItem.id}`}
                      onClick={() => handleRespondFriendReq(reqItem.id, 'cancel')}
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {blockedUsers.length > 0 && (
            <div className="social-subblock">
              <span className="social-sub-label">BLOCKED USERS ({blockedUsers.length})</span>
              <div className="social-cards-stack">
                {blockedUsers.map(b => (
                  <div key={b.id} className="social-request-card">
                    <div className="sr-info">
                      <div>
                        <b>{b.name}</b>
                        <p>@{b.username}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="sr-reject"
                      disabled={busyId === `ub:${b.username}`}
                      onClick={() => handleUnblock(b.username)}
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* SECTION 4: FIND FRIENDS */}
      {subTab === 'find' && (
        <section className="social-section-panel">
          {/* Personal Shareable Invitation Card */}
          <div className="social-share-link-card">
            <div className="ssl-head">
              <Sparkles size={16} />
              <div>
                <strong>Your Lingo ID: {me?.lingoId || 'Pending sync'}</strong>
                <p>Share your personal invite link or ID so friends can find you fast.</p>
              </div>
            </div>
            <div className="ssl-actions">
              <button type="button" className="ssl-btn copy" onClick={handleCopyInviteLink}>
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedLink ? 'Copied!' : 'Copy Invite Link'}</span>
              </button>
              <button type="button" className="ssl-btn share" onClick={handleShareInviteLink}>
                <Share2 size={14} />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* User Discovery Search Input */}
          <div className="social-search-bar">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search username, display name, or Lingo ID (LNG-...)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searching && <Loader2 size={15} className="spin" />}
          </div>

          {searchQuery.trim().replace(/^@+/, '').length < 2 ? (
            <p className="social-muted-note">Type at least 2 characters to find registered Lingo learners.</p>
          ) : searchError ? (
            <div className="social-empty-card">
              <Search size={26} />
              <h3>Search unavailable</h3>
              <p>{searchError}</p>
            </div>
          ) : searchResults.length === 0 && !searching ? (
            <div className="social-empty-card">
              <Search size={26} />
              <h3>No learners found</h3>
              <p>Check the spelling of the username or Lingo User ID (e.g. LNG-A1B2C3).</p>
            </div>
          ) : (
            <div className="social-cards-stack">
              {searchResults.map(u => (
                <article key={u.username} className="social-friend-card">
                  <div className="sf-top">
                    <span className={`avatar small ${u.avatarColor || 'lime'}`}>{u.avatar || '🌱'}</span>
                    <div className="sf-meta">
                      <div className="sf-name-row">
                        <b>{u.name}</b>
                        <span className="sf-cefr-pill">{u.cefrLevel}</span>
                      </div>
                      <span className="sf-handle">@{u.username} · {u.lingoId}</span>
                      <div className="sf-stats-line">
                        <span><Zap size={12} fill="currentColor" /> {u.xp} XP</span>
                        <span><Flame size={12} /> {u.streak}d streak</span>
                      </div>
                    </div>
                  </div>

                  <div className="sf-actions">
                    <button
                      type="button"
                      className="sf-btn view"
                      onClick={() => setSelectedProfileUsername(u.username)}
                    >
                      Profile
                    </button>

                    {u.friendStatus === 'friends' ? (
                      <span className="sf-status-pill friends"><UserCheck size={13} /> Friends</span>
                    ) : u.friendStatus === 'request_sent' ? (
                      <span className="sf-status-pill sent"><Clock size={13} /> Request Sent</span>
                    ) : u.friendStatus === 'request_received' ? (
                      <button
                        type="button"
                        className="sf-btn challenge"
                        onClick={() => setSubTab('requests')}
                      >
                        Respond
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="sf-btn challenge"
                        disabled={busyId === `req:${u.username}`}
                        onClick={() => handleSendRequest(u.username)}
                      >
                        <UserPlus size={14} /> {busyId === `req:${u.username}` ? 'Sending…' : 'Add Friend'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Sub-Modals */}
      {selectedProfileUsername && (
        <FriendProfileModal
          api={api}
          username={selectedProfileUsername}
          notify={notify}
          onClose={() => setSelectedProfileUsername(null)}
          onChanged={refreshSocial}
          onChallengeFriend={profile => {
            setSelectedProfileUsername(null);
            onChallengeFriend?.(profile);
          }}
        />
      )}

      {selectedCommunityId && (
        <CommunityDetailModal
          api={api}
          user={user}
          communityId={selectedCommunityId}
          friends={friends}
          notify={notify}
          onClose={() => setSelectedCommunityId(null)}
          onChanged={refreshSocial}
        />
      )}

      {showCreateCommunity && (
        <CreateCommunityModal
          api={api}
          friends={friends}
          notify={notify}
          onClose={() => setShowCreateCommunity(false)}
          onCreated={() => {
            setShowCreateCommunity(false);
            refreshSocial?.();
          }}
        />
      )}
    </div>
  );
}
