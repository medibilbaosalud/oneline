-- Function to handle new user creation
create or replace function public.handle_new_user_vault_status()
returns trigger as $$
begin
  insert into public.user_vault_status (user_id, has_passphrase)
  values (new.id, false)
  on conflict (user_id) do nothing; -- Safety: prevent error if row already exists
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function
-- Check if trigger exists first to avoid errors on repeated runs (idempotency)
drop trigger if exists on_auth_user_created_vault_status on auth.users;

create trigger on_auth_user_created_vault_status
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user_vault_status();
