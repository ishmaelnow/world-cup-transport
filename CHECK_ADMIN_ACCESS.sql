-- Check if your user account has admin role
-- Replace 'YOUR_EMAIL_HERE' with your actual email address

-- Step 1: Find your user ID from auth.users
SELECT id, email, raw_app_meta_data->>'role' as jwt_role
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE';

-- Step 2: Check your role in profiles table
SELECT id, email, role, full_name
FROM profiles
WHERE email = 'YOUR_EMAIL_HERE';

-- Step 3: If you need to set yourself as admin (replace USER_ID_HERE with your actual UUID)
-- UPDATE profiles
-- SET role = 'admin'
-- WHERE id = 'USER_ID_HERE';

