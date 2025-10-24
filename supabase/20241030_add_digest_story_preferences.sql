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

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS digest_frequency public.journal_digest_freq NOT NULL DEFAULT 'weekly';

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS story_length public.journal_story_length NOT NULL DEFAULT 'medium';

UPDATE public.user_settings
SET digest_frequency = COALESCE(
      digest_frequency,
      CASE
        WHEN frequency IN ('weekly', 'monthly', 'yearly')
          THEN frequency::public.journal_digest_freq
        ELSE 'weekly'::public.journal_digest_freq
      END
    ),
    story_length = COALESCE(
      story_length,
      CASE
        WHEN summary_preferences ? 'length'
             AND summary_preferences->>'length' IN ('short', 'medium', 'long')
          THEN (summary_preferences->>'length')::public.journal_story_length
        ELSE 'medium'::public.journal_story_length
      END
    );
