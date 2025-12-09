-- ============================================================
-- SMART NOTIFICATIONS SYSTEM
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Manual configuration (if user sets it)
  use_smart_learning BOOLEAN DEFAULT TRUE,
  
  -- Weekday/Weekend simple config (when not using smart learning)
  weekday_hour INT DEFAULT 20,        -- 0-23, default 8pm
  weekday_minute INT DEFAULT 0,       -- 0-59
  weekend_hour INT DEFAULT 11,        -- 0-23, default 11am  
  weekend_minute INT DEFAULT 0,       -- 0-59
  
  -- User's timezone
  timezone TEXT DEFAULT 'Europe/Madrid',
  
  -- Smart learning: patterns per day of week
  -- Structure: { "monday": { "avg_hour": 20.5, "times": [20, 21, 20] }, ... }
  writing_patterns JSONB DEFAULT '{
    "monday": { "avg_hour": null, "times": [] },
    "tuesday": { "avg_hour": null, "times": [] },
    "wednesday": { "avg_hour": null, "times": [] },
    "thursday": { "avg_hour": null, "times": [] },
    "friday": { "avg_hour": null, "times": [] },
    "saturday": { "avg_hour": null, "times": [] },
    "sunday": { "avg_hour": null, "times": [] }
  }'::jsonb,
  
  -- Control flags
  daily_reminder_enabled BOOLEAN DEFAULT TRUE,
  streak_risk_enabled BOOLEAN DEFAULT TRUE,
  
  -- Tracking
  last_reminder_sent_at TIMESTAMPTZ DEFAULT NULL,
  last_streak_alert_at TIMESTAMPTZ DEFAULT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_notif_prefs_enabled 
ON notification_preferences(daily_reminder_enabled) 
WHERE daily_reminder_enabled = TRUE;

-- 3. Add timezone to push_subscriptions if not exists
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Madrid';

-- 4. Create a function to auto-create notification preferences on user signup
CREATE OR REPLACE FUNCTION create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created_notif_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_notif_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_notification_preferences();

-- 6. Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 8. Grant service role full access (for cron job)
GRANT ALL ON notification_preferences TO service_role;

-- ============================================================
-- DONE! Now create preferences for existing users:
-- ============================================================
INSERT INTO notification_preferences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT DO NOTHING;
