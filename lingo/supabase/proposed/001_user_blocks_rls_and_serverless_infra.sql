-- Proposed migration (DO NOT apply automatically — review & apply in Supabase Dashboard / CLI)
-- Finding: SEC-05 (Missing SELECT policy on public.user_blocks despite GRANT SELECT TO authenticated)
--
-- Rollback SQL:
--   DROP POLICY IF EXISTS ub_own_select ON public.user_blocks;

BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_blocks' AND policyname = 'ub_own_select'
  ) THEN
    CREATE POLICY ub_own_select ON public.user_blocks
      FOR SELECT TO authenticated
      USING ((select auth.uid())::text = blocker_id);
  END IF;
END $$;

COMMIT;
