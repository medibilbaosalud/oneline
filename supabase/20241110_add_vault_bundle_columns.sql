-- Ensure the encrypted vault bundle columns exist on user_vaults so wrapped keys persist per account.
ALTER TABLE public.user_vaults
  ADD COLUMN IF NOT EXISTS wrapped_b64 text,
  ADD COLUMN IF NOT EXISTS iv_b64 text,
  ADD COLUMN IF NOT EXISTS salt_b64 text,
  ADD COLUMN IF NOT EXISTS version integer;

-- Backfill version to 1 when missing so older bundles remain compatible.
UPDATE public.user_vaults
SET version = 1
WHERE version IS NULL;
