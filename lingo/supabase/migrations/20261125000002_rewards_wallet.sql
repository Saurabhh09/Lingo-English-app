-- ============================================================================
-- LINGO PHASE 13: GAMIFIED REWARD CHESTS, GEMS WALLET & MILESTONES SCHEMA
-- Version: 20261125000002
-- Description: Introduces reward_definitions, user_rewards, and atomic
--              wallet_transactions ledger with RLS and unique constraints.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.reward_definitions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('unit', 'unit_count', 'section', 'cefr_level')),
  trigger_reference text NOT NULL,
  xp_amount integer NOT NULL DEFAULT 0 CHECK (xp_amount >= 0),
  gems_amount integer NOT NULL DEFAULT 0 CHECK (gems_amount >= 0),
  badge_id text REFERENCES public.badges(id) ON DELETE SET NULL,
  certificate_title text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_rewards (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  reward_id text NOT NULL REFERENCES public.reward_definitions(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('locked', 'available', 'claimed')),
  unlocked_at timestamptz,
  claimed_at timestamptz,
  CONSTRAINT uq_user_reward UNIQUE (user_id, reward_id)
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  currency text NOT NULL CHECK (currency IN ('xp', 'gems')),
  amount integer NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_wallet_tx_source UNIQUE (user_id, currency, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_reward_defs_trigger ON public.reward_definitions (trigger_type, trigger_reference);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_status ON public.user_rewards (user_id, status);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created ON public.wallet_transactions (user_id, created_at DESC);

ALTER TABLE public.reward_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.reward_definitions, public.user_rewards, public.wallet_transactions FROM anon;
GRANT SELECT ON public.reward_definitions TO authenticated;
GRANT SELECT ON public.user_rewards, public.wallet_transactions TO authenticated;
GRANT ALL ON public.reward_definitions, public.user_rewards, public.wallet_transactions TO service_role;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reward_definitions' AND policyname = 'reward_defs_read_authenticated') THEN
    CREATE POLICY reward_defs_read_authenticated ON public.reward_definitions FOR SELECT TO authenticated USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_rewards' AND policyname = 'user_rewards_read_own') THEN
    CREATE POLICY user_rewards_read_own ON public.user_rewards FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallet_transactions' AND policyname = 'wallet_tx_read_own') THEN
    CREATE POLICY wallet_tx_read_own ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
  END IF;
END $$;

COMMIT;
