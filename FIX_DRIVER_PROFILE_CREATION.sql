/*
  # Fix Driver Profile Creation - Permanent Solution
  
  This fixes the trigger function that creates driver profiles when applications are approved.
  It also creates profiles for any existing approved applications that don't have profiles.
  
  Run this ONCE in Supabase SQL Editor.
*/

-- =====================================================
-- 1. FIX THE TRIGGER FUNCTION (for future approvals)
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
    -- Create driver profile with CORRECT column names matching the schema
    INSERT INTO driver_profiles (
      user_id,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      vehicle_color,
      vehicle_plate,        -- Correct: driver_profiles.vehicle_plate (not license_plate)
      license_number,       -- Correct: driver_profiles.license_number (not drivers_license)
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
    ON CONFLICT (user_id) DO NOTHING;

    -- Update user role to driver
    UPDATE profiles
    SET role = 'driver'
    WHERE id = NEW.user_id;

    -- Notify applicant
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
      NEW.user_id,
      'verification',
      'Application Approved!',
      'Congratulations! Your driver application has been approved. You can now start accepting rides.'
    );
  END IF;

  -- Handle rejection
  IF NEW.status = 'rejected' THEN
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
      NEW.user_id,
      'verification',
      'Application Update',
      'Your driver application has been reviewed. ' || COALESCE(NEW.rejection_reason, 'Please contact support for more information.')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. CREATE PROFILES FOR EXISTING APPROVED APPLICATIONS
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
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 3. VERIFY THE FIX
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

-- Should show same count for both


