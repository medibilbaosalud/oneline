create extension if not exists "pgcrypto";

create table if not exists public.user_vault_status (
  user_id uuid primary key references auth.users (id) on delete cascade,
  has_passphrase boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_vault_status enable row level security;

create policy "Users can view their vault status" on public.user_vault_status
  for select
  using (auth.uid() = user_id);

create policy "Users can update their vault status" on public.user_vault_status
  for insert
  with check (auth.uid() = user_id);

create policy "Users can modify their vault status" on public.user_vault_status
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

