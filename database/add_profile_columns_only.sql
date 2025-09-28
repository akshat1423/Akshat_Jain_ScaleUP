-- Add Enhanced Profile Columns Only
-- This script only adds the missing columns without any triggers to avoid recursion issues

-- Add the missing profile completion column
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;

-- Add other enhanced profile columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS major TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS graduation_year INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS enrolled_courses TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS biography TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS club_memberships TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add privacy settings column with default values
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
    "email": "public",
    "phone_number": "private",
    "location": "public",
    "biography": "public",
    "interests": "public",
    "club_memberships": "public",
    "major": "public",
    "graduation_year": "public",
    "enrolled_courses": "public",
    "linkedin_url": "public",
    "github_url": "public",
    "profile_picture_url": "public"
}'::jsonb;

-- Update existing users with default privacy settings
UPDATE users 
SET privacy_settings = '{
    "email": "public",
    "phone_number": "private",
    "location": "public",
    "biography": "public",
    "interests": "public",
    "club_memberships": "public",
    "major": "public",
    "graduation_year": "public",
    "enrolled_courses": "public",
    "linkedin_url": "public",
    "github_url": "public",
    "profile_picture_url": "public"
}'::jsonb
WHERE privacy_settings IS NULL;

-- Set profile completion to 0 for existing users (will be calculated by the app)
UPDATE users 
SET profile_completion_percentage = 0
WHERE profile_completion_percentage IS NULL;

SELECT 'Profile columns added successfully' as status;
