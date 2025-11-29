
-- Ensure UUID generator is available for the primary key default.
create extension if not exists "pgcrypto";

create table if not exists public.summary_histories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  from_date date,
  to_date date,
  period text,
  cipher_b64 text not null,
  iv_b64 text not null
);

alter table public.summary_histories enable row level security;

create index if not exists summary_histories_user_created_idx
  on public.summary_histories (user_id, created_at desc);

create policy "Users can manage their summary history"
  on public.summary_histories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Optional: limit anonymous access strictly to authenticated users
-- (Supabase by default blocks anon with RLS enabled).
