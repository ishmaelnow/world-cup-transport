/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  Several RLS policies were querying the profiles table to check user roles,
  which caused infinite recursion when accessing the profiles table itself.

  ## Changes
  1. Drop all policies that cause infinite recursion
  2. Create a helper function to get user role from JWT metadata
  3. Recreate policies using JWT metadata instead of table queries
  4. Add a trigger to sync profile role to auth.users metadata

  ## Security
  - Maintains all previous access controls
  - Uses JWT metadata to avoid recursive queries
  - Role is synced from profiles to auth metadata automatically
*/

-- =====================================================
-- 1. DROP PROBLEMATIC POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all driver profiles" ON driver_profiles;
DROP POLICY IF EXISTS "Admins can update driver profiles" ON driver_profiles;
DROP POLICY IF EXISTS "Drivers can view available rides for matching" ON rides;
DROP POLICY IF EXISTS "Admins can view all rides" ON rides;
DROP POLICY IF EXISTS "Admins can update all rides" ON rides;
DROP POLICY IF EXISTS "Admins can view all trip locations" ON trip_locations;

-- =====================================================
-- 2. CREATE HELPER FUNCTION TO GET USER ROLE
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    'rider'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 3. CREATE FUNCTION TO SYNC ROLE TO AUTH METADATA
-- =====================================================

CREATE OR REPLACE FUNCTION sync_role_to_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. CREATE TRIGGER TO AUTO-SYNC ROLE
-- =====================================================

DROP TRIGGER IF EXISTS sync_profile_role_to_auth ON profiles;
CREATE TRIGGER sync_profile_role_to_auth
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_role_to_auth_metadata();

-- =====================================================
-- 5. RECREATE POLICIES WITHOUT RECURSION
-- =====================================================

-- Profiles policies for admins
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

-- Driver profiles policies for admins
CREATE POLICY "Admins can view all driver profiles"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can update driver profiles"
  ON driver_profiles FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Rides policies
CREATE POLICY "Drivers can view available rides for matching"
  ON rides FOR SELECT
  TO authenticated
  USING (
    status IN ('requested', 'matching')
    AND get_user_role() = 'driver'
  );

CREATE POLICY "Admins can view all rides"
  ON rides FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can update all rides"
  ON rides FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Trip locations policies for admins
CREATE POLICY "Admins can view all trip locations"
  ON trip_locations FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

-- =====================================================
-- 6. SYNC EXISTING ROLES TO AUTH METADATA
-- =====================================================

DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN 
    SELECT id, role FROM profiles
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', profile_record.role)
    WHERE id = profile_record.id;
  END LOOP;
END $$;