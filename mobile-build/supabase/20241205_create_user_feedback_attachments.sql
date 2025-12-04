-- Create table to store feedback attachments outside of the user_feedback.metadata payload.
create table if not exists public.user_feedback_attachments (
  id uuid primary key default gen_random_uuid(),
  feedback_id bigint not null references public.user_feedback (id) on delete cascade,
  user_id uuid references auth.users (id),
  name text not null,
  size bigint not null,
  type text not null,
  path text not null,
  public_url text not null,
  stored_inline boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.user_feedback_attachments enable row level security;

-- Allow attachments to be inserted when they reference feedback the caller owns (or anonymous feedback rows).
create policy "Anyone can add attachments for their feedback" on public.user_feedback_attachments
  for insert
  with check (
    exists (
      select 1
      from public.user_feedback f
      where f.id = feedback_id
        and (
          (auth.uid() is null and f.user_id is null and user_id is null)
          or (auth.uid() = f.user_id and user_id = auth.uid())
        )
    )
  );

-- Allow users to read attachments linked to their feedback rows.
create policy "Users can view their attachments" on public.user_feedback_attachments
  for select using (
    exists (
      select 1
      from public.user_feedback f
      where f.id = feedback_id
        and (
          (auth.uid() is null and f.user_id is null and user_id is null)
          or (auth.uid() = f.user_id and user_id = auth.uid())
        )
    )
  );

create index if not exists user_feedback_attachments_feedback_created_idx
  on public.user_feedback_attachments (feedback_id, created_at desc);
