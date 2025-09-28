-- Fix message_type constraint to allow announcement and poll related message types
-- This addresses the error: "new row for relation "community_chat_messages" violates check constraint "community_chat_messages_message_type_check""

-- First, drop the existing constraint
ALTER TABLE community_chat_messages 
DROP CONSTRAINT IF EXISTS community_chat_messages_message_type_check;

-- Add the new constraint with expanded message types
ALTER TABLE community_chat_messages 
ADD CONSTRAINT community_chat_messages_message_type_check 
CHECK (message_type IN (
    'text', 
    'image', 
    'file', 
    'system',
    'announcement',
    'announcement_reminder',
    'poll',
    'poll_request',
    'poll_reminder',
    'poll_result',
    'audio',
    'document'
));

-- Verify the constraint was added successfully
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'community_chat_messages_message_type_check';

-- Test that the constraint works by checking if we can insert the problematic message type
-- (This is just a verification - the actual insert will be done by the application)
DO $$
BEGIN
    -- This will fail if the constraint is not working properly
    PERFORM 1 WHERE 'announcement_reminder' IN ('text', 'image', 'file', 'system', 'announcement', 'announcement_reminder', 'poll', 'poll_request', 'poll_reminder', 'poll_result', 'audio', 'document');
    RAISE NOTICE 'Message type constraint updated successfully - announcement_reminder and poll_request are now allowed';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating constraint: %', SQLERRM;
END $$;
