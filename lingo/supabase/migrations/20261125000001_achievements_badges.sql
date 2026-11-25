-- ============================================================================
-- LINGO PHASE 12: ACHIEVEMENT & BADGE SYSTEM SCHEMA
-- Version: 20261125000001
-- Description: Introduces relational badges catalog, user_badges award log,
--              and achievement_progress tracking tables with RLS & indexes.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.badges (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('unit', 'section', 'cefr', 'streak', 'learning')),
  icon text NOT NULL,
  rarity text NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  unlock_condition jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  badge_id text NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  related_entity_type text,
  related_entity_id text,
  CONSTRAINT uq_user_badge UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS public.achievement_progress (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  achievement_id text NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  current_progress integer NOT NULL DEFAULT 0 CHECK (current_progress >= 0),
  target_progress integer NOT NULL DEFAULT 1 CHECK (target_progress >= 1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_achievement_progress UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_badges_category ON public.badges (category);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_earned ON public.user_badges (user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON public.user_badges (badge_id);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_user ON public.achievement_progress (user_id);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_progress ENABLE ROW LEVEL SECURITY;

-- Service role manages authoritative validation; users can only read their own records if using Supabase JWTs.
REVOKE ALL ON public.badges, public.user_badges, public.achievement_progress FROM anon;
GRANT SELECT ON public.badges TO authenticated;
GRANT SELECT ON public.user_badges, public.achievement_progress TO authenticated;
GRANT ALL ON public.badges, public.user_badges, public.achievement_progress TO service_role;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'badges' AND policyname = 'badges_read_authenticated') THEN
    CREATE POLICY badges_read_authenticated ON public.badges FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_badges' AND policyname = 'user_badges_read_own') THEN
    CREATE POLICY user_badges_read_own ON public.user_badges FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'achievement_progress' AND policyname = 'achievement_progress_read_own') THEN
    CREATE POLICY achievement_progress_read_own ON public.achievement_progress FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
  END IF;
END $$;

COMMIT;
