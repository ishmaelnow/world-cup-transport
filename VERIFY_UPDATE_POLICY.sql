-- Check if UPDATE policy exists for admins
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'driver_applications'
AND cmd = 'UPDATE';

-- If no UPDATE policy exists, create it:
CREATE POLICY IF NOT EXISTS "Admins can update applications"
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

