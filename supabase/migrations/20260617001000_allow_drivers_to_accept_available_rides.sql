DROP POLICY IF EXISTS "Drivers can accept available rides" ON rides;

CREATE POLICY "Drivers can accept available rides"
  ON rides FOR UPDATE
  TO authenticated
  USING (
    driver_id IS NULL
    AND status IN ('requested', 'matching')
    AND EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'driver'
    )
  )
  WITH CHECK (
    status = 'accepted'
    AND driver_id IN (
      SELECT driver_profiles.id
      FROM driver_profiles
      WHERE driver_profiles.user_id = auth.uid()
      AND driver_profiles.is_available = true
      AND driver_profiles.is_active = true
    )
  );
