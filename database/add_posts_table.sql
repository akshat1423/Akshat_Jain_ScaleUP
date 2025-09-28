-- Add Posts Table for Community Posts Feature
-- Date: 2024-12-19
-- Features: Community posts with admin-only creation, display in overview tab

-- =============================================
-- POSTS TABLE
-- =============================================

-- Create community_posts table
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_community_posts_community_id ON community_posts(community_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_is_pinned ON community_posts(is_pinned);

-- =============================================
-- POST LIKES SYSTEM
-- =============================================

-- Create post likes table
CREATE TABLE IF NOT EXISTS community_post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create indexes for post likes
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON community_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON community_post_likes(user_id);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on posts table
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Community members can view posts
CREATE POLICY "Community members can view posts" ON community_posts FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.community_id = community_posts.community_id 
      AND cm.user_id = auth.uid()
    )
  );

-- Only admins can create posts
CREATE POLICY "Only admins can create posts" ON community_posts FOR INSERT 
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM community_members cm 
      JOIN community_roles cr ON cm.community_id = cr.community_id AND cm.user_id = cr.user_id
      WHERE cm.community_id = community_posts.community_id 
      AND cm.user_id = auth.uid()
      AND cr.role = 'admin'
    )
  );

-- Only admins can update posts
CREATE POLICY "Only admins can update posts" ON community_posts FOR UPDATE 
  USING (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM community_members cm 
      JOIN community_roles cr ON cm.community_id = cr.community_id AND cm.user_id = cr.user_id
      WHERE cm.community_id = community_posts.community_id 
      AND cm.user_id = auth.uid()
      AND cr.role = 'admin'
    )
  );

-- Only admins can delete posts
CREATE POLICY "Only admins can delete posts" ON community_posts FOR DELETE 
  USING (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM community_members cm 
      JOIN community_roles cr ON cm.community_id = cr.community_id AND cm.user_id = cr.user_id
      WHERE cm.community_id = community_posts.community_id 
      AND cm.user_id = auth.uid()
      AND cr.role = 'admin'
    )
  );

-- Enable RLS on post likes table
ALTER TABLE community_post_likes ENABLE ROW LEVEL SECURITY;

-- Community members can view post likes
CREATE POLICY "Community members can view post likes" ON community_post_likes FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM community_posts cp 
      JOIN community_members cm ON cp.community_id = cm.community_id
      WHERE cp.id = community_post_likes.post_id 
      AND cm.user_id = auth.uid()
    )
  );

-- Community members can like posts
CREATE POLICY "Community members can like posts" ON community_post_likes FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM community_posts cp 
      JOIN community_members cm ON cp.community_id = cm.community_id
      WHERE cp.id = community_post_likes.post_id 
      AND cm.user_id = auth.uid()
    )
  );

-- Users can unlike their own likes
CREATE POLICY "Users can unlike their own posts" ON community_post_likes FOR DELETE 
  USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to get posts with author information and like count
CREATE OR REPLACE FUNCTION get_community_posts_with_details(community_uuid UUID)
RETURNS TABLE (
  id UUID,
  community_id UUID,
  author_id UUID,
  title TEXT,
  content TEXT,
  image_url TEXT,
  is_pinned BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  author_name TEXT,
  author_email TEXT,
  like_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.community_id,
    cp.author_id,
    cp.title,
    cp.content,
    cp.image_url,
    cp.is_pinned,
    cp.created_at,
    cp.updated_at,
    u.name as author_name,
    u.email as author_email,
    COALESCE(pl.like_count, 0) as like_count
  FROM community_posts cp
  LEFT JOIN users u ON cp.author_id = u.id
  LEFT JOIN (
    SELECT post_id, COUNT(*) as like_count
    FROM community_post_likes
    GROUP BY post_id
  ) pl ON cp.id = pl.post_id
  WHERE cp.community_id = community_uuid
  ORDER BY cp.is_pinned DESC, cp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_community_posts_with_details(UUID) TO authenticated;

-- Function to get post count for a community
CREATE OR REPLACE FUNCTION get_community_post_count(community_uuid UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM community_posts
    WHERE community_id = community_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_community_post_count(UUID) TO authenticated;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for posts table
DROP TRIGGER IF EXISTS trigger_update_posts_updated_at ON community_posts;
CREATE TRIGGER trigger_update_posts_updated_at
  BEFORE UPDATE ON community_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

-- Add comments for documentation
COMMENT ON TABLE community_posts IS 'Community posts created by admins';
COMMENT ON COLUMN community_posts.title IS 'Post title';
COMMENT ON COLUMN community_posts.content IS 'Post content/body';
COMMENT ON COLUMN community_posts.image_url IS 'Optional image URL for the post';
COMMENT ON COLUMN community_posts.is_pinned IS 'Whether the post is pinned to the top';
COMMENT ON COLUMN community_posts.author_id IS 'ID of the user who created the post (must be admin)';

COMMENT ON TABLE community_post_likes IS 'Likes on community posts';
COMMENT ON COLUMN community_post_likes.post_id IS 'ID of the post being liked';
COMMENT ON COLUMN community_post_likes.user_id IS 'ID of the user who liked the post';

-- =============================================
-- SCHEMA SUMMARY
-- =============================================

/*
POSTS FEATURE SCHEMA:

1. COMMUNITY POSTS:
   - Admin-only creation and management
   - Title, content, optional image
   - Pinning capability
   - Timestamps for creation and updates

2. POST LIKES:
   - Community members can like posts
   - One like per user per post
   - Like count tracking

3. SECURITY:
   - Row Level Security (RLS) policies
   - Admin-only post creation/editing/deletion
   - Community-based access control

4. PERFORMANCE:
   - Optimized indexes for all queries
   - Efficient functions for data retrieval

5. USAGE:
   - Run this script in your Supabase SQL editor
   - Posts will appear in community overview tab
   - Only admins can create posts via the create button
*/
