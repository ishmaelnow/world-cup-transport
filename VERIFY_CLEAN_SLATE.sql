/*
  # Verify Clean Slate - Check ALL Tables
  
  Run this to verify everything is truly deleted.
*/

-- Check all tables for any remaining data
SELECT 
  'rides' as table_name, 
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✓ CLEAN' ELSE '✗ HAS DATA' END as status
FROM rides
UNION ALL
SELECT 'driver_profiles', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ CLEAN' ELSE '✗ HAS DATA' END FROM driver_profiles
UNION ALL
SELECT 'driver_applications', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ CLEAN' ELSE '✗ HAS DATA' END FROM driver_applications
UNION ALL
SELECT 'earnings', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ CLEAN' ELSE '✗ HAS DATA' END FROM earnings
UNION ALL
SELECT 'trip_locations', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ CLEAN' ELSE '✗ HAS DATA' END FROM trip_locations
UNION ALL
SELECT 'notifications', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ CLEAN' ELSE '✗ HAS DATA' END FROM notifications
UNION ALL
SELECT 'payment_methods', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ CLEAN' ELSE '✗ HAS DATA' END FROM payment_methods
UNION ALL
SELECT 'profiles (drivers)', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ CLEAN' ELSE '✗ HAS DATA' END FROM profiles WHERE role = 'driver'
UNION ALL
SELECT 'profiles (total)', COUNT(*), 'INFO' FROM profiles;

-- Check for any rides with specific statuses
SELECT 
  'rides_by_status' as check_type,
  status,
  COUNT(*) as count
FROM rides
GROUP BY status
ORDER BY count DESC;

-- Check for any driver applications by status
SELECT 
  'applications_by_status' as check_type,
  status,
  COUNT(*) as count
FROM driver_applications
GROUP BY status
ORDER BY count DESC;

