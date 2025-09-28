-- Supabase Schema for ScaleUp Community Platform
-- This schema implements the enhanced user profile system with privacy settings

-- Enable RLS (Row Level Security)
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Users table with enhanced profile fields
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Academic Information
    major TEXT,
    year TEXT,
    bio TEXT,
    
    -- Arrays for interests, clubs, and courses
    interests TEXT[] DEFAULT '{}',
    clubs TEXT[] DEFAULT '{}',
    courses TEXT[] DEFAULT '{}',
    
    -- Gamification
    impact INTEGER DEFAULT 0,
    badges TEXT[] DEFAULT '{}',
    
    -- Privacy Settings (JSONB for flexibility)
    privacy_settings JSONB DEFAULT '{
        "profileVisibility": "public",
        "showMajor": true,
        "showYear": true,
        "showInterests": true,
        "showClubs": true,
        "showCourses": false,
        "showBio": true,
        "showImpactPoints": true
    }'::jsonb
);

-- Communities table
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community memberships
CREATE TABLE community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, community_id)
);

-- Posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    up_votes INTEGER DEFAULT 0,
    down_votes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post votes (to prevent duplicate voting)
CREATE TABLE post_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)), -- -1 for downvote, 1 for upvote
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_communities_parent_id ON communities(parent_id);
CREATE INDEX idx_community_members_user_id ON community_members(user_id);
CREATE INDEX idx_community_members_community_id ON community_members(community_id);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_community_id ON posts(community_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_post_votes_user_id ON post_votes(user_id);
CREATE INDEX idx_post_votes_post_id ON post_votes(post_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON communities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies

-- Users can read their own profile and public profiles
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public profiles" ON users
    FOR SELECT USING (
        privacy_settings->>'profileVisibility' = 'public' 
        OR auth.uid() = id
    );

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Communities are public for reading
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Communities are public" ON communities
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create communities" ON communities
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Community members can be viewed by all authenticated users
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community members are viewable" ON community_members
    FOR SELECT USING (true);

CREATE POLICY "Users can join communities" ON community_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities" ON community_members
    FOR DELETE USING (auth.uid() = user_id);

-- Posts are public within communities
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are public" ON posts
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON posts
    FOR DELETE USING (auth.uid() = user_id);

-- Post votes
ALTER TABLE post_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view votes" ON post_votes
    FOR SELECT USING (true);

CREATE POLICY "Users can vote" ON post_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change their vote" ON post_votes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can remove their vote" ON post_votes
    FOR DELETE USING (auth.uid() = user_id);

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Functions for business logic

-- Function to update user impact points when posts are voted on
CREATE OR REPLACE FUNCTION update_user_impact()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Add or subtract impact points based on vote type
        UPDATE users 
        SET impact = GREATEST(0, impact + NEW.vote_type)
        WHERE id = (SELECT user_id FROM posts WHERE id = NEW.post_id);
        
        -- Update post vote counts
        UPDATE posts
        SET up_votes = up_votes + CASE WHEN NEW.vote_type = 1 THEN 1 ELSE 0 END,
            down_votes = down_votes + CASE WHEN NEW.vote_type = -1 THEN 1 ELSE 0 END
        WHERE id = NEW.post_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle vote change
        UPDATE users 
        SET impact = GREATEST(0, impact - OLD.vote_type + NEW.vote_type)
        WHERE id = (SELECT user_id FROM posts WHERE id = NEW.post_id);
        
        -- Update post vote counts
        UPDATE posts
        SET up_votes = up_votes - CASE WHEN OLD.vote_type = 1 THEN 1 ELSE 0 END + CASE WHEN NEW.vote_type = 1 THEN 1 ELSE 0 END,
            down_votes = down_votes - CASE WHEN OLD.vote_type = -1 THEN 1 ELSE 0 END + CASE WHEN NEW.vote_type = -1 THEN 1 ELSE 0 END
        WHERE id = NEW.post_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Remove vote impact
        UPDATE users 
        SET impact = GREATEST(0, impact - OLD.vote_type)
        WHERE id = (SELECT user_id FROM posts WHERE id = OLD.post_id);
        
        -- Update post vote counts
        UPDATE posts
        SET up_votes = up_votes - CASE WHEN OLD.vote_type = 1 THEN 1 ELSE 0 END,
            down_votes = down_votes - CASE WHEN OLD.vote_type = -1 THEN 1 ELSE 0 END
        WHERE id = OLD.post_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_vote_impact_trigger
    AFTER INSERT OR UPDATE OR DELETE ON post_votes
    FOR EACH ROW EXECUTE FUNCTION update_user_impact();

-- Function to create notifications
CREATE OR REPLACE FUNCTION create_notification(user_id UUID, message TEXT)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, text)
    VALUES (user_id, message)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notifications for new posts
CREATE OR REPLACE FUNCTION notify_new_post()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify all community members about new post (except the author)
    INSERT INTO notifications (user_id, text)
    SELECT cm.user_id, 'New post in ' || c.name
    FROM community_members cm
    JOIN communities c ON c.id = cm.community_id
    WHERE cm.community_id = NEW.community_id 
    AND cm.user_id != NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER new_post_notification_trigger
    AFTER INSERT ON posts
    FOR EACH ROW EXECUTE FUNCTION notify_new_post();

-- Sample data for testing (optional)
INSERT INTO users (email, name, major, year, bio, interests, clubs, courses) VALUES
('student@iitb.ac.in', 'IITB Student', 'Computer Science Engineering', '2025', 
 'Passionate about technology and innovation. Love building scalable solutions.',
 ARRAY['Machine Learning', 'Web Development', 'Competitive Programming'],
 ARRAY['Coding Club', 'Tech Society'],
 ARRAY['CS101', 'MA101', 'PH101']);

INSERT INTO communities (name, parent_id) VALUES 
('IITB General', NULL),
('Hostel 8', (SELECT id FROM communities WHERE name = 'IITB General'));

-- Insert initial community membership
INSERT INTO community_members (user_id, community_id)
SELECT u.id, c.id FROM users u, communities c 
WHERE u.email = 'student@iitb.ac.in';