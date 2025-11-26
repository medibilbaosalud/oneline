-- Create table for user-submitted feedback. Allows optional user association.
create table if not exists public.user_feedback (
  id bigserial primary key,
  user_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  type text not null,
  message text not null,
  page text,
  status text not null default 'open',
  metadata jsonb
);

alter table public.user_feedback enable row level security;

-- Allow authenticated and anonymous users to submit feedback. Enforce ownership when a user id is provided.
create policy "Anyone can submit feedback" on public.user_feedback
  for insert
  with check ((auth.uid() is null and user_id is null) or auth.uid() = user_id);

-- Allow users to read only their own feedback rows; admins can extend via additional policies if needed.
create policy "Users can view their feedback" on public.user_feedback
  for select
  using (auth.uid() = user_id);

create index if not exists user_feedback_user_created_idx
  on public.user_feedback (user_id, created_at desc);
