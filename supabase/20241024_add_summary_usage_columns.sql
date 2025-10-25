-- Adds rolling monthly summary usage counters for OneLine.
alter table public.user_settings
  add column if not exists summary_month_count integer not null default 0,
  add column if not exists summary_month_started_at timestamptz not null default date_trunc('month', timezone('utc', now()));

-- Normalise existing rows so the new window begins this month.
update public.user_settings
set summary_month_started_at = date_trunc('month', timezone('utc', now()))
where summary_month_started_at is null;
