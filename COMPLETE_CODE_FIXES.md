# Complete Code Fixes - All Issues Found

## Critical Issues Found:

### 1. ✅ Driver Application Trigger - WRONG COLUMN NAMES
**File:** `supabase/migrations/20251218143251_add_driver_application_system.sql`
**Issue:** Lines 190-194 use wrong column names
- `license_plate` → should be `vehicle_plate`
- `drivers_license` → should be `license_number`
- `insurance_policy` → doesn't exist in driver_profiles
- `is_verified` → doesn't exist, should be `is_active`

**Fix:** Run `COMPLETE_SANITY_CHECK_FIX.sql`

### 2. ⚠️ Driver Name Reference - Field Doesn't Exist
**Files:** 
- `src/pages/rider/ActiveRide.tsx` (lines 439, 598)
- `src/pages/admin/AdminDashboard.tsx` (line 1132)

**Issue:** Code references `driver.driver_name` but `driver_profiles` table doesn't have this column.

**Current Code:**
```typescript
{driver.driver_name || (driver as any).user?.full_name || 'Driver'}
```

**Fix:** Should use:
```typescript
{(driver as any).user?.full_name || 'Driver'}
```

The query already joins with profiles: `select('*, user:profiles!driver_profiles_user_id_fkey(full_name)')`

### 3. ⚠️ Rating Field Name Mismatch
**File:** `src/pages/rider/ActiveRide.tsx` (line 281)

**Issue:** Code uses `average_rating` but schema has `rating_avg`

**Current Code:**
```typescript
.update({ average_rating: avgRating })
```

**Fix:** Should be:
```typescript
.update({ rating_avg: avgRating })
```

### 4. ⚠️ Driver Location Fields - Need Verification
**Files:**
- `src/pages/driver/ActiveDriverRide.tsx` (lines 57-59)
- `src/pages/rider/ActiveRide.tsx` (lines 469, 495-496, 517-518)

**Issue:** Code uses `driver_current_lat`, `driver_current_lng`, `last_location_update` on rides table, but need to verify these columns exist.

**Check Required:** Verify if rides table has these columns or if location should be stored in driver_profiles table instead.

### 5. ✅ Available Rides Filter - FIXED
**File:** `src/pages/driver/DriverDashboard.tsx`
**Status:** Already fixed - now filters out rides with `driver_id`

### 6. ✅ Driver Acceptance Race Condition - FIXED  
**File:** `src/pages/driver/DriverDashboard.tsx`
**Status:** Already fixed - uses `.in('status', ['matching', 'requested'])` instead of exact match

## Files That Need Code Fixes:

1. `src/pages/rider/ActiveRide.tsx` - Fix driver_name and average_rating
2. `src/pages/admin/AdminDashboard.tsx` - Fix driver_name reference
3. Verify driver location fields in rides table schema

