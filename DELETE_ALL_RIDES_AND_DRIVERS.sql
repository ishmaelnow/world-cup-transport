/*
  # Delete All Rides and Drivers - Clean Slate
  
  WARNING: This will permanently delete ALL:
  - Rides (all statuses)
  - Driver profiles
  - Driver applications
  - Earnings
  - Notifications related to rides/drivers
  - Trip locations
  
  This is useful for testing/development reset.
  
  Run this in Supabase SQL Editor.
*/

-- =====================================================
-- 1. DELETE RELATED DATA FIRST (due to foreign keys)
-- =====================================================

-- Delete trip locations (references rides)
DELETE FROM trip_locations;

-- Delete earnings (references rides and driver_profiles)
DELETE FROM earnings;

-- Delete notifications related to rides/drivers
DELETE FROM notifications 
WHERE ride_id IS NOT NULL 
   OR type IN ('ride_update', 'payment', 'verification');

-- Note: payment_methods are user-specific, not ride-specific
-- Uncomment below if you want to delete ALL payment methods:
-- DELETE FROM payment_methods;

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
-- 5. RESET DRIVER ROLE IN PROFILES (OPTIONAL)
-- =====================================================
-- Uncomment if you want to reset driver roles back to 'rider':
-- UPDATE profiles SET role = 'rider' WHERE role = 'driver';

-- =====================================================
-- VERIFICATION QUERIES (run after deletion)
-- =====================================================

-- Check remaining counts
SELECT 'rides' as table_name, COUNT(*) as count FROM rides
UNION ALL
SELECT 'driver_profiles', COUNT(*) FROM driver_profiles
UNION ALL
SELECT 'driver_applications', COUNT(*) FROM driver_applications
UNION ALL
SELECT 'earnings', COUNT(*) FROM earnings
UNION ALL
SELECT 'trip_locations', COUNT(*) FROM trip_locations;

