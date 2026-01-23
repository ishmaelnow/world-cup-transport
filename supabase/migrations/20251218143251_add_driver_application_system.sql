/*
  # Driver Application System

  ## Overview
  Implements proper role management with driver applications that require admin approval.
  Admins receive notifications when new driver applications are submitted.

  ## Changes

  1. **New Tables**
    - `driver_applications`: Stores driver application requests
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `status` (text): 'pending', 'approved', 'rejected'
      - `vehicle_make` (text): Vehicle manufacturer
      - `vehicle_model` (text): Vehicle model name
      - `vehicle_year` (integer): Year of manufacture
      - `vehicle_color` (text): Vehicle color
      - `license_plate` (text): License plate number
      - `drivers_license` (text): Driver's license number
      - `insurance_policy` (text): Insurance policy number
      - `rejection_reason` (text, optional): Reason for rejection
      - `reviewed_by` (uuid, optional): Admin who reviewed
      - `reviewed_at` (timestamptz, optional): When reviewed
      - `created_at` (timestamptz): Application submission time
      - `updated_at` (timestamptz): Last update time

  2. **New Notification Types**
    - Added 'driver_application_submitted' for admin notifications
    - Added 'driver_application_approved' for driver notifications
    - Added 'driver_application_rejected' for driver notifications

  3. **Security**
    - Enable RLS on driver_applications
    - Users can view their own applications
    - Users can create their own applications (one per user)
    - Admins can view all applications
    - Admins can update applications (approve/reject)

  4. **Triggers**
    - Notify admins when new driver applications are submitted
    - Notify applicants when their application is approved/rejected
    - Create driver_profile when application is approved
*/

-- Update notification types to include all existing plus new types
ALTER TABLE notifications 
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'ride_request',
    'ride_accepted',
    'ride_completed',
    'ride_cancelled',
    'ride_update',
    'driver_application_submitted',
    'driver_application_approved',
    'driver_application_rejected'
  ));

-- Create driver_applications table
CREATE TABLE IF NOT EXISTS driver_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  vehicle_make text NOT NULL,
  vehicle_model text NOT NULL,
  vehicle_year integer NOT NULL CHECK (vehicle_year >= 1900 AND vehicle_year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
  vehicle_color text NOT NULL,
  license_plate text NOT NULL,
  drivers_license text NOT NULL,
  insurance_policy text NOT NULL,
  
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE driver_applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view own applications"
  ON driver_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
  ON driver_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can create their own application (one per user due to UNIQUE constraint)
CREATE POLICY "Users can create own application"
  ON driver_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can update applications
CREATE POLICY "Admins can update applications"
  ON driver_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to notify admins of new driver applications
CREATE OR REPLACE FUNCTION notify_admins_of_driver_application()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  applicant_name text;
BEGIN
  -- Get applicant name
  SELECT full_name INTO applicant_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- Notify all admins
  FOR admin_record IN 
    SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      admin_record.id,
      'driver_application_submitted',
      'New Driver Application',
      applicant_name || ' has submitted a driver application for review.',
      jsonb_build_object(
        'application_id', NEW.id,
        'applicant_id', NEW.user_id,
        'applicant_name', applicant_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify applicant and create driver profile on approval
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
    -- Create driver profile
    INSERT INTO driver_profiles (
      user_id,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      vehicle_color,
      license_plate,
      drivers_license,
      insurance_policy,
      is_available,
      is_verified
    ) VALUES (
      NEW.user_id,
      NEW.vehicle_make,
      NEW.vehicle_model,
      NEW.vehicle_year,
      NEW.vehicle_color,
      NEW.license_plate,
      NEW.drivers_license,
      NEW.insurance_policy,
      false,
      true
    )
    ON CONFLICT (user_id) DO NOTHING;

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
    );
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
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
DROP TRIGGER IF EXISTS on_driver_application_submitted ON driver_applications;
CREATE TRIGGER on_driver_application_submitted
  AFTER INSERT ON driver_applications
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_admins_of_driver_application();

DROP TRIGGER IF EXISTS on_driver_application_reviewed ON driver_applications;
CREATE TRIGGER on_driver_application_reviewed
  AFTER UPDATE ON driver_applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_driver_application_review();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_driver_application_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS driver_applications_updated_at ON driver_applications;
CREATE TRIGGER driver_applications_updated_at
  BEFORE UPDATE ON driver_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_application_updated_at();