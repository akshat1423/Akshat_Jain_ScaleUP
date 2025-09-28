-- Remove Profile Completion Trigger - Alternative Approach
-- This script removes the problematic trigger and provides an alternative approach

-- Drop the existing problematic trigger
DROP TRIGGER IF EXISTS update_profile_completion_trigger ON users;

-- Drop the trigger function
DROP FUNCTION IF EXISTS public.update_profile_completion();

-- Update existing users with their current profile completion percentage
-- This is safe to run as it won't trigger any recursive updates
UPDATE users 
SET profile_completion_percentage = public.calculate_profile_completion(id)
WHERE profile_completion_percentage IS NULL OR profile_completion_percentage = 0;

-- Note: Profile completion will now need to be updated manually in the application
-- when profile data changes, rather than automatically via database triggers.
-- This is safer and prevents infinite recursion issues.
