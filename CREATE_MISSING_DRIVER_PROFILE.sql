/*
  # Create Driver Profile for Approved Application
  
  This manually creates the driver profile for any approved applications
  that don't have a profile yet.
*/

-- First, check what approved applications exist without profiles
SELECT 
  da.id as application_id,
  da.user_id,
  da.status,
  dp.id as profile_exists
FROM driver_applications da
LEFT JOIN driver_profiles dp ON dp.user_id = da.user_id
WHERE da.status = 'approved'
  AND dp.id IS NULL;

-- Create profiles for all approved applications missing profiles
INSERT INTO driver_profiles (
  user_id,
  vehicle_make,
  vehicle_model,
  vehicle_year,
  vehicle_color,
  vehicle_plate,
  license_number,
  is_available,
  is_active
)
SELECT 
  da.user_id,
  da.vehicle_make,
  da.vehicle_model,
  da.vehicle_year,
  da.vehicle_color,
  da.license_plate,      -- Maps to vehicle_plate in driver_profiles
  da.drivers_license,     -- Maps to license_number in driver_profiles
  false,                  -- Start offline
  true                    -- Active
FROM driver_applications da
LEFT JOIN driver_profiles dp ON dp.user_id = da.user_id
WHERE da.status = 'approved'
  AND dp.id IS NULL        -- Only create if profile doesn't exist
ON CONFLICT (user_id) DO NOTHING;

-- Verify profiles were created
SELECT 
  'Created profiles' as status,
  COUNT(*) as count
FROM driver_profiles dp
INNER JOIN driver_applications da ON da.user_id = dp.user_id
WHERE da.status = 'approved';
