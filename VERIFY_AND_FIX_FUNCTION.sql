-- Check if function exists
SELECT 
  routine_name,
  routine_type,
  security_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'create_user_profile'
AND routine_schema = 'public';

-- If it doesn't exist or is wrong, recreate it with correct signature
DROP FUNCTION IF EXISTS create_user_profile(uuid, text, text) CASCADE;

CREATE OR REPLACE FUNCTION create_user_profile(
  user_id uuid,
  user_role text,
  user_full_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, text, text) TO anon;

-- Verify it was created
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_user_profile'
AND n.nspname = 'public';





