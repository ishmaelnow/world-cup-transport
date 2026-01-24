-- Step 1: Check for existing admin users
SELECT id, email, role, full_name 
FROM profiles 
WHERE role = 'admin';

-- Step 2: If you want to keep existing admins but block new ones:
-- First, update any test/admin accounts you want to keep
-- Then run the constraint update below

-- Step 3: Update constraint (allows existing admins, blocks new ones)
-- This uses a function to check, allowing existing 'admin' values
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Create a function-based constraint that allows existing admins
CREATE OR REPLACE FUNCTION check_role_allowed()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow existing admin roles (check if already exists)
  IF NEW.role = 'admin' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.id AND role = 'admin'
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Block new admin signups
  IF NEW.role = 'admin' THEN
    RAISE EXCEPTION 'Admin accounts cannot be created through signup';
  END IF;
  
  -- Allow rider and driver
  IF NEW.role IN ('rider', 'driver') THEN
    RETURN NEW;
  END IF;
  
  RAISE EXCEPTION 'Invalid role: %', NEW.role;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to enforce this
DROP TRIGGER IF EXISTS check_role_on_insert ON profiles;
CREATE TRIGGER check_role_on_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_role_allowed();

-- Simpler: Just update constraint to allow existing admins
-- But prevent new admin inserts via RLS policy instead


