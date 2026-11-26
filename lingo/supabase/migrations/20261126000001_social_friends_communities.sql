-- ============================================================================
-- LINGO SOCIAL PHASE 14: FRIENDS, COMMUNITIES, GAME INVITATIONS & NOTIFICATIONS
-- Version: 20261126000001
-- Description: Normalized social tables with foreign keys, unique constraints,
--              indexes, and Row Level Security.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.friend_requests (
  id text PRIMARY KEY,
  sender_id text NOT NULL,
  receiver_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT chk_friend_request_not_self CHECK (sender_id <> receiver_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_friend_request_pending_pair
  ON public.friend_requests (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.friendships (
  id text PRIMARY KEY,
  user_one_id text NOT NULL,
  user_two_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_friendship_order CHECK (user_one_id < user_two_id),
  CONSTRAINT uq_friendship_pair UNIQUE (user_one_id, user_two_id)
);

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id text PRIMARY KEY,
  blocker_id text NOT NULL,
  blocked_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_block_not_self CHECK (blocker_id <> blocked_id),
  CONSTRAINT uq_block_pair UNIQUE (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS public.communities (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon_url text NOT NULL DEFAULT '🌟',
  allow_member_invites boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_members (
  id text PRIMARY KEY,
  community_id text NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_community_member UNIQUE (community_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_invitations (
  id text PRIMARY KEY,
  community_id text NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  inviter_id text NOT NULL,
  invitee_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_community_invite_pending
  ON public.community_invitations (community_id, invitee_id)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.game_invitations (
  id text PRIMARY KEY,
  game_id text NOT NULL,
  sender_id text NOT NULL,
  receiver_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz,
  CONSTRAINT uq_game_invite_per_user UNIQUE (game_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  type text NOT NULL CHECK (type IN (
    'friend_request',
    'friendship_update',
    'community_invitation',
    'community_update',
    'game_invitation'
  )),
  title text NOT NULL,
  message text NOT NULL,
  related_entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for high-frequency lookups
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests (receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests (sender_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_u1 ON public.friendships (user_one_id);
CREATE INDEX IF NOT EXISTS idx_friendships_u2 ON public.friendships (user_two_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON public.community_members (user_id);
CREATE INDEX IF NOT EXISTS idx_community_invites_invitee ON public.community_invitations (invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_game_invites_receiver ON public.game_invitations (receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_game_invites_game ON public.game_invitations (game_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.friend_requests, public.friendships, public.user_blocks,
  public.communities, public.community_members, public.community_invitations,
  public.game_invitations, public.notifications FROM anon;

GRANT SELECT ON public.friend_requests, public.friendships, public.user_blocks,
  public.communities, public.community_members, public.community_invitations,
  public.game_invitations, public.notifications TO authenticated;

GRANT ALL ON public.friend_requests, public.friendships, public.user_blocks,
  public.communities, public.community_members, public.community_invitations,
  public.game_invitations, public.notifications TO service_role;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friend_requests' AND policyname = 'fr_own_select') THEN
    CREATE POLICY fr_own_select ON public.friend_requests FOR SELECT TO authenticated
      USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'fs_own_select') THEN
    CREATE POLICY fs_own_select ON public.friendships FOR SELECT TO authenticated
      USING (auth.uid()::text = user_one_id OR auth.uid()::text = user_two_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'communities' AND policyname = 'comm_member_select') THEN
    CREATE POLICY comm_member_select ON public.communities FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.community_members m WHERE m.community_id = id AND m.user_id = auth.uid()::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_members' AND policyname = 'cm_member_select') THEN
    CREATE POLICY cm_member_select ON public.community_members FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.community_members m WHERE m.community_id = community_id AND m.user_id = auth.uid()::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_invitations' AND policyname = 'ci_own_select') THEN
    CREATE POLICY ci_own_select ON public.community_invitations FOR SELECT TO authenticated
      USING (auth.uid()::text = inviter_id OR auth.uid()::text = invitee_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_invitations' AND policyname = 'gi_own_select') THEN
    CREATE POLICY gi_own_select ON public.game_invitations FOR SELECT TO authenticated
      USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notif_own_select') THEN
    CREATE POLICY notif_own_select ON public.notifications FOR SELECT TO authenticated
      USING (auth.uid()::text = user_id);
  END IF;
END $$;

COMMIT;
