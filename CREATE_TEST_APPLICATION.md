# 🧪 Create Test Driver Application

## Quick Steps to Test

### Option 1: Using Browser (Easiest)

1. **Open a New Incognito/Private Window** (or use a different browser)
   - This lets you login as a different user

2. **Sign Up as Driver:**
   - Go to your app URL (usually `http://localhost:5174`)
   - Click **Sign Up**
   - Select **Role: Driver**
   - Use email: `testdriver@example.com`
   - Create password
   - Complete signup

3. **Submit Driver Application:**
   - After login, you should be redirected to `/driver/onboarding`
   - Fill out the form:
     - Full Name: `Test Driver`
     - Vehicle Make: `Toyota`
     - Vehicle Model: `Camry`
     - Vehicle Year: `2020`
     - Vehicle Color: `Silver`
     - License Plate: `ABC1234`
     - Driver's License: `DL123456789`
     - Insurance Policy: `INS123456789`
   - Click **Submit Application**

4. **Switch Back to Admin:**
   - Close the incognito window
   - Refresh your admin dashboard
   - Go to **Applications** tab
   - You should now see the pending application!

---

### Option 2: Using Supabase SQL Editor (Quick Test)

1. **Get a Test User ID:**
   - In Supabase Dashboard → **Table Editor** → `profiles`
   - Find any user (or create one)
   - Copy their `id` (UUID)

2. **Insert Test Application:**
   - Go to **SQL Editor** in Supabase
   - Run this SQL (replace `USER_ID_HERE`):

```sql
-- Insert test driver application
INSERT INTO driver_applications (
  user_id,
  status,
  vehicle_make,
  vehicle_model,
  vehicle_year,
  vehicle_color,
  license_plate,
  drivers_license,
  insurance_policy
) VALUES (
  'USER_ID_HERE',  -- Replace with actual user ID
  'pending',
  'Toyota',
  'Camry',
  2020,
  'Silver',
  'ABC1234',
  'DL123456789',
  'INS123456789'
);
```

3. **Refresh Admin Dashboard:**
   - The application should appear immediately!

---

### Option 3: Check Existing Applications

If applications exist but aren't showing:

1. **Check Browser Console:**
   - Press **F12** → **Console** tab
   - Look for errors when loading applications
   - Should see: `Loaded applications: [...]`

2. **Verify Admin Role:**
   ```sql
   -- Check your admin role
   SELECT id, email, role FROM profiles WHERE role = 'admin';
   ```

3. **Check RLS Policies:**
   ```sql
   -- Verify admin can see applications
   SELECT * FROM pg_policies 
   WHERE tablename = 'driver_applications';
   ```

---

## Expected Result

After creating a test application:
- ✅ **Applications tab** shows: `Total: 1 | Pending: 1`
- ✅ **Pending Applications** table shows the test driver
- ✅ **Approve/Reject** buttons are visible
- ✅ Yellow warning box disappears

---

## Troubleshooting

**Still not showing?**
1. Check browser console for errors
2. Verify your user has `role = 'admin'` in `profiles` table
3. Check Supabase logs for RLS policy violations
4. Try logging out and back in as admin


