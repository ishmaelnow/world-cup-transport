/*
  # Fix Remaining Policy Recursion Issues - Complete Fix

  ## Problem
  Circular policy evaluation causes infinite recursion:
  1. Rider queries rides table
  2. All SELECT policies evaluate (including driver policies)
  3. Driver policy calls helper function which queries other tables
  4. Those tables have policies that query rides (infinite loop)

  ## Solution
  1. Drop policies that use problematic functions
  2. Drop and recreate functions with proper RLS bypass
  3. Recreate policies

  ## Security
  - Functions run with elevated privileges to bypass RLS
  - search_path set to prevent SQL injection
  - All access controls maintained
*/

-- =====================================================
-- 1. DROP POLICIES THAT DEPEND ON FUNCTIONS
-- =====================================================

DROP POLICY IF EXISTS "Drivers can view assigned rides" ON rides;
DROP POLICY IF EXISTS "Drivers can update assigned rides" ON rides;
DROP POLICY IF EXISTS "Riders can view assigned driver details" ON driver_profiles;

-- =====================================================
-- 2. DROP AND RECREATE HELPER FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS is_driver_for_ride(uuid) CASCADE;
DROP FUNCTION IF EXISTS can_view_driver_profile(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_my_driver_profile_id() CASCADE;

-- Function to check if current user is the driver for a ride
-- This bypasses RLS entirely by running as SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_driver_for_ride(ride_driver_id uuid)
RETURNS boolean 
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM driver_profiles
    WHERE id = ride_driver_id
    AND user_id = auth.uid()
  );
$$;

-- Function to check if rider can view a driver profile
-- This bypasses RLS entirely by running as SECURITY DEFINER
CREATE OR REPLACE FUNCTION can_view_driver_profile(check_driver_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM rides
    WHERE driver_id = check_driver_id
    AND rider_id = auth.uid()
    AND status IN ('accepted', 'arriving', 'in_progress')
  );
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION is_driver_for_ride(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_driver_profile(uuid) TO authenticated;

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