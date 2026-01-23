-- COMPLETE SQL - Copy and paste this entire block into Supabase SQL Editor

-- Step 1: First, get a user ID (run this first to see available users)
SELECT id, email, role, full_name 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 2: Copy one of the user IDs from Step 1, then run this:
-- Replace 'YOUR_USER_ID_HERE' with the actual UUID from Step 1

INSERT INTO driver_applications (
  user_id,
  status,
  vehicle_make,
  vehicle_model,
  vehicle_year,
  vehicle_color,
  license_plate,
  drivers_license,
  insurance_policy
) VALUES (
  'YOUR_USER_ID_HERE',  -- Replace this with actual UUID from profiles table
  'pending',
  'Toyota',
  'Camry',
  2020,
  'Silver',
  'ABC1234',
  'DL123456789',
  'INS123456789'
);

-- Step 3: Verify it was created (run this after Step 2)
SELECT 
  da.id,
  da.status,
  p.email,
  p.full_name,
  da.vehicle_make || ' ' || da.vehicle_model as vehicle,
  da.created_at
FROM driver_applications da
JOIN profiles p ON p.id = da.user_id
ORDER BY da.created_at DESC;

