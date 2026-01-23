-- Test if the trigger function can read metadata correctly
-- This will help us debug if the trigger is working

-- First, let's check what the function looks like
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
AND routine_schema = 'public';

-- Check if there are any existing profiles created by the trigger
SELECT 
  id,
  role,
  full_name,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;





