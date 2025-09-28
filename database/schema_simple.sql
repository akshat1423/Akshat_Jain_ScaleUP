-- Simple Schema - Just add essential columns to make community creation work
-- This is a minimal schema that should work without errors

-- Add essential columns to communities table
ALTER TABLE communities ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS privacy_setting TEXT DEFAULT 'public';
ALTER TABLE communities ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS max_members INTEGER;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS rules TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE communities ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create a simple function to update member count
CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities 
    SET member_count = member_count + 1 
    WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities 
    SET member_count = member_count - 1 
    WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for member count (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_community_member_count_insert') THEN
        CREATE TRIGGER update_community_member_count_insert
          AFTER INSERT ON community_members
          FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_community_member_count_delete') THEN
        CREATE TRIGGER update_community_member_count_delete
          AFTER DELETE ON community_members
          FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();
    END IF;
END $$;

-- Update the communities policy to handle privacy settings
DROP POLICY IF EXISTS "Anyone can view communities" ON communities;
CREATE POLICY "Anyone can view public communities" ON communities FOR SELECT 
  USING (privacy_setting = 'public' OR privacy_setting IS NULL OR 
    EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.community_id = communities.id 
      AND cm.user_id = auth.uid()
    )
  );
