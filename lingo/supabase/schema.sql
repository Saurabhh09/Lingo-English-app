-- Lingo database. Run once in the Supabase SQL Editor.
-- Username-only auth is managed by the trusted Node server (scrypt passwords).
-- Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
-- Tables contain JSONB application records and are private by default.

create table if not exists public.lingo_accounts (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists public.lingo_sessions (
  id text primary key, -- SHA-256 hash of the random session token
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists public.lingo_progress (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists public.lingo_games (
  id text primary key, -- unique six-character room code
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.lingo_accounts enable row level security;
alter table public.lingo_sessions enable row level security;
alter table public.lingo_progress enable row level security;
alter table public.lingo_games enable row level security;

-- There are deliberately NO public RLS policies. Only the trusted backend
-- service role can access records, after application-level authorization.
revoke all on public.lingo_accounts, public.lingo_sessions,
  public.lingo_progress, public.lingo_games from anon, authenticated;
grant all on public.lingo_accounts, public.lingo_sessions,
  public.lingo_progress, public.lingo_games to service_role;

create index if not exists lingo_session_expiry
  on public.lingo_sessions ((payload->>'expires'));
create index if not exists lingo_game_status
  on public.lingo_games ((payload->>'status'));
