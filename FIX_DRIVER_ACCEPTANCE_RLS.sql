-- =====================================================
-- CRITICAL FIX: Driver Cannot Accept Rides
-- =====================================================
-- PROBLEM: RLS policy "Drivers can update assigned rides" only allows
-- updates when driver_id is already set. But when accepting a ride,
-- driver_id is NULL, so the policy blocks the update!
--
-- SOLUTION: Add a policy that allows drivers to accept rides
-- (update rides where driver_id IS NULL and status is matching/requested)
-- =====================================================

-- Drop the restrictive policy (or we'll add a new one that allows both)
-- Actually, keep the existing one for updating assigned rides, but add a new one for accepting

-- Policy to allow drivers to ACCEPT rides (set driver_id when it's NULL)
CREATE POLICY "Drivers can accept available rides"
  ON rides FOR UPDATE
  TO authenticated
  USING (
    -- Can only accept if:
    -- 1. User is a driver
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'driver'
    -- 2. Ride status is matching or requested
    AND status IN ('matching', 'requested')
    -- 3. No driver assigned yet
    AND driver_id IS NULL
    -- 4. Driver profile exists and is active
    AND EXISTS (
      SELECT 1 FROM driver_profiles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  )
  WITH CHECK (
    -- After update, verify driver_id matches this driver's profile
    driver_id IN (
      SELECT id FROM driver_profiles WHERE user_id = auth.uid()
    )
  );

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'rides'
  AND policyname LIKE '%accept%' OR policyname LIKE '%driver%'
ORDER BY policyname;

