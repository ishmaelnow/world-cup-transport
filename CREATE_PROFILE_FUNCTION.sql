-- Create a function that can insert profiles bypassing RLS
-- This function runs with SECURITY DEFINER, so it bypasses RLS policies

CREATE OR REPLACE FUNCTION create_user_profile(
  user_id uuid,
  user_role text,
  user_full_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update the profile
  INSERT INTO profiles (id, role, full_name)
  VALUES (user_id, user_role, user_full_name)
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;
  
  -- Sync role to auth metadata for RLS policies
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', user_role)
  WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, text, text) TO authenticated;

-- Verify the function was created
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'create_user_profile'
AND routine_schema = 'public';






