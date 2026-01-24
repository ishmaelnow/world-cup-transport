/*
  # Fix Driver Ride Visibility Issue - Secure Approach

  ## Problem
  Drivers can see old bookings but not new ones after production deployment.
  This is because the RLS policy relies on JWT app_metadata which may be stale.

  ## Security Approach
  - Still uses JWT authentication (auth.uid() is required)
  - Checks role from database (source of truth) as fallback
  - Uses SECURITY DEFINER only to bypass RLS for the role check, not authentication
  - This is safe because auth.uid() is still validated by Supabase JWT

  ## Why This Is Secure
  1. Authentication still required (JWT must be valid)
  2. auth.uid() comes from validated JWT token
  3. Only the role check bypasses RLS (read-only operation)
  4. Database is the source of truth for roles
  5. Similar pattern used in other policies (is_driver_for_ride, etc.)
*/

-- =====================================================
-- 1. CREATE HELPER FUNCTION TO CHECK IF USER IS DRIVER
-- Uses JWT auth.uid() for authentication, checks role from DB
-- =====================================================

CREATE OR REPLACE FUNCTION is_current_user_driver()
RETURNS boolean 
LANGUAGE sql
SECURITY DEFINER  -- Needed to bypass RLS on profiles table
STABLE
SET search_path = public
AS $$
  -- Still uses auth.uid() from JWT (authentication required)
  -- Only bypasses RLS to check role from database (source of truth)
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()  -- JWT authentication still required
    AND role = 'driver'
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_current_user_driver() TO authenticated;

-- =====================================================
-- 2. DROP OLD POLICY
-- =====================================================

DROP POLICY IF EXISTS "Drivers can view available rides for matching" ON rides;

-- =====================================================
-- 3. CREATE NEW POLICY USING HYBRID APPROACH
-- =====================================================

CREATE POLICY "Drivers can view available rides for matching"
  ON rides FOR SELECT
  TO authenticated  -- JWT authentication still required
  USING (
    status IN ('requested', 'matching')
    AND is_current_user_driver()  -- Checks role from DB (source of truth)
  );

