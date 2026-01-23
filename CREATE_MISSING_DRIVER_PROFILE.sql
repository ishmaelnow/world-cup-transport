-- Step 1: Find approved applications without driver profiles
SELECT 
  da.user_id,
  p.full_name,
  da.status,
  da.vehicle_make,
  da.vehicle_model,
  CASE 
    WHEN dp.id IS NULL THEN 'MISSING PROFILE'
    ELSE 'PROFILE EXISTS'
  END as profile_status
FROM driver_applications da
JOIN profiles p ON p.id = da.user_id
LEFT JOIN driver_profiles dp ON dp.user_id = da.user_id
WHERE da.status = 'approved'
ORDER BY da.reviewed_at DESC;

-- Step 2: Create driver profiles for ALL approved applications missing profiles
-- This will create profiles for any approved driver that doesn't have one yet
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
  da.license_plate,
  da.drivers_license,
  false,  -- Start offline
  true    -- Active
FROM driver_applications da
WHERE da.status = 'approved'
AND NOT EXISTS (
  SELECT 1 FROM driver_profiles dp 
  WHERE dp.user_id = da.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Verify profiles were created
SELECT 
  dp.id,
  p.full_name,
  dp.vehicle_make,
  dp.vehicle_model,
  dp.is_available,
  dp.is_active
FROM driver_profiles dp
JOIN profiles p ON p.id = dp.user_id
ORDER BY dp.created_at DESC;

