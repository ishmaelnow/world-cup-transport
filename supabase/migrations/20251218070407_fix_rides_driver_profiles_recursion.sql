/*
  # Fix Circular Dependency Between Rides and Driver Profiles

  ## Problem
  Circular dependency causing infinite recursion:
  - "Drivers can view assigned rides" policy queries driver_profiles table
  - "Riders can view assigned driver details" policy queries rides table
  This creates an infinite loop when either table is accessed.

  ## Solution
  1. Drop the problematic policies
  2. Create security definer functions to safely check relationships
  3. Recreate policies using these helper functions

  ## Security
  - Maintains all access controls
  - Uses helper functions to break circular dependencies
  - Functions are SECURITY DEFINER to bypass RLS during checks
*/

-- =====================================================
-- 1. DROP PROBLEMATIC POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Drivers can view assigned rides" ON rides;
DROP POLICY IF EXISTS "Drivers can update assigned rides" ON rides;
DROP POLICY IF EXISTS "Riders can view assigned driver details" ON driver_profiles;

-- =====================================================
-- 2. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is the driver for a ride
CREATE OR REPLACE FUNCTION is_driver_for_ride(ride_driver_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM driver_profiles
    WHERE id = ride_driver_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is rider with active ride assigned to driver
CREATE OR REPLACE FUNCTION can_view_driver_profile(check_driver_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM rides
    WHERE driver_id = check_driver_id
    AND rider_id = auth.uid()
    AND status IN ('accepted', 'arriving', 'in_progress')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get driver profile id for current user
CREATE OR REPLACE FUNCTION get_my_driver_profile_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT id FROM driver_profiles
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 3. RECREATE POLICIES WITHOUT CIRCULAR DEPENDENCIES
-- =====================================================

-- Drivers can view their assigned rides
CREATE POLICY "Drivers can view assigned rides"
  ON rides FOR SELECT
  TO authenticated
  USING (is_driver_for_ride(driver_id));

-- Drivers can update their assigned rides
CREATE POLICY "Drivers can update assigned rides"
  ON rides FOR UPDATE
  TO authenticated
  USING (is_driver_for_ride(driver_id));

-- Riders can view driver details for their active rides
CREATE POLICY "Riders can view assigned driver details"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING (can_view_driver_profile(id));