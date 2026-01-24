-- FIXED: Block Admin Signup (Allows Existing Admins)

-- Step 1: Check existing admin users
SELECT id, email, role, full_name 
FROM profiles 
WHERE role = 'admin';

-- Step 2: If you want to remove test admin accounts:
-- UPDATE profiles SET role = 'rider' WHERE role = 'admin' AND email LIKE '%test%';
-- Or delete: DELETE FROM profiles WHERE role = 'admin' AND email = 'test@example.com';

-- Step 3: Add RLS policy to block new admin signups
CREATE POLICY "Block admin signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    role != 'admin' OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Step 4: Update check constraint (allows existing admins)
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Keep constraint that allows all three roles (for existing admins)
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('rider', 'driver', 'admin'));

-- The RLS policy above will block new admin inserts
-- Existing admins can still log in and function normally


