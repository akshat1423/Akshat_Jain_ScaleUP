-- Fix Profile Completion Trigger - Remove Infinite Recursion
-- This script fixes the stack overflow error caused by infinite recursion in the profile completion trigger

-- First, drop the existing problematic trigger
DROP TRIGGER IF EXISTS update_profile_completion_trigger ON users;

-- Drop the existing function to recreate it properly
DROP FUNCTION IF EXISTS public.update_profile_completion();

-- Create a safer function to update profile completion
CREATE OR REPLACE FUNCTION public.update_profile_completion()
RETURNS TRIGGER AS $$
DECLARE
    completion_percentage INTEGER;
BEGIN
    -- Calculate profile completion
    completion_percentage := public.calculate_profile_completion(NEW.id);
    
    -- Only update if the completion percentage has actually changed
    -- This prevents infinite recursion
    IF completion_percentage != COALESCE(NEW.profile_completion_percentage, 0) THEN
        UPDATE users 
        SET 
            profile_completion_percentage = completion_percentage,
            profile_updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger with specific field conditions to prevent recursion
CREATE TRIGGER update_profile_completion_trigger
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN (
        OLD.name IS DISTINCT FROM NEW.name OR
        OLD.email IS DISTINCT FROM NEW.email OR
        OLD.biography IS DISTINCT FROM NEW.biography OR
        OLD.major IS DISTINCT FROM NEW.major OR
        OLD.graduation_year IS DISTINCT FROM NEW.graduation_year OR
        OLD.location IS DISTINCT FROM NEW.location OR
        OLD.phone_number IS DISTINCT FROM NEW.phone_number OR
        OLD.linkedin_url IS DISTINCT FROM NEW.linkedin_url OR
        OLD.github_url IS DISTINCT FROM NEW.github_url OR
        OLD.interests IS DISTINCT FROM NEW.interests OR
        OLD.club_memberships IS DISTINCT FROM NEW.club_memberships OR
        OLD.enrolled_courses IS DISTINCT FROM NEW.enrolled_courses OR
        OLD.profile_picture_url IS DISTINCT FROM NEW.profile_picture_url
    )
    EXECUTE FUNCTION public.update_profile_completion();

-- Update existing users with their current profile completion percentage
-- This is safe to run as it won't trigger the recursive update
UPDATE users 
SET profile_completion_percentage = public.calculate_profile_completion(id)
WHERE profile_completion_percentage IS NULL OR profile_completion_percentage = 0;
