/*
  # Fix Driver Profile Creation Trigger
  
  The trigger function has incorrect column names.
  This fixes it to match the actual schema.
*/

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
      vehicle_plate,        -- Fixed: driver_profiles uses vehicle_plate (not license_plate)
      license_number,       -- Fixed: driver_profiles uses license_number (not drivers_license)
      is_available,
      is_active
    ) VALUES (
      NEW.user_id,
      NEW.vehicle_make,
      NEW.vehicle_model,
      NEW.vehicle_year,
      NEW.vehicle_color,
      NEW.license_plate,    -- From driver_applications table
      NEW.drivers_license,  -- From driver_applications table
      false,
      true
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
