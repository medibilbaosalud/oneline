-- Create a public bucket for feedback attachments and allow uploads/reads.
insert into storage.buckets (id, name, public)
values ('feedback-attachments', 'feedback-attachments', true)
on conflict (id) do nothing;

create policy "Anyone can upload feedback attachments" on storage.objects
  for insert
  with check (bucket_id = 'feedback-attachments');

create policy "Anyone can read feedback attachments" on storage.objects
  for select
  using (bucket_id = 'feedback-attachments');
