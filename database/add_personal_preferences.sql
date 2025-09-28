-- Add personal_preferences column to users table
-- This column will store user's personal preferences/tags for community matching

-- Add personal_preferences column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'personal_preferences') THEN
        ALTER TABLE users ADD COLUMN personal_preferences TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Add personal_preferences to privacy_settings default
DO $$
BEGIN
    -- Update existing users to include personal_preferences in their privacy_settings
    UPDATE users 
    SET privacy_settings = privacy_settings || '{"personal_preferences": "public"}'::jsonb
    WHERE privacy_settings IS NOT NULL 
    AND NOT (privacy_settings ? 'personal_preferences');
END $$;

-- Create index for better performance on personal_preferences queries
CREATE INDEX IF NOT EXISTS idx_users_personal_preferences 
ON users USING GIN (personal_preferences) 
WHERE personal_preferences IS NOT NULL AND array_length(personal_preferences, 1) > 0;

-- Add comment to the column
COMMENT ON COLUMN users.personal_preferences IS 'Array of personal preference tags used for community matching';
