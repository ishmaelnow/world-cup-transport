# 🔄 Rollback Guide - Restore Stable Checkpoint

## Quick Rollback

### Step 1: Checkout the Stable Tag

```bash
cd C:\Users\koshi\apps-deve
git fetch origin --tags
git checkout v1.0-stable-checkpoint
```

### Step 2: Create a Branch (Optional but Recommended)

```bash
git checkout -b restore-stable v1.0-stable-checkpoint
```

### Step 3: Run Database Fixes

**In Supabase SQL Editor, run:**

1. `DEFINITIVE_FIX.sql` - Fixes trigger function and creates missing profiles
2. `FIX_DRIVER_ACCEPTANCE_RLS.sql` - Adds RLS policy for driver acceptance

### Step 4: Verify

Run verification queries from `DEFINITIVE_FIX.sql`:
- Check 1: Trigger function check (should show ✅ CORRECT)
- Check 2: All approved apps have profiles
- Check 3: No missing profiles (should be 0)
- Check 4: All approved drivers have role = 'driver' (should be 0)

### Step 5: Test

- Test driver dashboard access
- Test driver acceptance flow
- Test rider page updates

---

## If You Want to Merge Back to Main

After verifying the stable checkpoint works:

```bash
# Create a branch from stable checkpoint
git checkout -b stable-restore v1.0-stable-checkpoint

# Merge into main (if needed)
git checkout main
git merge stable-restore

# Push
git push origin main
```

---

## What This Checkpoint Includes

✅ All code fixes for column name mismatches  
✅ Driver acceptance debugging  
✅ Available rides filtering  
✅ Database fix SQL files  
✅ RLS policy fix  

⚠️ **Remember:** Database fixes must be run in Supabase!

---

**Tag:** `v1.0-stable-checkpoint`  
**Date:** January 24, 2026

