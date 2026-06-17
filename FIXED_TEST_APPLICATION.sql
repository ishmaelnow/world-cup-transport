-- FIXED SQL - Copy and paste this into Supabase SQL Editor
-- The profiles table doesn't have 'email' column - email is in auth.users

-- Step 1: Get user IDs from profiles table (run this first)
SELECT 
  p.id, 
  p.role, 
  p.full_name,
  p.phone,
  au.email  -- Email comes from auth.users table
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id
ORDER BY p.created_at DESC 
LIMIT 5;

-- Step 2: Insert test application (replace YOUR_USER_ID_HERE with UUID from Step 1)
-- If you don't have a non-admin user, you'll need to sign up as a driver first
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
  'YOUR_USER_ID_HERE',  -- Replace with actual UUID from Step 1
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
  p.full_name,
  p.phone,
  au.email,
  da.vehicle_make || ' ' || da.vehicle_model as vehicle,
  da.created_at
FROM driver_applications da
JOIN profiles p ON p.id = da.user_id
LEFT JOIN auth.users au ON au.id = p.id
ORDER BY da.created_at DESC;


