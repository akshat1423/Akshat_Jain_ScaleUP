-- Step-by-Step Fix for Enhanced User Profiles
-- This script applies the enhanced user profiles schema step by step

-- Step 1: First, add the enhanced profile columns to the users table
DO $$ 
BEGIN
    -- Academic Information Fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'major') THEN
        ALTER TABLE users ADD COLUMN major TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'graduation_year') THEN
        ALTER TABLE users ADD COLUMN graduation_year INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'enrolled_courses') THEN
        ALTER TABLE users ADD COLUMN enrolled_courses TEXT[] DEFAULT '{}';
    END IF;
    
    -- Personal Information Fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'biography') THEN
        ALTER TABLE users ADD COLUMN biography TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'interests') THEN
        ALTER TABLE users ADD COLUMN interests TEXT[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'club_memberships') THEN
        ALTER TABLE users ADD COLUMN club_memberships TEXT[] DEFAULT '{}';
    END IF;
    
    -- Profile Picture and Contact Info
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_picture_url') THEN
        ALTER TABLE users ADD COLUMN profile_picture_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone_number') THEN
        ALTER TABLE users ADD COLUMN phone_number TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'linkedin_url') THEN
        ALTER TABLE users ADD COLUMN linkedin_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'github_url') THEN
        ALTER TABLE users ADD COLUMN github_url TEXT;
    END IF;
    
    -- Location Information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'location') THEN
        ALTER TABLE users ADD COLUMN location TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'timezone') THEN
        ALTER TABLE users ADD COLUMN timezone TEXT;
    END IF;
    
    -- Privacy Settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'privacy_settings') THEN
        ALTER TABLE users ADD COLUMN privacy_settings JSONB DEFAULT '{
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
    END IF;
    
    -- Profile completion tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_completion_percentage') THEN
        ALTER TABLE users ADD COLUMN profile_completion_percentage INTEGER DEFAULT 0;
    END IF;
    
    -- Last profile update timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_updated_at') THEN
        ALTER TABLE users ADD COLUMN profile_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Step 2: Create the profile completion calculation function
CREATE OR REPLACE FUNCTION public.calculate_profile_completion(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    completion_score INTEGER := 0;
    total_fields INTEGER := 12; -- Total number of profile fields
    user_record RECORD;
BEGIN
    SELECT 
        name, email, biography, major, graduation_year, interests, 
        club_memberships, profile_picture_url, location, linkedin_url, 
        github_url, phone_number
    INTO user_record
    FROM users 
    WHERE id = user_id_param;
    
    -- Check each field and add to completion score
    IF user_record.name IS NOT NULL AND user_record.name != '' THEN completion_score := completion_score + 1; END IF;
    IF user_record.email IS NOT NULL AND user_record.email != '' THEN completion_score := completion_score + 1; END IF;
    IF user_record.biography IS NOT NULL AND user_record.biography != '' THEN completion_score := completion_score + 1; END IF;
    IF user_record.major IS NOT NULL AND user_record.major != '' THEN completion_score := completion_score + 1; END IF;
    IF user_record.graduation_year IS NOT NULL THEN completion_score := completion_score + 1; END IF;
    IF user_record.interests IS NOT NULL AND array_length(user_record.interests, 1) > 0 THEN completion_score := completion_score + 1; END IF;
    IF user_record.club_memberships IS NOT NULL AND array_length(user_record.club_memberships, 1) > 0 THEN completion_score := completion_score + 1; END IF;
    IF user_record.profile_picture_url IS NOT NULL AND user_record.profile_picture_url != '' THEN completion_score := completion_score + 1; END IF;
    IF user_record.location IS NOT NULL AND user_record.location != '' THEN completion_score := completion_score + 1; END IF;
    IF user_record.linkedin_url IS NOT NULL AND user_record.linkedin_url != '' THEN completion_score := completion_score + 1; END IF;
    IF user_record.github_url IS NOT NULL AND user_record.github_url != '' THEN completion_score := completion_score + 1; END IF;
    IF user_record.phone_number IS NOT NULL AND user_record.phone_number != '' THEN completion_score := completion_score + 1; END IF;
    
    RETURN ROUND((completion_score::FLOAT / total_fields::FLOAT) * 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Update existing users with their current profile completion percentage
UPDATE users 
SET profile_completion_percentage = public.calculate_profile_completion(id)
WHERE profile_completion_percentage IS NULL OR profile_completion_percentage = 0;

-- Step 4: Update existing users with default privacy settings if they don't have them
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

-- Step 5: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.calculate_profile_completion(UUID) TO authenticated;

-- Step 6: Verify the setup
SELECT 'Enhanced user profiles schema applied successfully' as status;
SELECT COUNT(*) as users_updated FROM users WHERE profile_completion_percentage > 0;
