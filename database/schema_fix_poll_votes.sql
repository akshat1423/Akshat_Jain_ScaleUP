-- Fix poll votes to support multiple votes per user when allowed
-- This migration removes the unique constraint and adds proper handling

-- First, drop the existing unique constraint
ALTER TABLE community_poll_votes DROP CONSTRAINT IF EXISTS community_poll_votes_poll_id_user_id_key;

-- Add a new unique constraint that only applies when multiple votes are NOT allowed
-- We'll handle this at the application level for multiple votes
-- But keep the constraint for single votes to prevent duplicates

-- Remove the unique constraint entirely and handle uniqueness at application level
-- This allows multiple votes when the poll allows it, and prevents duplicates when it doesn't

-- Simple approach: Just remove the unique constraint and handle everything in the application
-- The application will check poll settings and handle single vs multiple votes appropriately

-- Ensure RLS policy allows users to manage their own votes
DROP POLICY IF EXISTS "Users can manage their own poll votes" ON community_poll_votes;
CREATE POLICY "Users can manage their own poll votes" ON community_poll_votes FOR ALL 
  USING (auth.uid() = user_id);
