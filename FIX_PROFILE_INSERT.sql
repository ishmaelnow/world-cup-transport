-- Fix Profile Insert RLS Policy Issue
-- Run this in Supabase SQL Editor

-- The issue: After signup, the user session might not be fully established
-- when trying to insert into profiles, causing RLS policy violation.

-- Solution 1: Make the insert policy more permissive for new users
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Allow users to insert their own profile if the id matches their auth.uid()
-- This should work even right after signup
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Solution 2: Create a trigger function that auto-creates profile on user signup
-- This ensures profile is always created even if RLS blocks manual insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role text;
  user_full_name text;
BEGIN
  -- Get role from metadata, default to 'rider' if not provided
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'rider');
  user_full_name := NEW.raw_user_meta_data->>'full_name';
  
  -- Only create profile if it doesn't exist
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    user_role,
    user_full_name
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;
  
  -- Sync role to auth metadata for RLS policies
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', user_role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Solution 3: Also allow service_role to insert (for edge functions)
-- This is a backup in case the above doesn't work
-- Note: This requires using service_role key, which should NOT be exposed client-side

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;

-- Verify the policy exists
SELECT * FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile';

