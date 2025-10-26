-- Migrate summary preferences to the encrypted-vault table so they live alongside the user's bundle.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'journal_digest_freq'
  ) THEN
    CREATE TYPE public.journal_digest_freq AS ENUM ('weekly', 'monthly', 'yearly');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'journal_story_length'
  ) THEN
    CREATE TYPE public.journal_story_length AS ENUM ('short', 'medium', 'long');
  END IF;
END
$$;

ALTER TABLE public.user_vaults
  ADD COLUMN IF NOT EXISTS frequency public.journal_digest_freq NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS digest_frequency public.journal_digest_freq NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS story_length public.journal_story_length NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS summary_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_summary_at timestamptz,
  ADD COLUMN IF NOT EXISTS summary_month_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS summary_month_started_at timestamptz NOT NULL DEFAULT date_trunc('month', timezone('utc', now())),
  ADD COLUMN IF NOT EXISTS delivery text,
  ADD COLUMN IF NOT EXISTS hour_utc integer;

CREATE UNIQUE INDEX IF NOT EXISTS user_vaults_user_id_key ON public.user_vaults (user_id);

-- Pull existing preferences across from user_settings when present.
UPDATE public.user_vaults AS uv
SET
  frequency = COALESCE(
    uv.frequency,
    us.digest_frequency,
    CASE
      WHEN us.frequency IN ('weekly', 'monthly', 'yearly')
        THEN us.frequency::public.journal_digest_freq
      ELSE NULL
    END,
    'weekly'::public.journal_digest_freq
  ),
  digest_frequency = COALESCE(
    uv.digest_frequency,
    us.digest_frequency,
    CASE
      WHEN us.frequency IN ('weekly', 'monthly', 'yearly')
        THEN us.frequency::public.journal_digest_freq
      ELSE NULL
    END,
    'weekly'::public.journal_digest_freq
  ),
  story_length = COALESCE(uv.story_length, us.story_length, 'medium'::public.journal_story_length),
  summary_preferences = COALESCE(NULLIF(uv.summary_preferences, '{}'::jsonb), us.summary_preferences, '{}'::jsonb),
  last_summary_at = COALESCE(uv.last_summary_at, us.last_summary_at),
  summary_month_count = COALESCE(uv.summary_month_count, us.summary_month_count, 0),
  summary_month_started_at = COALESCE(
    uv.summary_month_started_at,
    us.summary_month_started_at,
    date_trunc('month', timezone('utc', now()))
  )
FROM public.user_settings AS us
WHERE us.user_id = uv.user_id;

-- Ensure any rows without migrated values take the defaults now that the copy is complete.
UPDATE public.user_vaults
SET summary_preferences = '{}'::jsonb
WHERE summary_preferences IS NULL;
