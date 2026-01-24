-- Verify the can_insert_profile function exists and is correct
SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'can_insert_profile'
AND routine_schema = 'public';






