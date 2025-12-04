-- Track whether a user has created a vault passphrase.
create table if not exists public.user_vault_status (
  user_id uuid primary key references auth.users (id) on delete cascade,
  has_passphrase boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_vault_status_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_vault_status_set_updated_at
before update on public.user_vault_status
for each row execute procedure public.set_user_vault_status_updated_at();

alter table public.user_vault_status enable row level security;

create policy "Users can read their vault status" on public.user_vault_status
  for select using (auth.uid() = user_id);

create policy "Users can insert their vault status" on public.user_vault_status
  for insert with check (auth.uid() = user_id);

create policy "Users can update their vault status" on public.user_vault_status
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
