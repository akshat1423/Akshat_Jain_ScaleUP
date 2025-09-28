-- Schema 02 - Fix and Complete Database Setup
-- This schema only adds what's missing and fixes any issues

-- First, let's check if the enhanced columns exist, if not add them
DO $$ 
BEGIN
    -- Add missing columns to communities table if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communities' AND column_name = 'description') THEN
        ALTER TABLE communities ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communities' AND column_name = 'logo_url') THEN
        ALTER TABLE communities ADD COLUMN logo_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communities' AND column_name = 'privacy_setting') THEN
        ALTER TABLE communities ADD COLUMN privacy_setting TEXT DEFAULT 'public' CHECK (privacy_setting IN ('public', 'private', 'restricted'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communities' AND column_name = 'member_count') THEN
        ALTER TABLE communities ADD COLUMN member_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communities' AND column_name = 'max_members') THEN
        ALTER TABLE communities ADD COLUMN max_members INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communities' AND column_name = 'rules') THEN
        ALTER TABLE communities ADD COLUMN rules TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communities' AND column_name = 'tags') THEN
        ALTER TABLE communities ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communities' AND column_name = 'is_active') THEN
        ALTER TABLE communities ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Create tables only if they don't exist
CREATE TABLE IF NOT EXISTS community_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'member')) DEFAULT 'member',
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

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

CREATE TABLE IF NOT EXISTS community_event_attendees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES community_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  allow_multiple_votes BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_poll_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES community_polls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_options JSONB NOT NULL,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

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

-- Create indexes only if they don't exist
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

-- Enable RLS only if not already enabled
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'community_roles' AND relrowsecurity = true) THEN
        ALTER TABLE community_roles ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'community_join_requests' AND relrowsecurity = true) THEN
        ALTER TABLE community_join_requests ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'community_chat_messages' AND relrowsecurity = true) THEN
        ALTER TABLE community_chat_messages ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'community_events' AND relrowsecurity = true) THEN
        ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'community_event_attendees' AND relrowsecurity = true) THEN
        ALTER TABLE community_event_attendees ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'community_polls' AND relrowsecurity = true) THEN
        ALTER TABLE community_polls ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'community_poll_votes' AND relrowsecurity = true) THEN
        ALTER TABLE community_poll_votes ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'community_announcements' AND relrowsecurity = true) THEN
        ALTER TABLE community_announcements ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create policies only if they don't exist
DO $$ 
BEGIN
    -- Community roles policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_roles' AND policyname = 'Users can view community roles') THEN
        CREATE POLICY "Users can view community roles" ON community_roles FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_roles' AND policyname = 'Community admins can assign roles') THEN
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
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_roles' AND policyname = 'Community admins can update roles') THEN
        CREATE POLICY "Community admins can update roles" ON community_roles FOR UPDATE 
          USING (
            EXISTS (
              SELECT 1 FROM community_roles cr 
              WHERE cr.community_id = community_roles.community_id 
              AND cr.user_id = auth.uid() 
              AND cr.role = 'admin'
            )
          );
    END IF;

    -- Community join requests policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_join_requests' AND policyname = 'Users can view their own join requests') THEN
        CREATE POLICY "Users can view their own join requests" ON community_join_requests FOR SELECT 
          USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_join_requests' AND policyname = 'Community admins can view all join requests') THEN
        CREATE POLICY "Community admins can view all join requests" ON community_join_requests FOR SELECT 
          USING (
            EXISTS (
              SELECT 1 FROM community_roles cr 
              WHERE cr.community_id = community_join_requests.community_id 
              AND cr.user_id = auth.uid() 
              AND cr.role IN ('admin', 'moderator')
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_join_requests' AND policyname = 'Users can create join requests') THEN
        CREATE POLICY "Users can create join requests" ON community_join_requests FOR INSERT 
          WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_join_requests' AND policyname = 'Community admins can update join requests') THEN
        CREATE POLICY "Community admins can update join requests" ON community_join_requests FOR UPDATE 
          USING (
            EXISTS (
              SELECT 1 FROM community_roles cr 
              WHERE cr.community_id = community_join_requests.community_id 
              AND cr.user_id = auth.uid() 
              AND cr.role IN ('admin', 'moderator')
            )
          );
    END IF;

    -- Community chat messages policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_chat_messages' AND policyname = 'Community members can view chat messages') THEN
        CREATE POLICY "Community members can view chat messages" ON community_chat_messages FOR SELECT 
          USING (
            EXISTS (
              SELECT 1 FROM community_members cm 
              WHERE cm.community_id = community_chat_messages.community_id 
              AND cm.user_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_chat_messages' AND policyname = 'Community members can create chat messages') THEN
        CREATE POLICY "Community members can create chat messages" ON community_chat_messages FOR INSERT 
          WITH CHECK (
            auth.uid() = user_id AND
            EXISTS (
              SELECT 1 FROM community_members cm 
              WHERE cm.community_id = community_chat_messages.community_id 
              AND cm.user_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_chat_messages' AND policyname = 'Users can update their own chat messages') THEN
        CREATE POLICY "Users can update their own chat messages" ON community_chat_messages FOR UPDATE 
          USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_chat_messages' AND policyname = 'Users can delete their own chat messages') THEN
        CREATE POLICY "Users can delete their own chat messages" ON community_chat_messages FOR DELETE 
          USING (auth.uid() = user_id);
    END IF;

    -- Community events policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_events' AND policyname = 'Community members can view events') THEN
        CREATE POLICY "Community members can view events" ON community_events FOR SELECT 
          USING (
            EXISTS (
              SELECT 1 FROM community_members cm 
              WHERE cm.community_id = community_events.community_id 
              AND cm.user_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_events' AND policyname = 'Community members can create events') THEN
        CREATE POLICY "Community members can create events" ON community_events FOR INSERT 
          WITH CHECK (
            auth.uid() = created_by AND
            EXISTS (
              SELECT 1 FROM community_members cm 
              WHERE cm.community_id = community_events.community_id 
              AND cm.user_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_events' AND policyname = 'Event creators can update events') THEN
        CREATE POLICY "Event creators can update events" ON community_events FOR UPDATE 
          USING (auth.uid() = created_by);
    END IF;

    -- Community event attendees policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_event_attendees' AND policyname = 'Users can view event attendees') THEN
        CREATE POLICY "Users can view event attendees" ON community_event_attendees FOR SELECT 
          USING (
            EXISTS (
              SELECT 1 FROM community_events ce 
              JOIN community_members cm ON ce.community_id = cm.community_id 
              WHERE ce.id = community_event_attendees.event_id 
              AND cm.user_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_event_attendees' AND policyname = 'Users can manage their own event attendance') THEN
        CREATE POLICY "Users can manage their own event attendance" ON community_event_attendees FOR ALL 
          USING (auth.uid() = user_id);
    END IF;

    -- Community polls policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_polls' AND policyname = 'Community members can view polls') THEN
        CREATE POLICY "Community members can view polls" ON community_polls FOR SELECT 
          USING (
            EXISTS (
              SELECT 1 FROM community_members cm 
              WHERE cm.community_id = community_polls.community_id 
              AND cm.user_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_polls' AND policyname = 'Community members can create polls') THEN
        CREATE POLICY "Community members can create polls" ON community_polls FOR INSERT 
          WITH CHECK (
            auth.uid() = created_by AND
            EXISTS (
              SELECT 1 FROM community_members cm 
              WHERE cm.community_id = community_polls.community_id 
              AND cm.user_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_polls' AND policyname = 'Poll creators can update polls') THEN
        CREATE POLICY "Poll creators can update polls" ON community_polls FOR UPDATE 
          USING (auth.uid() = created_by);
    END IF;

    -- Community poll votes policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_poll_votes' AND policyname = 'Users can view poll votes') THEN
        CREATE POLICY "Users can view poll votes" ON community_poll_votes FOR SELECT 
          USING (
            EXISTS (
              SELECT 1 FROM community_polls cp 
              JOIN community_members cm ON cp.community_id = cm.community_id 
              WHERE cp.id = community_poll_votes.poll_id 
              AND cm.user_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_poll_votes' AND policyname = 'Users can manage their own poll votes') THEN
        CREATE POLICY "Users can manage their own poll votes" ON community_poll_votes FOR ALL 
          USING (auth.uid() = user_id);
    END IF;

    -- Community announcements policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_announcements' AND policyname = 'Community members can view announcements') THEN
        CREATE POLICY "Community members can view announcements" ON community_announcements FOR SELECT 
          USING (
            EXISTS (
              SELECT 1 FROM community_members cm 
              WHERE cm.community_id = community_announcements.community_id 
              AND cm.user_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_announcements' AND policyname = 'Community admins can create announcements') THEN
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
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_announcements' AND policyname = 'Announcement creators can update announcements') THEN
        CREATE POLICY "Announcement creators can update announcements" ON community_announcements FOR UPDATE 
          USING (auth.uid() = created_by);
    END IF;
END $$;

-- Update communities policy to handle privacy settings
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'communities' AND policyname = 'Anyone can view communities') THEN
        DROP POLICY "Anyone can view communities" ON communities;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'communities' AND policyname = 'Anyone can view public communities') THEN
        CREATE POLICY "Anyone can view public communities" ON communities FOR SELECT 
          USING (privacy_setting = 'public' OR 
            EXISTS (
              SELECT 1 FROM community_members cm 
              WHERE cm.community_id = communities.id 
              AND cm.user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- Create functions only if they don't exist
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

CREATE OR REPLACE FUNCTION public.assign_community_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO community_roles (community_id, user_id, role, assigned_by)
  VALUES (NEW.id, NEW.created_by, 'admin', NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers only if they don't exist
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
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_join_request_approval') THEN
        CREATE TRIGGER handle_join_request_approval
          AFTER UPDATE ON community_join_requests
          FOR EACH ROW EXECUTE FUNCTION public.handle_join_request_approval();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'assign_community_admin') THEN
        CREATE TRIGGER assign_community_admin
          AFTER INSERT ON communities
          FOR EACH ROW EXECUTE FUNCTION public.assign_community_admin();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_community_chat_messages_updated_at') THEN
        CREATE TRIGGER update_community_chat_messages_updated_at 
          BEFORE UPDATE ON community_chat_messages 
          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_community_events_updated_at') THEN
        CREATE TRIGGER update_community_events_updated_at 
          BEFORE UPDATE ON community_events 
          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_community_polls_updated_at') THEN
        CREATE TRIGGER update_community_polls_updated_at 
          BEFORE UPDATE ON community_polls 
          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_community_announcements_updated_at') THEN
        CREATE TRIGGER update_community_announcements_updated_at 
          BEFORE UPDATE ON community_announcements 
          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;