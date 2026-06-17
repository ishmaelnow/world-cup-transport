# 🔍 Debugging Driver Applications Not Showing

## Quick Checks

### 1. **Check Browser Console**
Open Admin Dashboard → Press **F12** → **Console tab**
Look for:
- `Error loading applications:` - Shows database errors
- `Loaded applications:` - Shows how many applications were found

### 2. **Verify Admin Role**
In Supabase Dashboard:
1. Go to **Table Editor** → `profiles` table
2. Find your user ID
3. Check `role` column = **'admin'**

### 3. **Check if Applications Exist**
In Supabase Dashboard:
1. Go to **Table Editor** → `driver_applications` table
2. Check if there are any rows
3. If empty, you need to submit a driver application first

### 4. **Check RLS Policies**
In Supabase Dashboard:
1. Go to **Authentication** → **Policies**
2. Find `driver_applications` table
3. Verify these policies exist:
   - ✅ "Admins can view all applications" (SELECT)
   - ✅ "Users can view own applications" (SELECT)

---

## Common Issues & Fixes

### Issue 1: No Applications in Database
**Solution:** Submit a driver application:
1. Logout as admin
2. Sign up/login as a **Driver** (not admin)
3. Go to `/driver/onboarding`
4. Fill out the form and submit
5. Logout and login back as admin
6. Check Applications tab

### Issue 2: RLS Policy Blocking Admin
**Solution:** Run this SQL in Supabase SQL Editor:

```sql
-- Check if admin policy exists
SELECT * FROM pg_policies 
WHERE tablename = 'driver_applications' 
AND policyname = 'Admins can view all applications';

-- If missing, create it:
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
```

### Issue 3: User Role Not Set to Admin
**Solution:** Run this SQL (replace `YOUR_USER_ID`):

```sql
-- Find your user ID first:
SELECT id, email, role FROM profiles WHERE role = 'admin';

-- If you're not admin, update:
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'YOUR_USER_ID';
```

### Issue 4: Table Doesn't Exist
**Solution:** Run migrations:

```sql
-- Check if table exists:
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'driver_applications'
);

-- If false, run the migration:
-- Go to supabase/migrations/20251218143251_add_driver_application_system.sql
-- Copy and run in Supabase SQL Editor
```

---

## Test Driver Application Submission

1. **Create Test Driver Account:**
   - Sign up with email: `testdriver@example.com`
   - Role: **Driver**
   - Complete onboarding form

2. **Check Application Appears:**
   - Login as admin
   - Go to Admin Dashboard → **Applications** tab
   - Should see pending application

---

## Still Not Working?

Check browser console for errors and share them!


