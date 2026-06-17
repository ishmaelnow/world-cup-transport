/*
  # FRESH START - Complete Database Reset
  
  WARNING: This will PERMANENTLY DELETE EVERYTHING:
  - All rides
  - All driver profiles
  - All driver applications
  - All earnings
  - All notifications
  - All trip locations
  - All payment methods (optional)
  - Reset all driver roles to 'rider'
  
  This gives you a completely clean slate.
  
  Run this in Supabase SQL Editor.
*/

-- =====================================================
-- 1. DELETE ALL RELATED DATA FIRST
-- =====================================================

-- Delete trip locations (references rides)
DELETE FROM trip_locations;

-- Delete earnings (references rides and driver_profiles)
DELETE FROM earnings;

-- Delete ALL notifications
DELETE FROM notifications;

-- Delete payment methods (uncomment if you want to delete these too)
DELETE FROM payment_methods;

-- =====================================================
-- 2. DELETE RIDES
-- =====================================================

DELETE FROM rides;

-- =====================================================
-- 3. DELETE DRIVER PROFILES
-- =====================================================

DELETE FROM driver_profiles;

-- =====================================================
-- 4. DELETE DRIVER APPLICATIONS
-- =====================================================

DELETE FROM driver_applications;

-- =====================================================
-- 5. RESET ALL DRIVER ROLES TO 'RIDER'
-- =====================================================

UPDATE profiles 
SET role = 'rider' 
WHERE role = 'driver';

-- =====================================================
-- 6. VERIFICATION - Check that everything is deleted
-- =====================================================

SELECT 
  'rides' as table_name, 
  COUNT(*) as remaining_count 
FROM rides
UNION ALL
SELECT 'driver_profiles', COUNT(*) FROM driver_profiles
UNION ALL
SELECT 'driver_applications', COUNT(*) FROM driver_applications
UNION ALL
SELECT 'earnings', COUNT(*) FROM earnings
UNION ALL
SELECT 'trip_locations', COUNT(*) FROM trip_locations
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'payment_methods', COUNT(*) FROM payment_methods
UNION ALL
SELECT 'drivers_in_profiles', COUNT(*) FROM profiles WHERE role = 'driver';

-- All counts should be 0 (except payment_methods if you didn't delete them)


