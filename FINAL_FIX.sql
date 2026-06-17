-- Final Fix: Make RLS policy work for immediate profile creation after signup
-- The trigger can't be enabled, so we need the RLS policy to work directly

-- Drop existing policies and function
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP FUNCTION IF EXISTS can_insert_profile(uuid) CASCADE;

-- Create a simpler, more permissive policy
-- This allows authenticated users to insert their own profile
-- The key is that auth.uid() should be available right after signup
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also ensure authenticated role has INSERT permission
GRANT INSERT ON profiles TO authenticated;

-- Verify
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'profiles' 
AND policyname = 'Users can insert own profile';






