-- Test Schema - Simple test to check if basic functionality works
-- Run this first to test basic community creation

-- Test 1: Check if communities table exists and has basic columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'communities' 
ORDER BY ordinal_position;

-- Test 2: Try to create a simple community (this will fail if schema is wrong)
INSERT INTO communities (name, created_by) 
VALUES ('Test Community', 'c889bd94-fc58-424d-b1fb-bb4cf4b9ac31')
RETURNING *;

-- Test 3: Check if we can query communities
SELECT * FROM communities LIMIT 5;

-- Test 4: Check if community_members table works
SELECT * FROM community_members LIMIT 5;
