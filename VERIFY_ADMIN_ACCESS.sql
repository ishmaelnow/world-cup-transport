-- Verify admin can see applications (run this as your admin user)
-- This tests the RLS policy

-- Check your current user role
SELECT 
  id,
  role,
  full_name
FROM profiles
WHERE id = auth.uid();

-- Check if admin can see applications (this simulates what the dashboard does)
SELECT 
  da.id,
  da.status,
  p.full_name,
  da.vehicle_make || ' ' || da.vehicle_model as vehicle,
  da.created_at
FROM driver_applications da
JOIN profiles p ON p.id = da.user_id
ORDER BY da.created_at DESC;

-- If the above returns empty, check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'driver_applications';


