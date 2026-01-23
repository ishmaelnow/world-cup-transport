/*
  # Fix Foreign Key References

  ## Changes
  
  1. **Fix ratings table**
     - Change `driver_id` foreign key from `profiles(id)` to `driver_profiles(id)`
     - This ensures consistency as driver_id should reference the driver_profiles table
  
  2. **Fix earnings table**
     - Change `driver_id` foreign key from `profiles(id)` to `driver_profiles(id)`
     - This ensures consistency as driver_id should reference the driver_profiles table
  
  3. **Add driver name field**
     - Add `driver_name` field to driver_profiles for displaying driver names
  
  ## Security
     - All existing RLS policies remain intact
*/

-- Drop existing foreign key constraints and recreate with correct references
DO $$
BEGIN
  -- Fix ratings table driver_id foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ratings_driver_id_fkey' 
    AND table_name = 'ratings'
  ) THEN
    ALTER TABLE ratings DROP CONSTRAINT ratings_driver_id_fkey;
    ALTER TABLE ratings ADD CONSTRAINT ratings_driver_id_fkey 
      FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE;
  END IF;

  -- Fix earnings table driver_id foreign key  
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'earnings_driver_id_fkey' 
    AND table_name = 'earnings'
  ) THEN
    ALTER TABLE earnings DROP CONSTRAINT earnings_driver_id_fkey;
    ALTER TABLE earnings ADD CONSTRAINT earnings_driver_id_fkey 
      FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE;
  END IF;

  -- Add driver_name field to driver_profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'driver_name'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN driver_name text DEFAULT '';
  END IF;
END $$;