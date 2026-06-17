# 🚨 URGENT: Trigger Function Still Broken

## The Problem

Check 1 shows `❌ STILL HAS ISSUES` - this means the trigger function still has wrong column names.

**This is CRITICAL** - Without fixing this, driver profiles will NEVER be created when applications are approved.

## The Fix

### Step 1: Run the Fix SQL

**Copy and paste this entire file into Supabase SQL Editor:**
- `FIX_TRIGGER_NOW.sql`

**OR copy this directly:**

```sql
CREATE OR REPLACE FUNCTION handle_driver_application_review()
RETURNS TRIGGER AS $$
DECLARE
  applicant_name text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO applicant_name
  FROM profiles
  WHERE id = NEW.user_id;

  IF NEW.status = 'approved' THEN
    INSERT INTO driver_profiles (
      user_id,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      vehicle_color,
      vehicle_plate,        -- CORRECT
      license_number,       -- CORRECT
      is_available,
      is_active             -- CORRECT
    ) VALUES (
      NEW.user_id,
      NEW.vehicle_make,
      NEW.vehicle_model,
      NEW.vehicle_year,
      NEW.vehicle_color,
      NEW.license_plate,
      NEW.drivers_license,
      false,
      true
    )
    ON CONFLICT (user_id) DO UPDATE SET
      vehicle_make = EXCLUDED.vehicle_make,
      vehicle_model = EXCLUDED.vehicle_model,
      vehicle_year = EXCLUDED.vehicle_year,
      vehicle_color = EXCLUDED.vehicle_color,
      vehicle_plate = EXCLUDED.vehicle_plate,
      license_number = EXCLUDED.license_number,
      is_active = true;

    UPDATE profiles
    SET role = 'driver'
    WHERE id = NEW.user_id;

    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'driver_application_approved',
      'Application Approved!',
      'Congratulations! Your driver application has been approved. You can now start accepting rides.',
      jsonb_build_object('application_id', NEW.id)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.status = 'rejected' THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'driver_application_rejected',
      'Application Update',
      'Your driver application has been reviewed. ' || COALESCE(NEW.rejection_reason, 'Please contact support for more information.'),
      jsonb_build_object('application_id', NEW.id)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 2: Verify It Worked

Run this verification query:

```sql
SELECT 
  'Trigger function check' as check_type,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%vehicle_plate%' 
     AND pg_get_functiondef(oid) LIKE '%license_number%'
     AND pg_get_functiondef(oid) LIKE '%is_active%'
     AND pg_get_functiondef(oid) NOT LIKE '%insurance_policy%'
     AND pg_get_functiondef(oid) NOT LIKE '%is_verified%'
    THEN '✅ CORRECT'
    ELSE '❌ STILL HAS ISSUES'
  END as status
FROM pg_proc
WHERE proname = 'handle_driver_application_review';
```

**Expected:** Should now show `✅ CORRECT`

### Step 3: Create Missing Profiles

After fixing the trigger, create profiles for existing approved applications:

```sql
INSERT INTO driver_profiles (
  user_id,
  vehicle_make,
  vehicle_model,
  vehicle_year,
  vehicle_color,
  vehicle_plate,
  license_number,
  is_available,
  is_active
)
SELECT 
  da.user_id,
  da.vehicle_make,
  da.vehicle_model,
  da.vehicle_year,
  da.vehicle_color,
  da.license_plate,
  da.drivers_license,
  false,
  true
FROM driver_applications da
LEFT JOIN driver_profiles dp ON dp.user_id = da.user_id
WHERE da.status = 'approved'
  AND dp.id IS NULL
ON CONFLICT (user_id) DO UPDATE SET
  vehicle_make = EXCLUDED.vehicle_make,
  vehicle_model = EXCLUDED.vehicle_model,
  vehicle_year = EXCLUDED.vehicle_year,
  vehicle_color = EXCLUDED.vehicle_color,
  vehicle_plate = EXCLUDED.vehicle_plate,
  license_number = EXCLUDED.license_number,
  is_active = true;
```

## Why This Matters

- **Without this fix:** Driver profiles will NEVER be created automatically
- **With this fix:** Future approvals will work correctly
- **After creating missing profiles:** Existing approved drivers can access dashboard

## Next Steps

1. ✅ Run `FIX_TRIGGER_NOW.sql` 
2. ✅ Verify trigger is fixed (should show ✅ CORRECT)
3. ✅ Create missing profiles (run Step 3 SQL)
4. ✅ Run all 4 verification checks again
5. ✅ Test the app!

