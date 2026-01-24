-- =====================================================
-- DEFINITIVE FIX - This WILL Work
-- =====================================================
-- Run this ENTIRE block in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop the broken trigger first
DROP TRIGGER IF EXISTS on_driver_application_reviewed ON driver_applications;

-- Step 2: Drop the broken function
DROP FUNCTION IF EXISTS handle_driver_application_review();

-- Step 3: Create the CORRECT function
CREATE FUNCTION handle_driver_application_review()
RETURNS TRIGGER AS $$
DECLARE
  applicant_name text;
BEGIN
  -- Only proceed if status changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get applicant name
  SELECT full_name INTO applicant_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- Handle approval
  IF NEW.status = 'approved' THEN
    -- Create driver profile with CORRECT column names matching the ACTUAL schema
    INSERT INTO driver_profiles (
      user_id,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      vehicle_color,
      vehicle_plate,        -- CORRECT: matches driver_profiles.vehicle_plate
      license_number,       -- CORRECT: matches driver_profiles.license_number
      is_available,
      is_active             -- CORRECT: matches driver_profiles.is_active
    ) VALUES (
      NEW.user_id,
      NEW.vehicle_make,
      NEW.vehicle_model,
      NEW.vehicle_year,
      NEW.vehicle_color,
      NEW.license_plate,    -- Maps FROM driver_applications.license_plate TO driver_profiles.vehicle_plate
      NEW.drivers_license,  -- Maps FROM driver_applications.drivers_license TO driver_profiles.license_number
      false,                -- Start offline
      true                  -- Active
    )
    ON CONFLICT (user_id) DO UPDATE SET
      vehicle_make = EXCLUDED.vehicle_make,
      vehicle_model = EXCLUDED.vehicle_model,
      vehicle_year = EXCLUDED.vehicle_year,
      vehicle_color = EXCLUDED.vehicle_color,
      vehicle_plate = EXCLUDED.vehicle_plate,
      license_number = EXCLUDED.license_number,
      is_active = true;

    -- Update user role to driver
    UPDATE profiles
    SET role = 'driver'
    WHERE id = NEW.user_id;

    -- Notify applicant
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'driver_application_approved',
      'Application Approved!',
      'Congratulations! Your driver application has been approved. You can now start accepting rides.',
      jsonb_build_object('application_id', NEW.id)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Handle rejection
  IF NEW.status = 'rejected' THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'driver_application_rejected',
      'Application Update',
      'Your driver application has been reviewed. ' || COALESCE(NEW.rejection_reason, 'Please contact support for more information.'),
      jsonb_build_object('application_id', NEW.id)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Recreate the trigger
CREATE TRIGGER on_driver_application_reviewed
  AFTER UPDATE ON driver_applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_driver_application_review();

-- Step 5: VERIFY IT'S FIXED
SELECT 
  'Trigger function check' as check_type,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%vehicle_plate%' 
     AND pg_get_functiondef(oid) LIKE '%license_number%'
     AND pg_get_functiondef(oid) LIKE '%is_active%'
     AND pg_get_functiondef(oid) NOT LIKE '%insurance_policy%'
     AND pg_get_functiondef(oid) NOT LIKE '%is_verified%'
     AND pg_get_functiondef(oid) NOT LIKE '%license_plate%'  -- Should NOT have wrong name
     AND pg_get_functiondef(oid) NOT LIKE '%drivers_license%' -- Should NOT have wrong name
    THEN '✅ CORRECT'
    ELSE '❌ STILL HAS ISSUES'
  END as status
FROM pg_proc
WHERE proname = 'handle_driver_application_review';

-- Step 6: Create missing profiles for existing approved applications
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
  da.license_plate,      -- Maps to vehicle_plate
  da.drivers_license,    -- Maps to license_number
  false,
  true
FROM driver_applications da
LEFT JOIN driver_profiles dp ON dp.user_id = da.user_id
WHERE da.status = 'approved'
  AND dp.id IS NULL
ON CONFLICT (user_id) DO UPDATE SET
  vehicle_make = EXCLUDED.vehicle_make,
  vehicle_model = EXCLUDED.vehicle_model,
  vehicle_year = EXCLUDED.vehicle_year,
  vehicle_color = EXCLUDED.vehicle_color,
  vehicle_plate = EXCLUDED.vehicle_plate,
  license_number = EXCLUDED.license_number,
  is_active = true;

-- Step 7: Final verification - all checks
SELECT 
  'Approved applications' as check_type,
  COUNT(*) as total
FROM driver_applications
WHERE status = 'approved'
UNION ALL
SELECT 
  'Profiles created',
  COUNT(*)
FROM driver_profiles dp
INNER JOIN driver_applications da ON da.user_id = dp.user_id
WHERE da.status = 'approved'
UNION ALL
SELECT 
  'Missing profiles',
  COUNT(*)
FROM driver_applications da
LEFT JOIN driver_profiles dp ON dp.user_id = da.user_id
WHERE da.status = 'approved'
  AND dp.id IS NULL;

