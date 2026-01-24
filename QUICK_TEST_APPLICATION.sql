-- Quick Test: Create a Driver Application
-- Run this in Supabase SQL Editor

-- Step 1: Check if you have any users (or create a test user)
-- If you don't have a test user, uncomment and run this first:
/*
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'testdriver@example.com',
  crypt('test123456', gen_salt('bf')),
  now(),
  now(),
  now()
)
ON CONFLICT (email) DO NOTHING
RETURNING id;
*/

-- Step 2: Get a user ID to use for the application
-- Run this to see available users:
SELECT id, email, role, full_name 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 3: Insert test application
-- Replace 'USER_ID_HERE' with an actual UUID from Step 2
-- Or use this to get the first non-admin user:
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Get first user that's not an admin (or create one)
  SELECT id INTO test_user_id
  FROM profiles
  WHERE role != 'admin'
  LIMIT 1;
  
  -- If no user found, you'll need to create one via signup first
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No non-admin users found. Please sign up as a driver first, or use a user ID manually.';
  ELSE
    -- Insert the test application
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
      test_user_id,
      'pending',
      'Toyota',
      'Camry',
      2020,
      'Silver',
      'ABC1234',
      'DL123456789',
      'INS123456789'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      status = 'pending',
      vehicle_make = 'Toyota',
      vehicle_model = 'Camry',
      vehicle_year = 2020,
      vehicle_color = 'Silver',
      license_plate = 'ABC1234',
      drivers_license = 'DL123456789',
      insurance_policy = 'INS123456789',
      updated_at = now();
    
    RAISE NOTICE 'Test application created for user: %', test_user_id;
  END IF;
END $$;

-- Step 4: Verify the application was created
SELECT 
  da.id,
  da.status,
  p.email,
  p.full_name,
  da.vehicle_make,
  da.vehicle_model,
  da.created_at
FROM driver_applications da
JOIN profiles p ON p.id = da.user_id
ORDER BY da.created_at DESC;


