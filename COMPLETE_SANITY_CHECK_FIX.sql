-- =====================================================
-- COMPLETE SANITY CHECK FIX
-- Fixes ALL identified issues in the codebase
-- =====================================================

-- =====================================================
-- ISSUE 1: Driver Application Trigger Uses Wrong Column Names
-- =====================================================
-- PROBLEM: Trigger tries to insert into columns that don't exist:
--   - license_plate (should be vehicle_plate)
--   - drivers_license (should be license_number)
--   - insurance_policy (doesn't exist in driver_profiles)
--   - is_verified (doesn't exist, should be is_active)
--
-- RESULT: Driver profiles never get created when application approved
-- =====================================================

CREATE OR REPLACE FUNCTION handle_driver_application_review()
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
    -- Create driver profile with CORRECT column names
    INSERT INTO driver_profiles (
      user_id,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      vehicle_color,
      vehicle_plate,        -- CORRECT: matches schema
      license_number,       -- CORRECT: matches schema
      is_available,
      is_active             -- CORRECT: matches schema (not is_verified)
    ) VALUES (
      NEW.user_id,
      NEW.vehicle_make,
      NEW.vehicle_model,
      NEW.vehicle_year,
      NEW.vehicle_color,
      NEW.license_plate,    -- Maps from driver_applications.license_plate
      NEW.drivers_license,  -- Maps from driver_applications.drivers_license
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

-- =====================================================
-- ISSUE 2: Create Missing Driver Profiles for Approved Applications
-- =====================================================

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
  false,                 -- Start offline
  true                   -- Active
FROM driver_applications da
LEFT JOIN driver_profiles dp ON dp.user_id = da.user_id
WHERE da.status = 'approved'
  AND dp.id IS NULL        -- Only create if profile doesn't exist
ON CONFLICT (user_id) DO UPDATE SET
  vehicle_make = EXCLUDED.vehicle_make,
  vehicle_model = EXCLUDED.vehicle_model,
  vehicle_year = EXCLUDED.vehicle_year,
  vehicle_color = EXCLUDED.vehicle_color,
  vehicle_plate = EXCLUDED.vehicle_plate,
  license_number = EXCLUDED.license_number,
  is_active = true;

-- =====================================================
-- ISSUE 3: Ensure All Approved Drivers Have Role = 'driver'
-- =====================================================

UPDATE profiles
SET role = 'driver'
WHERE id IN (
  SELECT user_id 
  FROM driver_applications 
  WHERE status = 'approved'
)
AND role != 'driver';

-- =====================================================
-- ISSUE 4: Verify Realtime is Enabled for Rides Table
-- =====================================================

-- Check if realtime is enabled (this should already be done, but verify)
-- If not enabled, run: ALTER PUBLICATION supabase_realtime ADD TABLE rides;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check 1: Verify trigger function is correct
SELECT 
  'Trigger function check' as check_type,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%vehicle_plate%' 
     AND pg_get_functiondef(oid) LIKE '%license_number%'
     AND pg_get_functiondef(oid) LIKE '%is_active%'
     AND pg_get_functiondef(oid) NOT LIKE '%insurance_policy%'
     AND pg_get_functiondef(oid) NOT LIKE '%is_verified%'
    THEN '✅ CORRECT'
    ELSE '❌ STILL HAS ISSUES'
  END as status
FROM pg_proc
WHERE proname = 'handle_driver_application_review';

-- Check 2: Verify all approved applications have profiles
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
WHERE da.status = 'approved';

-- Check 3: Find any approved applications without profiles (should be 0)
SELECT 
  'Missing profiles' as check_type,
  COUNT(*) as total
FROM driver_applications da
LEFT JOIN driver_profiles dp ON dp.user_id = da.user_id
WHERE da.status = 'approved'
  AND dp.id IS NULL;

-- Check 4: Verify all approved drivers have role = 'driver'
SELECT 
  'Approved drivers with wrong role' as check_type,
  COUNT(*) as total
FROM driver_applications da
INNER JOIN profiles p ON p.id = da.user_id
WHERE da.status = 'approved'
  AND p.role != 'driver';

