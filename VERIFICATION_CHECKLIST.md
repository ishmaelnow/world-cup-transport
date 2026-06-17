# ✅ Verification Checklist - Run These Queries

## After Running `COMPLETE_SANITY_CHECK_FIX.sql`

Run these verification queries in Supabase SQL Editor to confirm everything is fixed:

### ✅ Check 1: Verify Trigger Function is Correct

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

**Expected:** Should show `✅ CORRECT`

---

### ✅ Check 2: Verify All Approved Applications Have Profiles

```sql
SELECT 
  'Approved applications' as check_type,
  COUNT(*) as total
FROM driver_applications
WHERE status = 'approved'
UNION ALL
SELECT 
  'Profiles created',
  COUNT(*)
FROM driver_profiles dp
INNER JOIN driver_applications da ON da.user_id = dp.user_id
WHERE da.status = 'approved';
```

**Expected:** Both counts should match (or profiles >= applications)

---

### ✅ Check 3: Find Missing Profiles (Should be 0)

```sql
SELECT 
  'Missing profiles' as check_type,
  COUNT(*) as total
FROM driver_applications da
LEFT JOIN driver_profiles dp ON dp.user_id = da.user_id
WHERE da.status = 'approved'
  AND dp.id IS NULL;
```

**Expected:** Should show `total: 0`

---

### ✅ Check 4: Verify All Approved Drivers Have Role = 'driver'

```sql
SELECT 
  'Approved drivers with wrong role' as check_type,
  COUNT(*) as total
FROM driver_applications da
INNER JOIN profiles p ON p.id = da.user_id
WHERE da.status = 'approved'
  AND p.role != 'driver';
```

**Expected:** Should show `total: 0` ✅ (You already verified this!)

---

## Summary

If all 4 checks pass:
- ✅ Trigger function is fixed
- ✅ All approved drivers have profiles
- ✅ All approved drivers have correct role
- ✅ System is ready to use!

## Next Steps After Verification

1. **Test Driver Application Flow:**
   - Submit new driver application
   - Admin approves it
   - Driver should automatically get profile created
   - Driver should be able to access dashboard

2. **Test Driver Acceptance:**
   - Driver goes online
   - Rider requests ride
   - Driver accepts ride
   - Ride should disappear from available rides list
   - Rider should see "Driver Assigned" immediately

3. **Test Real-time Updates:**
   - Rider requests ride
   - Driver accepts
   - Rider page should update within 1-2 seconds (via realtime or polling)

