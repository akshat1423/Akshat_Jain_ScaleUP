-- Schema updates for real file upload functionality
-- Date: 2024-12-19

-- Enable Supabase Storage for file uploads
-- This creates the necessary storage buckets and policies

-- Create storage buckets for different file types
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('community-images', 'community-images', true),
  ('community-audio', 'community-audio', true),
  ('community-documents', 'community-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for community images
CREATE POLICY "Community members can upload images" ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'community-images' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can view images" ON storage.objects FOR SELECT 
  USING (bucket_id = 'community-images');

CREATE POLICY "Community members can delete their own images" ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'community-images' AND
    auth.uid() = owner
  );

-- Create storage policies for community audio
CREATE POLICY "Community members can upload audio" ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'community-audio' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can view audio" ON storage.objects FOR SELECT 
  USING (bucket_id = 'community-audio');

CREATE POLICY "Community members can delete their own audio" ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'community-audio' AND
    auth.uid() = owner
  );

-- Create storage policies for community documents
CREATE POLICY "Community members can upload documents" ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'community-documents' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can view documents" ON storage.objects FOR SELECT 
  USING (bucket_id = 'community-documents');

CREATE POLICY "Community members can delete their own documents" ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'community-documents' AND
    auth.uid() = owner
  );

-- Add file metadata columns to community_chat_messages table
ALTER TABLE community_chat_messages 
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS mime_type TEXT,
ADD COLUMN IF NOT EXISTS poll_id UUID,
ADD COLUMN IF NOT EXISTS announcement_id UUID;

-- Note: Foreign key constraints are not added to avoid constraint issues
-- The poll_id and announcement_id are stored as simple UUIDs for reference

-- Create index for better performance on file queries
CREATE INDEX IF NOT EXISTS idx_community_chat_messages_file_type 
ON community_chat_messages(file_type) 
WHERE file_type IS NOT NULL;

-- Create function to generate unique file names
CREATE OR REPLACE FUNCTION generate_unique_filename(
  original_filename TEXT,
  file_extension TEXT
) RETURNS TEXT AS $$
DECLARE
  timestamp_str TEXT;
  random_str TEXT;
  unique_filename TEXT;
BEGIN
  -- Generate timestamp string
  timestamp_str := to_char(now(), 'YYYYMMDD_HH24MISS');
  
  -- Generate random string
  random_str := substr(md5(random()::text), 1, 8);
  
  -- Create unique filename
  unique_filename := timestamp_str || '_' || random_str || '.' || file_extension;
  
  RETURN unique_filename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_unique_filename(TEXT, TEXT) TO authenticated;

-- Create function to validate file uploads
CREATE OR REPLACE FUNCTION validate_file_upload(
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT,
  mime_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  max_size BIGINT := 10485760; -- 10MB limit
  allowed_image_types TEXT[] := ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  allowed_audio_types TEXT[] := ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'];
  allowed_doc_types TEXT[] := ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  file_category TEXT;
BEGIN
  -- Check file size
  IF file_size > max_size THEN
    RETURN FALSE;
  END IF;
  
  -- Determine file category based on mime type
  IF mime_type = ANY(allowed_image_types) THEN
    file_category := 'image';
  ELSIF mime_type = ANY(allowed_audio_types) THEN
    file_category := 'audio';
  ELSIF mime_type = ANY(allowed_doc_types) THEN
    file_category := 'document';
  ELSE
    RETURN FALSE;
  END IF;
  
  -- Validate file type matches category
  IF file_type != file_category THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_file_upload(TEXT, BIGINT, TEXT, TEXT) TO authenticated;

-- Create function to get file upload URL
CREATE OR REPLACE FUNCTION get_file_upload_url(
  file_name TEXT,
  file_type TEXT,
  mime_type TEXT
) RETURNS TEXT AS $$
DECLARE
  bucket_name TEXT;
  file_path TEXT;
  upload_url TEXT;
BEGIN
  -- Determine bucket based on file type
  CASE file_type
    WHEN 'image' THEN bucket_name := 'community-images';
    WHEN 'audio' THEN bucket_name := 'community-audio';
    WHEN 'document' THEN bucket_name := 'community-documents';
    ELSE
      RAISE EXCEPTION 'Invalid file type: %', file_type;
  END CASE;
  
  -- Generate unique file path
  file_path := 'chat-uploads/' || generate_unique_filename(file_name, split_part(file_name, '.', 2));
  
  -- Get signed upload URL (this would be handled by the client)
  -- For now, return the file path
  upload_url := bucket_name || '/' || file_path;
  
  RETURN upload_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_file_upload_url(TEXT, TEXT, TEXT) TO authenticated;

-- Create function to get file download URL
CREATE OR REPLACE FUNCTION get_file_download_url(
  file_path TEXT
) RETURNS TEXT AS $$
DECLARE
  download_url TEXT;
BEGIN
  -- Get signed download URL (this would be handled by the client)
  -- For now, return the file path
  download_url := 'https://your-supabase-url.supabase.co/storage/v1/object/public/' || file_path;
  
  RETURN download_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_file_download_url(TEXT) TO authenticated;

-- Update RLS policies for community_chat_messages to include file columns
DROP POLICY IF EXISTS "Community members can view chat messages" ON community_chat_messages;
CREATE POLICY "Community members can view chat messages" ON community_chat_messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.community_id = community_chat_messages.community_id 
      AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Community members can send chat messages" ON community_chat_messages;
CREATE POLICY "Community members can send chat messages" ON community_chat_messages FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM community_members cm 
      WHERE cm.community_id = community_chat_messages.community_id 
      AND cm.user_id = auth.uid()
    )
  );

-- Add trigger to automatically set file metadata when file_url is provided
CREATE OR REPLACE FUNCTION set_file_metadata()
RETURNS TRIGGER AS $$
DECLARE
  file_extension TEXT;
  mime_type_from_extension TEXT;
BEGIN
  -- Only process if file_url is provided and file_name is not already set
  IF NEW.file_url IS NOT NULL AND NEW.file_name IS NULL THEN
    -- Extract file extension
    file_extension := lower(split_part(NEW.file_url, '.', 2));
    
    -- Set file_name from URL
    NEW.file_name := split_part(NEW.file_url, '/', array_length(string_to_array(NEW.file_url, '/'), 1));
    
    -- Determine mime type from extension
    CASE file_extension
      WHEN 'jpg', 'jpeg' THEN mime_type_from_extension := 'image/jpeg';
      WHEN 'png' THEN mime_type_from_extension := 'image/png';
      WHEN 'gif' THEN mime_type_from_extension := 'image/gif';
      WHEN 'webp' THEN mime_type_from_extension := 'image/webp';
      WHEN 'mp3' THEN mime_type_from_extension := 'audio/mpeg';
      WHEN 'wav' THEN mime_type_from_extension := 'audio/wav';
      WHEN 'ogg' THEN mime_type_from_extension := 'audio/ogg';
      WHEN 'mp4' THEN mime_type_from_extension := 'audio/mp4';
      WHEN 'pdf' THEN mime_type_from_extension := 'application/pdf';
      WHEN 'doc' THEN mime_type_from_extension := 'application/msword';
      WHEN 'docx' THEN mime_type_from_extension := 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      WHEN 'txt' THEN mime_type_from_extension := 'text/plain';
      ELSE mime_type_from_extension := 'application/octet-stream';
    END CASE;
    
    -- Set file metadata
    NEW.file_type := 
      CASE 
        WHEN file_extension IN ('jpg', 'jpeg', 'png', 'gif', 'webp') THEN 'image'
        WHEN file_extension IN ('mp3', 'wav', 'ogg', 'mp4') THEN 'audio'
        WHEN file_extension IN ('pdf', 'doc', 'docx', 'txt') THEN 'document'
        ELSE 'file'
      END;
    
    NEW.mime_type := mime_type_from_extension;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for file metadata
DROP TRIGGER IF EXISTS trigger_set_file_metadata ON community_chat_messages;
CREATE TRIGGER trigger_set_file_metadata
  BEFORE INSERT OR UPDATE ON community_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_file_metadata();

-- Add comments for documentation
COMMENT ON COLUMN community_chat_messages.file_name IS 'Original filename of the uploaded file';
COMMENT ON COLUMN community_chat_messages.file_size IS 'Size of the file in bytes';
COMMENT ON COLUMN community_chat_messages.file_type IS 'Category of file: image, audio, document, or file';
COMMENT ON COLUMN community_chat_messages.mime_type IS 'MIME type of the file';

COMMENT ON FUNCTION generate_unique_filename(TEXT, TEXT) IS 'Generates a unique filename with timestamp and random string';
COMMENT ON FUNCTION validate_file_upload(TEXT, BIGINT, TEXT, TEXT) IS 'Validates file upload parameters and restrictions';
COMMENT ON FUNCTION get_file_upload_url(TEXT, TEXT, TEXT) IS 'Gets the storage bucket and path for file upload';
COMMENT ON FUNCTION get_file_download_url(TEXT) IS 'Gets the public download URL for a file';

-- Create message reactions table
CREATE TABLE IF NOT EXISTS community_message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES community_chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create message likes table
CREATE TABLE IF NOT EXISTS community_message_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES community_chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Add reply_to column to community_chat_messages if not exists
ALTER TABLE community_chat_messages 
ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES community_chat_messages(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON community_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON community_message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_likes_message_id ON community_message_likes(message_id);
CREATE INDEX IF NOT EXISTS idx_message_likes_user_id ON community_message_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON community_chat_messages(reply_to_message_id);

-- RLS policies for message reactions
CREATE POLICY "Community members can view message reactions" ON community_message_reactions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM community_chat_messages cm 
      JOIN community_members cm2 ON cm.community_id = cm2.community_id
      WHERE cm.id = community_message_reactions.message_id 
      AND cm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can add message reactions" ON community_message_reactions FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM community_chat_messages cm 
      JOIN community_members cm2 ON cm.community_id = cm2.community_id
      WHERE cm.id = community_message_reactions.message_id 
      AND cm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove their own message reactions" ON community_message_reactions FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS policies for message likes
CREATE POLICY "Community members can view message likes" ON community_message_likes FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM community_chat_messages cm 
      JOIN community_members cm2 ON cm.community_id = cm2.community_id
      WHERE cm.id = community_message_likes.message_id 
      AND cm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can like messages" ON community_message_likes FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM community_chat_messages cm 
      JOIN community_members cm2 ON cm.community_id = cm2.community_id
      WHERE cm.id = community_message_likes.message_id 
      AND cm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can unlike their own messages" ON community_message_likes FOR DELETE 
  USING (auth.uid() = user_id);

-- Enable RLS on new tables
ALTER TABLE community_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_message_likes ENABLE ROW LEVEL SECURITY;
