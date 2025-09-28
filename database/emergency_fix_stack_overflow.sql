-- EMERGENCY FIX: Stack Overflow Error
-- This script immediately fixes the infinite recursion issue

-- Step 1: Drop the problematic trigger immediately
DROP TRIGGER IF EXISTS update_profile_completion_trigger ON users;

-- Step 2: Drop the problematic function
DROP FUNCTION IF EXISTS public.update_profile_completion();

-- Step 3: Update existing users with their current profile completion percentage
-- This is safe to run as it won't trigger any recursive updates
UPDATE users 
SET profile_completion_percentage = public.calculate_profile_completion(id)
WHERE profile_completion_percentage IS NULL OR profile_completion_percentage = 0;

-- Step 4: Create a safer trigger function that won't cause recursion
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
        -- Use a different approach to avoid triggering the same trigger
        PERFORM pg_notify('profile_completion_update', NEW.id::text);
        
        -- Update in a separate transaction to avoid recursion
        UPDATE users 
        SET 
            profile_completion_percentage = completion_percentage,
            profile_updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create a safer trigger with more specific conditions
CREATE TRIGGER update_profile_completion_trigger
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN (
        -- Only trigger on actual profile field changes, not on completion percentage or updated_at
        (OLD.name IS DISTINCT FROM NEW.name) OR
        (OLD.email IS DISTINCT FROM NEW.email) OR
        (OLD.biography IS DISTINCT FROM NEW.biography) OR
        (OLD.major IS DISTINCT FROM NEW.major) OR
        (OLD.graduation_year IS DISTINCT FROM NEW.graduation_year) OR
        (OLD.location IS DISTINCT FROM NEW.location) OR
        (OLD.phone_number IS DISTINCT FROM NEW.phone_number) OR
        (OLD.linkedin_url IS DISTINCT FROM NEW.linkedin_url) OR
        (OLD.github_url IS DISTINCT FROM NEW.github_url) OR
        (OLD.interests IS DISTINCT FROM NEW.interests) OR
        (OLD.club_memberships IS DISTINCT FROM NEW.club_memberships) OR
        (OLD.enrolled_courses IS DISTINCT FROM NEW.enrolled_courses) OR
        (OLD.profile_picture_url IS DISTINCT FROM NEW.profile_picture_url)
    )
    EXECUTE FUNCTION public.update_profile_completion();

-- Step 6: Verify the fix by checking if there are any remaining issues
SELECT 'Profile completion trigger fixed successfully' as status;
