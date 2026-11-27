-- Proposed migration (DO NOT apply automatically — review & apply in Supabase Dashboard / CLI)
-- Finding: SEC-02 (Distributed serverless rate limiting & indexed social lookups)
--
-- Rollback SQL:
--   DROP FUNCTION IF EXISTS public.lingo_consume_rate_limit(text, integer, integer);
--   DROP TABLE IF EXISTS public.lingo_rate_limits;
--   DROP INDEX IF EXISTS public.lingo_accounts_lingo_id_idx;
--   DROP INDEX IF EXISTS public.lingo_accounts_lingo_id_lower_idx;
--   DROP INDEX IF EXISTS public.lingo_accounts_name_lower_idx;

BEGIN;

CREATE TABLE IF NOT EXISTS public.lingo_rate_limits (
  key text PRIMARY KEY,
  req_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lingo_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lingo_rate_limits FROM anon, authenticated;
GRANT ALL ON public.lingo_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.lingo_consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms integer
)
RETURNS TABLE(allowed boolean, remaining integer, req_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now timestamptz := now();
  v_cutoff timestamptz := v_now - make_interval(secs => GREATEST(1, p_window_ms / 1000.0));
  v_count integer;
BEGIN
  INSERT INTO public.lingo_rate_limits (key, req_count, window_start, updated_at)
  VALUES (p_key, 1, v_now, v_now)
  ON CONFLICT (key) DO UPDATE SET
    req_count = CASE
      WHEN public.lingo_rate_limits.window_start <= v_cutoff THEN 1
      ELSE LEAST(public.lingo_rate_limits.req_count + 1, p_limit + 1)
    END,
    window_start = CASE
      WHEN public.lingo_rate_limits.window_start <= v_cutoff THEN v_now
      ELSE public.lingo_rate_limits.window_start
    END,
    updated_at = v_now
  RETURNING public.lingo_rate_limits.req_count INTO v_count;

  allowed := (v_count <= p_limit);
  remaining := GREATEST(0, p_limit - v_count);
  req_count := v_count;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.lingo_consume_rate_limit(text, integer, integer) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.lingo_consume_rate_limit(text, integer, integer) TO service_role;

-- Expression indexes to eliminate full-table scans on Lingo ID & social search
CREATE INDEX IF NOT EXISTS lingo_accounts_lingo_id_idx
  ON public.lingo_accounts ((payload->>'lingoId'));
CREATE INDEX IF NOT EXISTS lingo_accounts_lingo_id_lower_idx
  ON public.lingo_accounts (lower(payload->>'lingoId'));
CREATE INDEX IF NOT EXISTS lingo_accounts_name_lower_idx
  ON public.lingo_accounts (lower(payload->>'name'));

COMMIT;
