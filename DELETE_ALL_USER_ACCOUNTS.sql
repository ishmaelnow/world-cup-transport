/*
  # DELETE ALL USER ACCOUNTS - Complete Reset
  
  WARNING: This will PERMANENTLY DELETE:
  - ALL user accounts (profiles)
  - ALL authentication records (auth.users)
  - This will cascade delete everything else
  
  Use this ONLY if you want to completely start over with NO users.
  
  Run this in Supabase SQL Editor.
*/

-- =====================================================
-- OPTION 1: Delete all profiles (cascades to auth.users)
-- =====================================================

-- This will delete profiles, which cascades to auth.users
-- But Supabase might not allow direct deletion of auth.users
-- So we'll delete profiles first, then handle auth.users separately

DELETE FROM profiles;

-- =====================================================
-- OPTION 2: Delete from auth.users directly (if allowed)
-- =====================================================
-- Uncomment below if you want to delete auth users too:
-- DELETE FROM auth.users;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT COUNT(*) as remaining_profiles FROM profiles;
SELECT COUNT(*) as remaining_auth_users FROM auth.users;

