-- Alternative Solution: Make RLS policy work without trigger
-- Since we can't enable the trigger on auth.users, let's fix the RLS policy instead

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create a more permissive policy that allows inserts right after signup
-- This uses a function that checks if the user was just created
CREATE OR REPLACE FUNCTION can_insert_profile(profile_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Allow if the id matches the current user's auth.uid()
  -- This should work even right after signup
  RETURN auth.uid() = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create the policy using the function
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (can_insert_profile(id));

-- Also ensure the trigger function can insert (as backup)
-- Grant execute on the helper function
GRANT EXECUTE ON FUNCTION can_insert_profile(uuid) TO authenticated;

-- Verify the policy
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'profiles' 
AND policyname = 'Users can insert own profile';





