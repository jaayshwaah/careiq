-- Add auto-email settings for daily rounds
-- Run this SQL in your Supabase SQL editor

-- Add auto email columns to profiles table
DO $$
BEGIN
  -- Add auto_daily_rounds_email column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'auto_daily_rounds_email') THEN
    ALTER TABLE profiles ADD COLUMN auto_daily_rounds_email BOOLEAN NOT NULL DEFAULT false;
  END IF;
  
  -- Add daily_rounds_email_time column if it doesn't exist  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'daily_rounds_email_time') THEN
    ALTER TABLE profiles ADD COLUMN daily_rounds_email_time TIME NOT NULL DEFAULT '06:00:00';
  END IF;
  
  -- Add auto_email_recipients column if it doesn't exist (JSON array of emails)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'auto_email_recipients') THEN
    ALTER TABLE profiles ADD COLUMN auto_email_recipients JSONB DEFAULT '[]';
  END IF;
END $$;

-- Create index for efficient cron job queries
CREATE INDEX IF NOT EXISTS idx_profiles_auto_email ON profiles(auto_daily_rounds_email, facility_id) WHERE auto_daily_rounds_email = true;

-- Comment the new columns
COMMENT ON COLUMN profiles.auto_daily_rounds_email IS 'Whether to automatically email daily rounds each morning';
COMMENT ON COLUMN profiles.daily_rounds_email_time IS 'Time to send daily rounds email (default 6:00 AM)';
COMMENT ON COLUMN profiles.auto_email_recipients IS 'JSON array of email addresses to receive daily rounds';