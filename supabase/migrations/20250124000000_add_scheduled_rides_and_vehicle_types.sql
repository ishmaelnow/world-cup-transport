-- =====================================================
-- Add Scheduled Rides and Vehicle Types
-- =====================================================
-- 
-- Features:
-- 1. Scheduled rides - riders can book rides for future date/time
-- 2. Vehicle types - Sedan, Standard, SUV
-- =====================================================

-- =====================================================
-- 1. ADD SCHEDULED_AT TO RIDES TABLE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'scheduled_at'
  ) THEN
    ALTER TABLE rides ADD COLUMN scheduled_at timestamptz;
    
    -- Add index for efficient queries
    CREATE INDEX IF NOT EXISTS idx_rides_scheduled_at ON rides(scheduled_at);
    
    -- Add index for finding scheduled rides that need to be activated
    CREATE INDEX IF NOT EXISTS idx_rides_scheduled_status ON rides(scheduled_at, status) 
    WHERE scheduled_at IS NOT NULL;
  END IF;
END $$;

-- =====================================================
-- 2. ADD VEHICLE_TYPE TO RIDES TABLE (Requested Type)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'vehicle_type'
  ) THEN
    ALTER TABLE rides ADD COLUMN vehicle_type text 
    CHECK (vehicle_type IN ('sedan', 'standard', 'suv') OR vehicle_type IS NULL);
    
    -- Add index for filtering
    CREATE INDEX IF NOT EXISTS idx_rides_vehicle_type ON rides(vehicle_type);
  END IF;
END $$;

-- =====================================================
-- 3. ADD VEHICLE_TYPE TO DRIVER_APPLICATIONS TABLE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_applications' AND column_name = 'vehicle_type'
  ) THEN
    ALTER TABLE driver_applications ADD COLUMN vehicle_type text 
    CHECK (vehicle_type IN ('sedan', 'standard', 'suv') OR vehicle_type IS NULL);
  END IF;
END $$;

-- =====================================================
-- 4. ADD VEHICLE_TYPE TO DRIVER_PROFILES TABLE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'vehicle_type'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN vehicle_type text 
    CHECK (vehicle_type IN ('sedan', 'standard', 'suv') OR vehicle_type IS NULL);
    
    -- Add index for filtering
    CREATE INDEX IF NOT EXISTS idx_driver_profiles_vehicle_type ON driver_profiles(vehicle_type);
  END IF;
END $$;

-- =====================================================
-- 5. UPDATE EXISTING DRIVER PROFILES WITH DEFAULT VEHICLE TYPE
-- =====================================================

-- Set default vehicle type for existing drivers based on vehicle model
-- This is a best-guess based on common vehicle categories
UPDATE driver_profiles
SET vehicle_type = CASE
  WHEN LOWER(vehicle_model) LIKE '%suv%' 
    OR LOWER(vehicle_model) LIKE '%tahoe%'
    OR LOWER(vehicle_model) LIKE '%suburban%'
    OR LOWER(vehicle_model) LIKE '%explorer%'
    OR LOWER(vehicle_model) LIKE '%expedition%'
    OR LOWER(vehicle_model) LIKE '%durango%'
    OR LOWER(vehicle_model) LIKE '%grand%cherokee%'
    OR LOWER(vehicle_model) LIKE '%pilot%'
    OR LOWER(vehicle_model) LIKE '%highlander%'
    OR LOWER(vehicle_model) LIKE '%4runner%'
  THEN 'suv'
  WHEN LOWER(vehicle_model) LIKE '%camry%'
    OR LOWER(vehicle_model) LIKE '%accord%'
    OR LOWER(vehicle_model) LIKE '%altima%'
    OR LOWER(vehicle_model) LIKE '%sonata%'
    OR LOWER(vehicle_model) LIKE '%fusion%'
    OR LOWER(vehicle_model) LIKE '%malibu%'
    OR LOWER(vehicle_model) LIKE '%impala%'
    OR LOWER(vehicle_model) LIKE '%civic%'
    OR LOWER(vehicle_model) LIKE '%corolla%'
  THEN 'sedan'
  ELSE 'standard'
END
WHERE vehicle_type IS NULL;

-- =====================================================
-- 6. UPDATE TRIGGER FUNCTION TO INCLUDE VEHICLE_TYPE
-- =====================================================

-- Update the handle_driver_application_review function to include vehicle_type
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
      vehicle_plate,
      license_number,
      vehicle_type,
      is_available,
      is_active
    ) VALUES (
      NEW.user_id,
      NEW.vehicle_make,
      NEW.vehicle_model,
      NEW.vehicle_year,
      NEW.vehicle_color,
      NEW.license_plate,
      NEW.drivers_license,
      NEW.vehicle_type,
      false,
      true
    )
    ON CONFLICT (user_id) DO UPDATE SET
      vehicle_type = NEW.vehicle_type,
      vehicle_make = NEW.vehicle_make,
      vehicle_model = NEW.vehicle_model,
      vehicle_year = NEW.vehicle_year,
      vehicle_color = NEW.vehicle_color,
      vehicle_plate = NEW.license_plate,
      license_number = NEW.drivers_license;

    -- Update user role to driver
    UPDATE profiles
    SET role = 'driver'
    WHERE id = NEW.user_id;

    -- Notify applicant
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
      NEW.user_id,
      'driver_application_approved',
      'Application Approved!',
      'Congratulations! Your driver application has been approved. You can now start accepting rides.'
    );
  END IF;

  -- Handle rejection
  IF NEW.status = 'rejected' THEN
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
      NEW.user_id,
      'driver_application_rejected',
      'Application Update',
      'Your driver application has been reviewed. ' || COALESCE(NEW.rejection_reason, 'Please contact support for more information.')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. UPDATE RLS POLICIES (No changes needed - existing policies cover these fields)
-- =====================================================

-- Existing RLS policies will automatically cover the new fields
-- No additional policies needed

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================

-- Check that columns were added
SELECT 
  'rides.scheduled_at' as column_check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'scheduled_at'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'rides.vehicle_type',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'vehicle_type'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
  'driver_applications.vehicle_type',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_applications' AND column_name = 'vehicle_type'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
  'driver_profiles.vehicle_type',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'vehicle_type'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END;

