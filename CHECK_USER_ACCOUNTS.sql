-- Check what user accounts still exist
SELECT 
  id,
  role,
  full_name,
  email,
  phone,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- Count by role
SELECT 
  role,
  COUNT(*) as count
FROM profiles
GROUP BY role;


