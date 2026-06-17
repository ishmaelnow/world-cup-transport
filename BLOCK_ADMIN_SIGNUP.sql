-- SECURITY FIX: Block Admin Signup
-- Run this in Supabase SQL Editor

-- Option 1: Add check constraint to prevent admin role in profiles
-- This prevents admin from being set even if someone bypasses frontend
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('rider', 'driver'));

-- Note: To create admin accounts, manually update in Supabase:
-- UPDATE profiles SET role = 'admin' WHERE id = 'user-uuid-here';


