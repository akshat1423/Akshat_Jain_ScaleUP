-- Fix poll_id and announcement_id foreign key constraint issues
-- This adds the columns if they don't exist and removes foreign key constraints

-- First, add the columns if they don't exist
ALTER TABLE community_chat_messages 
ADD COLUMN IF NOT EXISTS poll_id UUID,
ADD COLUMN IF NOT EXISTS announcement_id UUID;

-- Remove foreign key constraints from community_chat_messages table (if they exist)
ALTER TABLE community_chat_messages 
DROP CONSTRAINT IF EXISTS community_chat_messages_poll_id_fkey;

ALTER TABLE community_chat_messages 
DROP CONSTRAINT IF EXISTS community_chat_messages_announcement_id_fkey;

-- The columns remain as UUID but without foreign key constraints
-- This allows for more flexible referencing without strict database-level enforcement
-- The application logic will handle the relationships

-- Add indexes for better performance (only if columns exist)
DO $$
BEGIN
    -- Check if poll_id column exists before creating index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_chat_messages' 
        AND column_name = 'poll_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_community_chat_messages_poll_id 
        ON community_chat_messages(poll_id) 
        WHERE poll_id IS NOT NULL;
    END IF;
    
    -- Check if announcement_id column exists before creating index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_chat_messages' 
        AND column_name = 'announcement_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_community_chat_messages_announcement_id 
        ON community_chat_messages(announcement_id) 
        WHERE announcement_id IS NOT NULL;
    END IF;
END $$;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'community_chat_messages' 
AND column_name IN ('poll_id', 'announcement_id');
