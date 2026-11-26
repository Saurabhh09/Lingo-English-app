-- ============================================================================
-- LINGO PERFORMANCE & RLS OPTIMIZATION MIGRATION
-- Version: 20261126000002
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS user_badges_read_own ON public.user_badges;
CREATE POLICY user_badges_read_own ON public.user_badges
  FOR SELECT TO authenticated
  USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS achievement_progress_read_own ON public.achievement_progress;
CREATE POLICY achievement_progress_read_own ON public.achievement_progress
  FOR SELECT TO authenticated
  USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS user_rewards_read_own ON public.user_rewards;
CREATE POLICY user_rewards_read_own ON public.user_rewards
  FOR SELECT TO authenticated
  USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS wallet_tx_read_own ON public.wallet_transactions;
CREATE POLICY wallet_tx_read_own ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS fr_own_select ON public.friend_requests;
CREATE POLICY fr_own_select ON public.friend_requests
  FOR SELECT TO authenticated
  USING ((select auth.uid())::text = sender_id OR (select auth.uid())::text = receiver_id);

DROP POLICY IF EXISTS fs_own_select ON public.friendships;
CREATE POLICY fs_own_select ON public.friendships
  FOR SELECT TO authenticated
  USING ((select auth.uid())::text = user_one_id OR (select auth.uid())::text = user_two_id);

DROP POLICY IF EXISTS comm_member_select ON public.communities;
CREATE POLICY comm_member_select ON public.communities
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.community_members m
    WHERE m.community_id = id AND m.user_id = (select auth.uid())::text
  ));

DROP POLICY IF EXISTS cm_member_select ON public.community_members;
CREATE POLICY cm_member_select ON public.community_members
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.community_members m
    WHERE m.community_id = community_id AND m.user_id = (select auth.uid())::text
  ));

DROP POLICY IF EXISTS ci_own_select ON public.community_invitations;
CREATE POLICY ci_own_select ON public.community_invitations
  FOR SELECT TO authenticated
  USING ((select auth.uid())::text = inviter_id OR (select auth.uid())::text = invitee_id);

DROP POLICY IF EXISTS gi_own_select ON public.game_invitations;
CREATE POLICY gi_own_select ON public.game_invitations
  FOR SELECT TO authenticated
  USING ((select auth.uid())::text = sender_id OR (select auth.uid())::text = receiver_id);

DROP POLICY IF EXISTS notif_own_select ON public.notifications;
CREATE POLICY notif_own_select ON public.notifications
  FOR SELECT TO authenticated
  USING ((select auth.uid())::text = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_blocks_pair
  ON public.user_blocks (blocker_id, blocked_id);

CREATE INDEX IF NOT EXISTS idx_friend_requests_status_receiver
  ON public.friend_requests (status, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_invites_status_receiver
  ON public.game_invitations (status, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lingo_accounts_lingoid
  ON public.lingo_accounts ((payload->>'lingoId'));

COMMIT;
