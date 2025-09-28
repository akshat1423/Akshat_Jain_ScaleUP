-- Enhanced Communities Schema - Schema 01
-- This schema extends the existing communities functionality with social media-like features

-- Add new columns to communities table for enhanced functionality
ALTER TABLE communities ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS privacy_setting TEXT DEFAULT 'public' CHECK (privacy_setting IN ('public', 'private', 'restricted'));
ALTER TABLE communities ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS max_members INTEGER;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS rules TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE communities ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create community_roles table for role-based permissions
CREATE TABLE IF NOT EXISTS community_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'member')) DEFAULT 'member',
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- Create community_join_requests table for private community join requests
CREATE TABLE IF NOT EXISTS community_join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(community_id, user_id)
);

-- Create community_chat_messages table for group chat functionality
CREATE TABLE IF NOT EXISTS community_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  file_url TEXT,
  reply_to UUID REFERENCES community_chat_messages(id),
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create community_events table for community events
CREATE TABLE IF NOT EXISTS community_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  is_virtual BOOLEAN DEFAULT false,
  meeting_link TEXT,
  max_attendees INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create community_event_attendees table
CREATE TABLE IF NOT EXISTS community_event_attendees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES community_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create community_polls table for community polls
CREATE TABLE IF NOT EXISTS community_polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of poll options
  allow_multiple_votes BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create community_poll_votes table
CREATE TABLE IF NOT EXISTS community_poll_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES community_polls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_options JSONB NOT NULL, -- Array of selected option indices
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

-- Create community_announcements table for important community announcements
CREATE TABLE IF NOT EXISTS community_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_community_roles_community_id ON community_roles(community_id);
CREATE INDEX IF NOT EXISTS idx_community_roles_user_id ON community_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_community_join_requests_community_id ON community_join_requests(community_id);
CREATE INDEX IF NOT EXISTS idx_community_join_requests_user_id ON community_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_community_join_requests_status ON community_join_requests(status);
CREATE INDEX IF NOT EXISTS idx_community_chat_messages_community_id ON community_chat_messages(community_id);
CREATE INDEX IF NOT EXISTS idx_community_chat_messages_created_at ON community_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_community_events_community_id ON community_events(community_id);
CREATE INDEX IF NOT EXISTS idx_community_events_event_date ON community_events(event_date);
CREATE INDEX IF NOT EXISTS idx_community_event_attendees_event_id ON community_event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_community_polls_community_id ON community_polls(community_id);
CREATE INDEX IF NOT EXISTS idx_community_poll_votes_poll_id ON community_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_community_announcements_community_id ON community_announcements(community_id);
CREATE INDEX IF NOT EXISTS idx_communities_privacy_setting ON communities(privacy_setting);
CREATE INDEX IF NOT EXISTS idx_communities_tags ON communities USING GIN(tags);

-- Enable Row Level Security for new tables
ALTER TABLE community_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_roles table
CREATE POLICY "Users can view community roles" ON community_roles FOR SELECT USING (true);
CREATE POLICY "Community admins can assign roles" ON community_roles FOR INSERT 
  WITH CHECK (
    auth.uid() = assigned_by AND 
    EXISTS (
      SELECT 1 FROM community_roles cr 
      WHERE cr.community_id = community_roles.community_id 
      AND cr.user_id = auth.uid() 
      AND cr.role IN ('admin', 'moderator')
    )
  );
CREATE POLICY "Community admins can update roles" ON community_roles FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM community_roles cr 
      WHERE cr.community_id = community_roles.community_id 
      AND cr.user_id = auth.uid() 
      AND cr.role = 'admin'
    )
  );

-- RLS Policies for community_join_requests table
CREATE POLICY "Users can view their own join requests" ON community_join_requests FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Community admins can view all join requests" ON community_join_requests FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM community_roles cr 
      WHERE cr.community_id = community_join_requests.community_id 
      AND cr.user_id = auth.uid() 
      AND cr.role IN ('admin', 'moderator')
    )
  );
CREATE POLICY "Users can create join requests" ON community_join_requests FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Community admins can update join requests" ON community_join_requests FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM community_roles cr 
      WHERE cr.community_id = community_join_requests.community_id 
      AND cr.user_id = auth.uid() 
      AND cr.role IN ('admin', 'moderator')
    )
  );

-- RLS Policies for community_chat_messages table
CREATE POLICY "Community members can view chat messages" ON community_chat_messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.community_id = community_chat_messages.community_id 
      AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY "Community members can create chat messages" ON community_chat_messages FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.community_id = community_chat_messages.community_id 
      AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update their own chat messages" ON community_chat_messages FOR UPDATE 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chat messages" ON community_chat_messages FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for community_events table
CREATE POLICY "Community members can view events" ON community_events FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.community_id = community_events.community_id 
      AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY "Community members can create events" ON community_events FOR INSERT 
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.community_id = community_events.community_id 
      AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY "Event creators can update events" ON community_events FOR UPDATE 
  USING (auth.uid() = created_by);

-- RLS Policies for community_event_attendees table
CREATE POLICY "Users can view event attendees" ON community_event_attendees FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM community_events ce 
      JOIN community_members cm ON ce.community_id = cm.community_id 
      WHERE ce.id = community_event_attendees.event_id 
      AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage their own event attendance" ON community_event_attendees FOR ALL 
  USING (auth.uid() = user_id);

-- RLS Policies for community_polls table
CREATE POLICY "Community members can view polls" ON community_polls FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.community_id = community_polls.community_id 
      AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY "Community members can create polls" ON community_polls FOR INSERT 
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.community_id = community_polls.community_id 
      AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY "Poll creators can update polls" ON community_polls FOR UPDATE 
  USING (auth.uid() = created_by);

-- RLS Policies for community_poll_votes table
CREATE POLICY "Users can view poll votes" ON community_poll_votes FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM community_polls cp 
      JOIN community_members cm ON cp.community_id = cm.community_id 
      WHERE cp.id = community_poll_votes.poll_id 
      AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage their own poll votes" ON community_poll_votes FOR ALL 
  USING (auth.uid() = user_id);

-- RLS Policies for community_announcements table
CREATE POLICY "Community members can view announcements" ON community_announcements FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.community_id = community_announcements.community_id 
      AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY "Community admins can create announcements" ON community_announcements FOR INSERT 
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM community_roles cr 
      WHERE cr.community_id = community_announcements.community_id 
      AND cr.user_id = auth.uid() 
      AND cr.role IN ('admin', 'moderator')
    )
  );
CREATE POLICY "Announcement creators can update announcements" ON community_announcements FOR UPDATE 
  USING (auth.uid() = created_by);

-- Update existing RLS policies for communities table
DROP POLICY IF EXISTS "Anyone can view communities" ON communities;
CREATE POLICY "Anyone can view public communities" ON communities FOR SELECT 
  USING (privacy_setting = 'public' OR 
    EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.community_id = communities.id 
      AND cm.user_id = auth.uid()
    )
  );

-- Create function to update member count
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

-- Create triggers for member count
CREATE TRIGGER update_community_member_count_insert
  AFTER INSERT ON community_members
  FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();

CREATE TRIGGER update_community_member_count_delete
  AFTER DELETE ON community_members
  FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();

-- Create function to handle community join requests
CREATE OR REPLACE FUNCTION public.handle_join_request_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Add user to community members
    INSERT INTO community_members (user_id, community_id)
    VALUES (NEW.user_id, NEW.community_id)
    ON CONFLICT (user_id, community_id) DO NOTHING;
    
    -- Create notification
    INSERT INTO notifications (text, type, community_id, user_id)
    VALUES (
      'Your join request for community "' || (SELECT name FROM communities WHERE id = NEW.community_id) || '" has been approved!',
      'community_join_approved',
      NEW.community_id,
      NEW.user_id
    );
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    -- Create notification
    INSERT INTO notifications (text, type, community_id, user_id)
    VALUES (
      'Your join request for community "' || (SELECT name FROM communities WHERE id = NEW.community_id) || '" has been rejected.',
      'community_join_rejected',
      NEW.community_id,
      NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for join request handling
CREATE TRIGGER handle_join_request_approval
  AFTER UPDATE ON community_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_join_request_approval();

-- Create function to automatically assign admin role to community creator
CREATE OR REPLACE FUNCTION public.assign_community_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO community_roles (community_id, user_id, role, assigned_by)
  VALUES (NEW.id, NEW.created_by, 'admin', NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for community admin assignment
CREATE TRIGGER assign_community_admin
  AFTER INSERT ON communities
  FOR EACH ROW EXECUTE FUNCTION public.assign_community_admin();

-- Create function to update updated_at for new tables
CREATE TRIGGER update_community_chat_messages_updated_at 
  BEFORE UPDATE ON community_chat_messages 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_events_updated_at 
  BEFORE UPDATE ON community_events 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_polls_updated_at 
  BEFORE UPDATE ON community_polls 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_announcements_updated_at 
  BEFORE UPDATE ON community_announcements 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
