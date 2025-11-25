-- Daily usage tracking for summaries
create table if not exists public.summary_usage_daily (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  standard_uses integer not null default 0,
  advanced_uses integer not null default 0,
  total_tokens bigint not null default 0,
  constraint summary_usage_daily_user_date_unique unique (user_id, date)
);

alter table public.summary_usage_daily enable row level security;

create policy "Users can manage their own daily summary usage"
  on public.summary_usage_daily
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists summary_usage_daily_user_date_idx
  on public.summary_usage_daily (user_id, date desc);

-- Minute-level token tracking for soft TPM guards
create table if not exists public.summary_usage_minute (
  id bigserial primary key,
  model text not null,
  minute_start timestamptz not null,
  tokens_used bigint not null default 0,
  constraint summary_usage_minute_unique unique (model, minute_start)
);

alter table public.summary_usage_minute enable row level security;

create policy "TPM usage readable"
  on public.summary_usage_minute
  for select
  using (true);

create policy "TPM usage writable"
  on public.summary_usage_minute
  for all
  using (true)
  with check (true);

create index if not exists summary_usage_minute_idx
  on public.summary_usage_minute (model, minute_start desc);
