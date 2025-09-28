-- Enhanced User Profile Schema
-- This schema adds comprehensive academic and personal information fields to the users table
-- along with granular privacy controls for each field

-- Add enhanced profile fields to users table
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
    
    -- Privacy Settings - Granular control for each field
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

-- Create user_privacy_settings table for more granular control
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    visibility_level TEXT NOT NULL CHECK (visibility_level IN ('public', 'community_members', 'friends', 'private')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, field_name)
);

-- Create user_connections table for friend/connection system
CREATE TABLE IF NOT EXISTS user_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    connected_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_type TEXT NOT NULL CHECK (connection_type IN ('friend', 'colleague', 'mentor', 'mentee')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, connected_user_id)
);

-- Create user_achievements table for additional badges and achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    points_awarded INTEGER DEFAULT 0,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_visible BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_user_id ON user_privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_field_name ON user_privacy_settings(field_name);
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_connected_user_id ON user_connections(connected_user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON user_connections(status);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);

-- Enable RLS on new tables
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_privacy_settings
CREATE POLICY "Users can view their own privacy settings" ON user_privacy_settings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own privacy settings" ON user_privacy_settings FOR ALL 
    USING (auth.uid() = user_id);

-- Create RLS policies for user_connections
CREATE POLICY "Users can view their own connections" ON user_connections FOR SELECT 
    USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

CREATE POLICY "Users can create connection requests" ON user_connections FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" ON user_connections FOR UPDATE 
    USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

-- Create RLS policies for user_achievements
CREATE POLICY "Users can view their own achievements" ON user_achievements FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view public achievements of others" ON user_achievements FOR SELECT 
    USING (is_visible = true);

-- Create function to calculate profile completion percentage
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

-- Create function to update profile completion when user data changes
CREATE OR REPLACE FUNCTION public.update_profile_completion()
RETURNS TRIGGER AS $$
DECLARE
    completion_percentage INTEGER;
BEGIN
    -- Calculate profile completion
    completion_percentage := public.calculate_profile_completion(NEW.id);
    
    -- Only update if the completion percentage has actually changed
    -- This prevents infinite recursion
    IF completion_percentage != COALESCE(NEW.profile_completion_percentage, 0) THEN
        UPDATE users 
        SET 
            profile_completion_percentage = completion_percentage,
            profile_updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_profile_completion_trigger ON users;

-- Create trigger to automatically update profile completion
-- Only trigger on specific field changes, not on completion percentage or updated_at
CREATE TRIGGER update_profile_completion_trigger
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN (
        OLD.name IS DISTINCT FROM NEW.name OR
        OLD.email IS DISTINCT FROM NEW.email OR
        OLD.biography IS DISTINCT FROM NEW.biography OR
        OLD.major IS DISTINCT FROM NEW.major OR
        OLD.graduation_year IS DISTINCT FROM NEW.graduation_year OR
        OLD.location IS DISTINCT FROM NEW.location OR
        OLD.phone_number IS DISTINCT FROM NEW.phone_number OR
        OLD.linkedin_url IS DISTINCT FROM NEW.linkedin_url OR
        OLD.github_url IS DISTINCT FROM NEW.github_url OR
        OLD.interests IS DISTINCT FROM NEW.interests OR
        OLD.club_memberships IS DISTINCT FROM NEW.club_memberships OR
        OLD.enrolled_courses IS DISTINCT FROM NEW.enrolled_courses OR
        OLD.profile_picture_url IS DISTINCT FROM NEW.profile_picture_url
    )
    EXECUTE FUNCTION public.update_profile_completion();

-- Create function to get user profile with privacy filtering
CREATE OR REPLACE FUNCTION public.get_user_profile_with_privacy(
    target_user_id UUID,
    requesting_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    user_profile JSONB;
    privacy_settings JSONB;
    field_visibility TEXT;
    filtered_profile JSONB := '{}';
    field_name TEXT;
    field_value JSONB;
BEGIN
    -- Get user profile data
    SELECT to_jsonb(u.*) INTO user_profile
    FROM users u
    WHERE u.id = target_user_id;
    
    IF user_profile IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get privacy settings
    SELECT privacy_settings INTO privacy_settings
    FROM users
    WHERE id = target_user_id;
    
    -- If requesting user is the same as target user, return full profile
    IF requesting_user_id = target_user_id THEN
        RETURN user_profile;
    END IF;
    
    -- Filter profile based on privacy settings
    FOR field_name, field_value IN SELECT * FROM jsonb_each(user_profile) LOOP
        -- Get visibility level for this field
        field_visibility := COALESCE(
            privacy_settings->>field_name,
            'public' -- Default to public if no specific setting
        );
        
        -- Apply privacy filtering
        CASE field_visibility
            WHEN 'public' THEN
                filtered_profile := filtered_profile || jsonb_build_object(field_name, field_value);
            WHEN 'community_members' THEN
                -- Check if users are in any common community
                IF EXISTS (
                    SELECT 1 FROM community_members cm1
                    JOIN community_members cm2 ON cm1.community_id = cm2.community_id
                    WHERE cm1.user_id = requesting_user_id 
                    AND cm2.user_id = target_user_id
                ) THEN
                    filtered_profile := filtered_profile || jsonb_build_object(field_name, field_value);
                END IF;
            WHEN 'friends' THEN
                -- Check if users are connected
                IF EXISTS (
                    SELECT 1 FROM user_connections
                    WHERE (user_id = requesting_user_id AND connected_user_id = target_user_id)
                    OR (user_id = target_user_id AND connected_user_id = requesting_user_id)
                    AND status = 'accepted'
                ) THEN
                    filtered_profile := filtered_profile || jsonb_build_object(field_name, field_value);
                END IF;
            WHEN 'private' THEN
                -- Don't include this field
                NULL;
        END CASE;
    END LOOP;
    
    RETURN filtered_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.calculate_profile_completion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_with_privacy(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile_completion() TO authenticated;

-- Update existing users with default privacy settings if they don't have them
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

-- Update profile completion for existing users
UPDATE users 
SET profile_completion_percentage = public.calculate_profile_completion(id)
WHERE profile_completion_percentage = 0;
