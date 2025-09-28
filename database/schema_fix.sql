-- Schema Fix - Fix RLS policies and community creation issues
-- This fixes the Row Level Security policy issues

-- First, let's check what policies exist and fix them
DO $$ 
BEGIN
    -- Drop problematic policies that might be causing issues
    DROP POLICY IF EXISTS "Community admins can assign roles" ON community_roles;
    DROP POLICY IF EXISTS "Community admins can update roles" ON community_roles;
    DROP POLICY IF EXISTS "Users can view community roles" ON community_roles;
    
    -- Create simpler, working policies
    CREATE POLICY "Anyone can view community roles" ON community_roles FOR SELECT USING (true);
    
    -- Allow users to insert their own roles (for community creators)
    CREATE POLICY "Users can create their own roles" ON community_roles FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
    
    -- Allow community admins to manage roles
    CREATE POLICY "Community admins can manage roles" ON community_roles FOR ALL 
      USING (
        EXISTS (
          SELECT 1 FROM community_roles cr 
          WHERE cr.community_id = community_roles.community_id 
          AND cr.user_id = auth.uid() 
          AND cr.role IN ('admin', 'moderator')
        )
      );
END $$;

-- Fix the community creation trigger to handle RLS properly
CREATE OR REPLACE FUNCTION public.assign_community_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert with proper RLS bypass for system operations
  INSERT INTO community_roles (community_id, user_id, role, assigned_by)
  VALUES (NEW.id, NEW.created_by, 'admin', NEW.created_by)
  ON CONFLICT (community_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger
DROP TRIGGER IF EXISTS assign_community_admin ON communities;
CREATE TRIGGER assign_community_admin
  AFTER INSERT ON communities
  FOR EACH ROW EXECUTE FUNCTION public.assign_community_admin();

-- Also fix the member count update function
CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities 
    SET member_count = COALESCE(member_count, 0) + 1 
    WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities 
    SET member_count = GREATEST(COALESCE(member_count, 0) - 1, 0)
    WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Update member count triggers
DROP TRIGGER IF EXISTS update_community_member_count_insert ON community_members;
DROP TRIGGER IF EXISTS update_community_member_count_delete ON community_members;

CREATE TRIGGER update_community_member_count_insert
  AFTER INSERT ON community_members
  FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();

CREATE TRIGGER update_community_member_count_delete
  AFTER DELETE ON community_members
  FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();

-- Fix communities policy to be more permissive
DROP POLICY IF EXISTS "Anyone can view public communities" ON communities;
DROP POLICY IF EXISTS "Anyone can view communities" ON communities;

CREATE POLICY "Anyone can view communities" ON communities FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create communities" ON communities FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Community creators can update their communities" ON communities FOR UPDATE USING (auth.uid() = created_by);

-- Make sure community_members policies are working
DROP POLICY IF EXISTS "Users can view community members" ON community_members;
DROP POLICY IF EXISTS "Users can join communities" ON community_members;
DROP POLICY IF EXISTS "Users can leave communities" ON community_members;

CREATE POLICY "Users can view community members" ON community_members FOR SELECT USING (true);
CREATE POLICY "Users can join communities" ON community_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave communities" ON community_members FOR DELETE USING (auth.uid() = user_id);

-- Fix notifications policy
DROP POLICY IF EXISTS "Users can view notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

CREATE POLICY "Users can view notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Anyone can create notifications" ON notifications FOR INSERT WITH CHECK (true);
