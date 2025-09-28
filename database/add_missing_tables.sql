-- Add Missing Tables for Enhanced User Profiles
-- This script adds the missing tables that are referenced in the code

-- Create user_achievements table
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

-- Create user_connections table
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

-- Create user_privacy_settings table
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    visibility_level TEXT NOT NULL CHECK (visibility_level IN ('public', 'community_members', 'friends', 'private')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, field_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_connected_user_id ON user_connections(connected_user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON user_connections(status);
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_user_id ON user_privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_field_name ON user_privacy_settings(field_name);

-- Enable RLS on new tables
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_achievements
CREATE POLICY "Users can view their own achievements" ON user_achievements FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view public achievements of others" ON user_achievements FOR SELECT 
    USING (is_visible = true);

-- Create RLS policies for user_connections
CREATE POLICY "Users can view their own connections" ON user_connections FOR SELECT 
    USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

CREATE POLICY "Users can create connection requests" ON user_connections FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" ON user_connections FOR UPDATE 
    USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

-- Create RLS policies for user_privacy_settings
CREATE POLICY "Users can view their own privacy settings" ON user_privacy_settings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own privacy settings" ON user_privacy_settings FOR ALL 
    USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON user_achievements TO authenticated;
GRANT ALL ON user_connections TO authenticated;
GRANT ALL ON user_privacy_settings TO authenticated;

SELECT 'Missing tables created successfully' as status;
