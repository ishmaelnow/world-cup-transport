-- Check if driver profile was created after application approval
-- Replace USER_ID_HERE with the driver's user ID

-- Check application status
SELECT 
  id,
  user_id,
  status,
  reviewed_at,
  vehicle_make,
  vehicle_model
FROM driver_applications
WHERE user_id = 'USER_ID_HERE';

-- Check if driver profile exists
SELECT 
  id,
  user_id,
  vehicle_make,
  vehicle_model,
  is_available,
  is_active,
  is_verified
FROM driver_profiles
WHERE user_id = 'USER_ID_HERE';

-- If profile doesn't exist but application is approved, manually create it:
-- (Replace USER_ID_HERE and get values from application above)
/*
INSERT INTO driver_profiles (
  user_id,
  vehicle_make,
  vehicle_model,
  vehicle_year,
  vehicle_color,
  vehicle_plate,
  license_number,
  is_available,
  is_active,
  is_verified
)
SELECT 
  user_id,
  vehicle_make,
  vehicle_model,
  vehicle_year,
  vehicle_color,
  license_plate,
  drivers_license,
  false,  -- Start offline
  true,   -- Active
  true    -- Verified
FROM driver_applications
WHERE user_id = 'USER_ID_HERE'
AND status = 'approved'
ON CONFLICT (user_id) DO NOTHING;
*/


