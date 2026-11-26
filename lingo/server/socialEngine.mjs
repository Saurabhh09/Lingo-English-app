/**
 * Lingo Social Engine: Friends, Communities, Game Invitations, Presence & Notifications.
 * Persists cleanly inside `social` state via `db` (works on Supabase JSONB/Relational + local data.json)
 * and mirrors relational writes to Supabase SQL tables when connected.
 */

import { createHash, randomBytes } from 'node:crypto';
import { CURRICULUM_CATALOG } from './curriculumCatalog.mjs';

const ONLINE_WINDOW_MS = 3 * 60 * 1000;
const INVITE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const GAME_INVITE_TTL_MS = 2 * 60 * 60 * 1000;

export function deriveLingoId(username) {
  const digest = createHash('sha256').update(String(username || '').toLowerCase()).digest('hex').slice(0, 6).toUpperCase();
  return `LNG-${digest}`;
}

export function ensureSocialState(raw) {
  const s = (raw && typeof raw === 'object') ? raw : {};
  if (!Array.isArray(s.friendRequests)) s.friendRequests = [];
  if (!Array.isArray(s.friendships)) s.friendships = [];
  if (!Array.isArray(s.blocks)) s.blocks = [];
  if (!Array.isArray(s.communities)) s.communities = [];
  if (!Array.isArray(s.communityMembers)) s.communityMembers = [];
  if (!Array.isArray(s.communityInvitations)) s.communityInvitations = [];
  if (!Array.isArray(s.gameInvitations)) s.gameInvitations = [];
  if (!Array.isArray(s.notifications)) s.notifications = [];
  if (!s.presence || typeof s.presence !== 'object') s.presence = {};
  return s;
}

export function deriveUserCefr(progress) {
  const completedSet = new Set(Array.isArray(progress?.completed) ? progress.completed : []);
  let currentLevel = 'Pre-A1';
  for (const lvl of CURRICULUM_CATALOG.levels) {
    const lessonIds = (lvl.sections || []).flatMap(sec =>
      (sec.units || []).flatMap(u => (u.lessons || []).map(l => l.id))
    );
    const doneCount = lessonIds.filter(id => completedSet.has(id)).length;
    if (doneCount > 0) {
      currentLevel = lvl.code || lvl.id.toUpperCase();
    }
    if (doneCount < lessonIds.length) {
      break;
    }
  }
  return currentLevel;
}

export function buildPublicProfileCard(account, progress, presenceMap = {}, nowMs = Date.now()) {
  if (!account) return null;
  const username = account.username;
  const lastActiveAt = presenceMap[username] || 0;
  return {
    username,
    lingoId: account.lingoId || deriveLingoId(username),
    name: account.name || username,
    avatar: account.avatar || '🌱',
    avatarColor: account.avatarColor || 'lime',
    xp: progress?.xp || 0,
    streak: progress?.streak || 0,
    words: progress?.words || 0,
    lessonsCompleted: (progress?.completed || []).length,
    badgesCount: Object.keys(progress?.badges || {}).length,
    cefrLevel: deriveUserCefr(progress),
    isOnline: lastActiveAt > 0 && (nowMs - lastActiveAt) <= ONLINE_WINDOW_MS,
    lastActiveAt: lastActiveAt || null
  };
}

export function pairKey(u1, u2) {
  const a = String(u1 || '').toLowerCase();
  const b = String(u2 || '').toLowerCase();
  return a < b ? [a, b] : [b, a];
}

export function isBlockedBetween(social, u1, u2) {
  return social.blocks.some(
    b => (b.blockerId === u1 && b.blockedId === u2) || (b.blockerId === u2 && b.blockedId === u1)
  );
}

export function areFriends(social, u1, u2) {
  const [one, two] = pairKey(u1, u2);
  return social.friendships.some(f => f.userOneId === one && f.userTwoId === two);
}

export function getFriendUsernames(social, username) {
  const out = [];
  for (const f of social.friendships) {
    if (f.userOneId === username) out.push(f.userTwoId);
    else if (f.userTwoId === username) out.push(f.userOneId);
  }
  return out;
}

export function getFriendStatus(social, me, other) {
  if (!other || me === other) return 'self';
  if (areFriends(social, me, other)) return 'friends';
  const pendingOut = social.friendRequests.find(
    r => r.senderId === me && r.receiverId === other && r.status === 'pending'
  );
  if (pendingOut) return 'request_sent';
  const pendingIn = social.friendRequests.find(
    r => r.senderId === other && r.receiverId === me && r.status === 'pending'
  );
  if (pendingIn) return 'request_received';
  return 'not_connected';
}

export function pushNotification(social, { userId, type, title, message, relatedEntityId = null, metadata = {} }, nowMs = Date.now()) {
  const item = {
    id: `ntf_${randomBytes(8).toString('hex')}`,
    userId,
    type,
    title,
    message,
    relatedEntityId,
    metadata,
    isRead: false,
    createdAt: new Date(nowMs).toISOString()
  };
  social.notifications.unshift(item);
  // Keep capped per system memory safety while maintaining recent history per user
  if (social.notifications.length > 5000) {
    social.notifications = social.notifications.slice(0, 5000);
  }
  return item;
}

export function expireStaleInvitations(social, nowMs = Date.now()) {
  let dirty = false;
  for (const inv of social.communityInvitations) {
    if (inv.status === 'pending' && inv.expiresAt && new Date(inv.expiresAt).getTime() <= nowMs) {
      inv.status = 'expired';
      dirty = true;
    }
  }
  for (const gInv of social.gameInvitations) {
    if (gInv.status === 'pending' && gInv.expiresAt && new Date(gInv.expiresAt).getTime() <= nowMs) {
      gInv.status = 'expired';
      dirty = true;
    }
  }
  return dirty;
}

/**
 * Best-effort relational sync helper to Supabase tables when SQL migration is applied.
 */
export async function syncSocialToSupabase(supabase, social, { tables = null } = {}) {
  if (!supabase) return;
  if (Array.isArray(tables) && tables.length === 0) return;
  const want = name => !Array.isArray(tables) || tables.includes(name);
  const ops = [];

  try {
    if (want('friendships') && social.friendships.length) {
      ops.push(
        supabase.from('friendships').upsert(
          social.friendships.map(f => ({
            id: f.id,
            user_one_id: f.userOneId,
            user_two_id: f.userTwoId,
            created_at: f.createdAt
          })),
          { onConflict: 'user_one_id,user_two_id' }
        )
      );
    }
    if (want('friendRequests') && social.friendRequests.length) {
      ops.push(
        supabase.from('friend_requests').upsert(
          social.friendRequests.slice(-80).map(r => ({
            id: r.id,
            sender_id: r.senderId,
            receiver_id: r.receiverId,
            status: r.status,
            created_at: r.createdAt,
            responded_at: r.respondedAt || null
          })),
          { onConflict: 'id' }
        )
      );
    }
    if (want('communities') && social.communities.length) {
      ops.push(
        supabase.from('communities').upsert(
          social.communities.map(c => ({
            id: c.id,
            owner_id: c.ownerId,
            name: c.name,
            description: c.description || '',
            icon_url: c.icon || '🌟',
            allow_member_invites: !!c.allowMemberInvites,
            created_at: c.createdAt
          })),
          { onConflict: 'id' }
        )
      );
    }
    if (want('communityMembers') && social.communityMembers.length) {
      ops.push(
        supabase.from('community_members').upsert(
          social.communityMembers.map(m => ({
            id: m.id,
            community_id: m.communityId,
            user_id: m.userId,
            role: m.role,
            joined_at: m.joinedAt
          })),
          { onConflict: 'community_id,user_id' }
        )
      );
    }
    if (want('communityInvitations') && social.communityInvitations.length) {
      ops.push(
        supabase.from('community_invitations').upsert(
          social.communityInvitations.slice(-80).map(i => ({
            id: i.id,
            community_id: i.communityId,
            inviter_id: i.inviterId,
            invitee_id: i.inviteeId,
            status: i.status,
            created_at: i.createdAt,
            responded_at: i.respondedAt || null,
            expires_at: i.expiresAt || null
          })),
          { onConflict: 'id' }
        )
      );
    }
    if (want('gameInvitations') && social.gameInvitations.length) {
      ops.push(
        supabase.from('game_invitations').upsert(
          social.gameInvitations.slice(-80).map(gi => ({
            id: gi.id,
            game_id: gi.gameId,
            sender_id: gi.senderId,
            receiver_id: gi.receiverId,
            status: gi.status,
            created_at: gi.createdAt,
            responded_at: gi.respondedAt || null,
            expires_at: gi.expiresAt || null
          })),
          { onConflict: 'game_id,receiver_id' }
        )
      );
    }
    if (want('notifications') && social.notifications.length) {
      ops.push(
        supabase.from('notifications').upsert(
          social.notifications.slice(0, 80).map(n => ({
            id: n.id,
            user_id: n.userId,
            type: n.type,
            title: n.title,
            message: n.message,
            related_entity_id: n.relatedEntityId || null,
            metadata: n.metadata || {},
            is_read: !!n.isRead,
            created_at: n.createdAt
          })),
          { onConflict: 'id' }
        )
      );
    }
    if (ops.length) {
      await Promise.all(ops);
    }
  } catch {
    // Graceful fallback: db JSON store stays authoritative if relational migration hasn't run yet.
  }
}

export { INVITE_TTL_MS, GAME_INVITE_TTL_MS };
