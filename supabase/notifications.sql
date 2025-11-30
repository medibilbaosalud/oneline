-- Ensure notifications table supports tracking when items were read so cleanup can purge them after 24 hours.
alter table public.notifications
  add column if not exists read_at timestamptz;

-- Optional: index read_at for faster cleanup queries.
create index if not exists notifications_read_at_idx on public.notifications (user_id, read_at);
