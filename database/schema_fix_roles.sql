-- Fix community_roles RLS policies to prevent infinite recursion
-- This fixes the circular reference issue in the policies

-- Drop all existing policies on community_roles to start fresh
DO $$ 
BEGIN
    -- Drop all existing policies
    DROP POLICY IF EXISTS "Users can view community roles" ON community_roles;
    DROP POLICY IF EXISTS "Community admins can assign roles" ON community_roles;
    DROP POLICY IF EXISTS "Community admins can update roles" ON community_roles;
    DROP POLICY IF EXISTS "Community admins can manage roles" ON community_roles;
    DROP POLICY IF EXISTS "Anyone can view community roles" ON community_roles;
    DROP POLICY IF EXISTS "Users can create their own roles" ON community_roles;
END $$;

-- Create simple, non-recursive policies
-- Allow anyone to view roles (needed for UI)
CREATE POLICY "Anyone can view community roles" ON community_roles FOR SELECT USING (true);

-- Allow users to insert their own roles (for community creators)
CREATE POLICY "Users can create their own roles" ON community_roles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own roles (for self-management)
CREATE POLICY "Users can update their own roles" ON community_roles FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- For admin role management, we'll use a different approach
-- Allow updates if the user is the community creator (simpler check)
CREATE POLICY "Community creators can manage roles" ON community_roles FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM communities 
      WHERE communities.id = community_roles.community_id 
      AND communities.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM communities 
      WHERE communities.id = community_roles.community_id 
      AND communities.created_by = auth.uid()
    )
  );

-- Also allow role management if user has admin role (but avoid recursion)
-- We'll use a function to check this safely
CREATE OR REPLACE FUNCTION public.user_has_admin_role(community_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is community creator (fastest check)
  IF EXISTS (
    SELECT 1 FROM communities 
    WHERE id = community_id_param 
    AND created_by = user_id_param
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has admin role (but limit to prevent recursion)
  RETURN EXISTS (
    SELECT 1 FROM community_roles 
    WHERE community_id = community_id_param 
    AND user_id = user_id_param 
    AND role = 'admin'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policy using the function
CREATE POLICY "Admins can manage all roles" ON community_roles FOR ALL 
  USING (public.user_has_admin_role(community_id, auth.uid()))
  WITH CHECK (public.user_has_admin_role(community_id, auth.uid()));

-- Ensure the function is accessible
GRANT EXECUTE ON FUNCTION public.user_has_admin_role(UUID, UUID) TO authenticated;
