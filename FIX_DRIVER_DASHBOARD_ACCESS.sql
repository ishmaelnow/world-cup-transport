-- =====================================================
-- CRITICAL FIX: Driver Cannot Access Dashboard
-- =====================================================
-- 
-- PROBLEM: When admin approves driver application, trigger function
-- tries to create driver_profile but uses WRONG column names.
-- Result: Profile never gets created, driver stuck on approval page.
--
-- SOLUTION: Fix trigger function + create missing profiles
-- =====================================================

-- =====================================================
-- STEP 1: FIX THE TRIGGER FUNCTION (for future approvals)
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
      vehicle_plate,        -- CORRECT: driver_profiles.vehicle_plate
      license_number,       -- CORRECT: driver_profiles.license_number
      is_available,
      is_active
    ) VALUES (
      NEW.user_id,
      NEW.vehicle_make,
      NEW.vehicle_model,
      NEW.vehicle_year,
      NEW.vehicle_color,
      NEW.license_plate,    -- From driver_applications.license_plate
      NEW.drivers_license,  -- From driver_applications.drivers_license
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
-- STEP 2: CREATE PROFILES FOR EXISTING APPROVED APPLICATIONS
-- =====================================================

-- Create driver profiles for any approved applications that don't have profiles yet
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
-- STEP 3: UPDATE USER ROLES FOR APPROVED APPLICATIONS
-- =====================================================

-- Ensure all approved drivers have role = 'driver'
UPDATE profiles
SET role = 'driver'
WHERE id IN (
  SELECT user_id 
  FROM driver_applications 
  WHERE status = 'approved'
)
AND role != 'driver';

-- =====================================================
-- STEP 4: VERIFY THE FIX
-- =====================================================

-- Check that all approved applications now have profiles
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

-- Should show same count for both (or profiles >= applications)

-- Check for any approved applications without profiles (should be 0)
SELECT 
  da.id,
  da.user_id,
  p.full_name,
  da.status,
  da.created_at
FROM driver_applications da
LEFT JOIN driver_profiles dp ON dp.user_id = da.user_id
LEFT JOIN profiles p ON p.id = da.user_id
WHERE da.status = 'approved'
  AND dp.id IS NULL;

-- If this returns rows, those drivers still need profiles created manually

