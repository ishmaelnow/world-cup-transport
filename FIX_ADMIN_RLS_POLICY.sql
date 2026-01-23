-- FIX: Add missing RLS policy for admins to view all applications
-- Run this in Supabase SQL Editor

-- Create the missing admin policy for SELECT
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

-- Verify the policy was created
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'driver_applications'
ORDER BY policyname;

