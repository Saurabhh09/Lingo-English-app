import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Flame,
  Trophy,
  BookOpen,
  Gamepad2,
  UserMinus,
  ShieldAlert,
  Users,
  Crown,
  ShieldCheck,
  UserPlus,
  Trash2,
  Edit3,
  LogOut,
  Bell,
  CheckCheck
} from 'lucide-react';

const COMMUNITY_ICONS = ['🌟', '🦉', '📚', '🔥', '🚀', '💬', '🏆', '🌱'];

export function FriendProfileModal({ api, username, notify, onClose, onChanged, onChallengeFriend }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`/social/users/${encodeURIComponent(username)}`)
      .then(res => { if (active) setProfile(res?.profile || null); })
      .catch(e => { if (active) notify?.(e.message || 'Could not load profile.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [username, api]);

  async function doAction(fn) {
    setBusy(true);
    try {
      await fn();
      await onChanged?.();
      onClose();
    } catch (e) {
      notify?.(e.message || 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="social-modal-overlay" role="dialog" aria-modal="true" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="social-modal-card">
        <button type="button" className="social-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {loading || !profile ? (
          <div className="social-modal-loading">Loading learner profile…</div>
        ) : (
          <div className="fp-content">
            <div className="fp-hero">
              <span className={`avatar large ${profile.avatarColor || 'lime'}`}>{profile.avatar || '🌱'}</span>
              <h3>{profile.name}</h3>
              <span className="fp-handle">@{profile.username} · {profile.lingoId}</span>
              <span className="sf-cefr-pill">{profile.cefrLevel} Learner</span>
            </div>

            <div className="fp-stats-grid">
              <div className="fp-stat"><Zap size={16} /><strong>{profile.xp}</strong><span>XP</span></div>
              <div className="fp-stat"><Flame size={16} /><strong>{profile.streak}d</strong><span>Streak</span></div>
              <div className="fp-stat"><BookOpen size={16} /><strong>{profile.lessonsCompleted}</strong><span>Lessons</span></div>
              <div className="fp-stat"><Trophy size={16} /><strong>{profile.badgesCount}</strong><span>Badges</span></div>
            </div>

            {(profile.sharedCommunities || []).length > 0 && (
              <div className="fp-shared-comms">
                <span>Mutual Communities:</span>
                <div>
                  {profile.sharedCommunities.map(c => (
                    <span key={c.id} className="fp-comm-chip">{c.icon} {c.name}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="fp-actions">
              {profile.friendStatus === 'friends' ? (
                <>
                  <button
                    type="button"
                    className="social-cta-green full"
                    disabled={busy}
                    onClick={() => onChallengeFriend?.(profile)}
                  >
                    <Gamepad2 size={16} /> Challenge {profile.name}
                  </button>
                  <button
                    type="button"
                    className="social-danger-outline full"
                    disabled={busy}
                    onClick={() => doAction(() => api(`/social/friends/${encodeURIComponent(profile.username)}`, undefined, 'DELETE'))}
                  >
                    <UserMinus size={15} /> Remove Friend
                  </button>
                </>
              ) : profile.friendStatus === 'not_connected' ? (
                <button
                  type="button"
                  className="social-cta-green full"
                  disabled={busy}
                  onClick={() => doAction(() => api('/social/friends/request', { username: profile.username }))}
                >
                  <UserPlus size={16} /> Send Friend Request
                </button>
              ) : null}

              <button
                type="button"
                className="social-subtle-btn full"
                disabled={busy}
                onClick={() => doAction(() => api('/social/blocks', { username: profile.username, action: 'block' }))}
              >
                <ShieldAlert size={14} /> Block User
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CreateCommunityModal({ api, friends = [], notify, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🌟');
  const [allowMemberInvites, setAllowMemberInvites] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [busy, setBusy] = useState(false);

  const toggleFriend = uname => {
    setSelectedFriends(prev => prev.includes(uname) ? prev.filter(x => x !== uname) : [...prev, uname]);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (name.trim().length < 2) {
      notify?.('Please enter a community name (at least 2 characters).');
      return;
    }
    setBusy(true);
    try {
      await api('/communities', {
        name: name.trim(),
        description: description.trim(),
        icon,
        allowMemberInvites,
        inviteUsernames: selectedFriends
      });
      notify?.(`Created private community "${name.trim()}"!`);
      onCreated?.();
    } catch (err) {
      notify?.(err.message || 'Could not create community.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="social-modal-overlay" role="dialog" aria-modal="true" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="social-modal-card">
        <button type="button" className="social-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <h3 className="sm-title">Create Private Community</h3>
        <form onSubmit={handleSubmit} className="sm-form">
          <label className="sm-label">
            Community Icon
            <div className="sm-icon-picker">
              {COMMUNITY_ICONS.map(ic => (
                <button
                  key={ic}
                  type="button"
                  className={`sm-icon-opt ${icon === ic ? 'selected' : ''}`}
                  onClick={() => setIcon(ic)}
                >
                  {ic}
                </button>
              ))}
            </div>
          </label>

          <label className="sm-label">
            Community Name *
            <input
              type="text"
              required
              maxLength={48}
              placeholder="e.g. English Warriors"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </label>

          <label className="sm-label">
            Description (optional)
            <textarea
              rows={2}
              maxLength={240}
              placeholder="Daily vocabulary & friendly battles..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </label>

          <label className="sm-check-row">
            <input
              type="checkbox"
              checked={allowMemberInvites}
              onChange={e => setAllowMemberInvites(e.target.checked)}
            />
            <span>Allow members to invite their friends</span>
          </label>

          {friends.length > 0 && (
            <div className="sm-invite-box">
              <span className="sm-label-text">Invite Friends ({selectedFriends.length} selected)</span>
              <div className="sm-friends-checklist">
                {friends.map(f => (
                  <label key={f.username} className="sm-friend-pick">
                    <input
                      type="checkbox"
                      checked={selectedFriends.includes(f.username)}
                      onChange={() => toggleFriend(f.username)}
                    />
                    <span>{f.avatar || '🌱'} {f.name} (@{f.username})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button type="submit" className="social-cta-green full" disabled={busy}>
            {busy ? 'Creating…' : 'Create Private Community'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function CommunityDetailModal({ api, user, communityId, friends = [], notify, onClose, onChanged }) {
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editIcon, setEditIcon] = useState('🌟');
  const [inviteSelected, setInviteSelected] = useState([]);
  const [transferTo, setTransferTo] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadCommunity() {
    setLoading(true);
    try {
      const res = await api(`/communities/${encodeURIComponent(communityId)}`);
      const c = res?.community;
      setCommunity(c);
      if (c) {
        setEditName(c.name || '');
        setEditDesc(c.description || '');
        setEditIcon(c.icon || '🌟');
        const others = (c.members || []).filter(m => m.username !== user.username);
        if (others.length) setTransferTo(others[0].username);
      }
    } catch (e) {
      notify?.(e.message || 'Could not load community.');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCommunity();
  }, [communityId]);

  const isOwner = community?.myRole === 'owner';
  const canInvite = isOwner || community?.myRole === 'admin' || community?.allowMemberInvites;
  const memberSet = new Set((community?.members || []).map(m => m.username));
  const pendingSet = new Set((community?.pendingInvites || []).map(i => i.inviteeId));
  const invitableFriends = friends.filter(f => !memberSet.has(f.username) && !pendingSet.has(f.username));

  async function handleSaveSettings(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/communities/${encodeURIComponent(communityId)}`, {
        name: editName,
        description: editDesc,
        icon: editIcon
      }, 'PATCH');
      setEditing(false);
      await loadCommunity();
      await onChanged?.();
      notify?.('Community updated!');
    } catch (err) {
      notify?.(err.message || 'Update failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleInviteFriends() {
    if (!inviteSelected.length) return;
    setBusy(true);
    try {
      const res = await api(`/communities/${encodeURIComponent(communityId)}/invite`, { usernames: inviteSelected });
      notify?.(`Sent ${res.invited?.length || 0} community invitation(s)!`);
      setInviteSelected([]);
      await loadCommunity();
    } catch (err) {
      notify?.(err.message || 'Invite failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleMemberAction(targetUsername, payload) {
    setBusy(true);
    try {
      await api(`/communities/${encodeURIComponent(communityId)}/members/${encodeURIComponent(targetUsername)}`, payload, 'PATCH');
      await loadCommunity();
      await onChanged?.();
    } catch (err) {
      notify?.(err.message || 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    const others = (community?.members || []).filter(m => m.username !== user.username);
    if (isOwner && others.length > 0 && !transferTo) {
      notify?.('Select a member to receive ownership before leaving.');
      return;
    }
    setBusy(true);
    try {
      await api(`/communities/${encodeURIComponent(communityId)}/leave`, isOwner && others.length ? { transferToUsername: transferTo } : {});
      notify?.('Left community.');
      await onChanged?.();
      onClose();
    } catch (err) {
      notify?.(err.message || 'Could not leave community.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await api(`/communities/${encodeURIComponent(communityId)}`, undefined, 'DELETE');
      notify?.('Community deleted.');
      await onChanged?.();
      onClose();
    } catch (err) {
      notify?.(err.message || 'Could not delete community.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="social-modal-overlay" role="dialog" aria-modal="true" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="social-modal-card wide">
        <button type="button" className="social-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {loading || !community ? (
          <div className="social-modal-loading">Loading community…</div>
        ) : (
          <div className="cd-wrap">
            <div className="cd-header">
              <span className="comm-emoji-badge lg">{community.icon || '🌟'}</span>
              <div className="cd-header-text">
                <h3>{community.name}</h3>
                <p>{community.description || 'Private study community'}</p>
                <small><Users size={12} /> {community.memberCount} members · Created {new Date(community.createdAt).toLocaleDateString()}</small>
              </div>
              {isOwner && (
                <button type="button" className="cd-edit-btn" onClick={() => setEditing(e => !e)}>
                  <Edit3 size={15} />
                </button>
              )}
            </div>

            {editing && isOwner && (
              <form onSubmit={handleSaveSettings} className="cd-edit-form">
                <div className="sm-icon-picker">
                  {COMMUNITY_ICONS.map(ic => (
                    <button key={ic} type="button" className={`sm-icon-opt ${editIcon === ic ? 'selected' : ''}`} onClick={() => setEditIcon(ic)}>{ic}</button>
                  ))}
                </div>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} maxLength={48} required />
                <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={240} placeholder="Description" />
                <button type="submit" className="social-cta-green compact" disabled={busy}>Save Changes</button>
              </form>
            )}

            <div className="cd-section">
              <span className="social-sub-label">MEMBERS ({community.members?.length || 0})</span>
              <div className="cd-members-list">
                {(community.members || []).map(m => (
                  <div key={m.username} className="cd-member-row">
                    <span className={`avatar small ${m.avatarColor || 'lime'}`}>{m.avatar || '🌱'}</span>
                    <div className="cd-member-meta">
                      <b>{m.name} {m.username === user.username ? '(You)' : ''}</b>
                      <small>@{m.username} · {m.cefrLevel} · {m.xp} XP</small>
                    </div>
                    <span className={`comm-role-tag ${m.role}`}>
                      {m.role === 'owner' && <Crown size={10} />}
                      {m.role === 'admin' && <ShieldCheck size={10} />}
                      {m.role}
                    </span>
                    {isOwner && m.username !== user.username && (
                      <div className="cd-role-btns">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleMemberAction(m.username, { action: 'set_role', role: m.role === 'admin' ? 'member' : 'admin' })}
                        >
                          {m.role === 'admin' ? 'Demote' : 'Make Admin'}
                        </button>
                        <button
                          type="button"
                          className="danger"
                          disabled={busy}
                          onClick={() => handleMemberAction(m.username, { action: 'remove' })}
                        >
                          Kick
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {canInvite && invitableFriends.length > 0 && (
              <div className="cd-section">
                <span className="social-sub-label">INVITE FRIENDS TO COMMUNITY</span>
                <div className="sm-friends-checklist">
                  {invitableFriends.map(f => (
                    <label key={f.username} className="sm-friend-pick">
                      <input
                        type="checkbox"
                        checked={inviteSelected.includes(f.username)}
                        onChange={() => setInviteSelected(p => p.includes(f.username) ? p.filter(x => x !== f.username) : [...p, f.username])}
                      />
                      <span>{f.avatar || '🌱'} {f.name} (@{f.username})</span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="social-cta-green compact"
                  style={{ marginTop: '8px' }}
                  disabled={busy || !inviteSelected.length}
                  onClick={handleInviteFriends}
                >
                  <UserPlus size={14} /> Invite Selected ({inviteSelected.length})
                </button>
              </div>
            )}

            <div className="cd-footer">
              {isOwner && (community.members || []).length > 1 && (
                <div className="cd-transfer-box">
                  <label>Transfer ownership before leaving:</label>
                  <select value={transferTo} onChange={e => setTransferTo(e.target.value)}>
                    {(community.members || []).filter(m => m.username !== user.username).map(m => (
                      <option key={m.username} value={m.username}>{m.name} (@{m.username})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="cd-footer-btns">
                <button type="button" className="social-subtle-btn" disabled={busy} onClick={handleLeave}>
                  <LogOut size={14} /> Leave Community
                </button>
                {isOwner && (
                  <button type="button" className="social-danger-outline" disabled={busy} onClick={handleDelete}>
                    <Trash2 size={14} /> Delete Community
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function NotificationsModal({
  api,
  socialOverview,
  notify,
  notifPermission,
  onEnableDeviceAlerts,
  onSendTestAlert,
  onClose,
  onChanged,
  onJoinGameFromInvite,
  onOpenFriendsTab
}) {
  const notifications = socialOverview?.notifications || [];
  const gameInvitations = socialOverview?.gameInvitations || [];
  const incomingRequests = socialOverview?.incomingRequests || [];
  const communityInvitations = socialOverview?.communityInvitations || [];
  const [busyId, setBusyId] = useState('');

  async function markAllRead() {
    try {
      await api('/notifications/read', { ids: 'all' });
      await onChanged?.();
    } catch { }
  }

  async function respondGame(invId, action) {
    setBusyId(invId);
    try {
      const res = await api(`/games/invites/${encodeURIComponent(invId)}/respond`, { action });
      if (action === 'accept' && res?.game) {
        const matchedInv = gameInvitations.find(x => x.id === invId);
        onClose();
        onJoinGameFromInvite?.(res.game, { senderName: matchedInv?.senderName });
      } else {
        notify?.('Challenge declined.');
      }
      await onChanged?.();
    } catch (e) {
      notify?.(e.message || 'Unable to respond to invitation.');
      await onChanged?.();
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="social-modal-overlay" role="dialog" aria-modal="true" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="social-modal-card wide">
        <button type="button" className="social-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="notif-modal-head">
          <div>
            <h3><Bell size={18} /> Notifications</h3>
          </div>
          {notifications.some(n => !n.isRead) && (
            <button type="button" className="notif-mark-read" onClick={markAllRead}>
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        {notifPermission && notifPermission !== 'granted' && notifPermission !== 'unsupported' && onEnableDeviceAlerts && (
          <div className="notif-device-banner">
            <span>Turn on phone status-bar alerts so you never miss challenges or daily reminders.</span>
            <button type="button" onClick={onEnableDeviceAlerts}>Enable Alerts</button>
          </div>
        )}
        {notifPermission === 'granted' && onSendTestAlert && (
          <div className="notif-device-banner ok">
            <span>Phone status-bar alerts &amp; daily reminders are active.</span>
            <button type="button" onClick={onSendTestAlert}>Test Alert</button>
          </div>
        )}

        {/* Actionable Live Game Invites */}
        {gameInvitations.length > 0 && (
          <div className="notif-action-block">
            {gameInvitations.map(gi => (
              <div key={gi.id} className="social-game-invite-card">
                <div className="sgi-top">
                  <span className="sgi-badge"><Gamepad2 size={13} /> GAME INVITATION!</span>
                  <span className="sgi-players">Players: {gi.playerCount}/{gi.maxPlayers}</span>
                </div>
                <p className="sgi-message">
                  <strong>{gi.senderName}</strong> challenged you to <b>{gi.topic}</b> ({gi.difficulty}).
                </p>
                <div className="sgi-actions">
                  <button
                    type="button"
                    className="sgi-accept-btn"
                    disabled={busyId === gi.id}
                    onClick={() => respondGame(gi.id, 'accept')}
                  >
                    {busyId === gi.id ? 'Joining…' : 'ACCEPT CHALLENGE'}
                  </button>
                  <button
                    type="button"
                    className="sgi-decline-btn"
                    disabled={busyId === gi.id}
                    onClick={() => respondGame(gi.id, 'decline')}
                  >
                    DECLINE
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {(incomingRequests.length > 0 || communityInvitations.length > 0) && (
          <button
            type="button"
            className="notif-shortcut-btn"
            onClick={() => {
              onClose();
              onOpenFriendsTab?.('requests');
            }}
          >
            {incomingRequests.length + communityInvitations.length} pending friend / community request(s) — Review in Friends
          </button>
        )}

        <div className="notif-list">
          {notifications.length === 0 ? (
            <div className="social-empty-card compact">
              <Bell size={24} />
              <p>All caught up! New friend, community, and game alerts appear here.</p>
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`notif-row ${!n.isRead ? 'unread' : ''}`}>
                <div className="notif-row-main">
                  <b>{n.title}</b>
                  <p>{n.message}</p>
                  <small>{new Date(n.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
                </div>
                {!n.isRead && <span className="notif-unread-dot" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
