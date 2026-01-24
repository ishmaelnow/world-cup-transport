-- =====================================================
-- IMMEDIATE FIX: Replace the Broken Trigger Function
-- =====================================================
-- Run this to fix the trigger function RIGHT NOW
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
-- VERIFY THE FIX
-- =====================================================

-- Run this after the fix to verify:
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

