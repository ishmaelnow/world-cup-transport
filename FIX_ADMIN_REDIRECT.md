# 🔧 Fix Admin Redirecting to Rider

## The Problem

When you try to access `/admin`, it automatically redirects to `/rider` instead.

## Root Cause

This happens when:
1. **Your account doesn't have "admin" role** in the database
2. **Role check fails** - the app checks your role from the `profiles` table

---

## ✅ Solution: Check Your Role

### Step 1: Verify Your Role in Database

1. Go to **Supabase Dashboard**
2. Click **Table Editor**
3. Open **`profiles`** table
4. Find your user account (by email)
5. Check the **`role`** column
6. It should say **`admin`** (not `rider` or `driver`)

### Step 2: Fix Your Role

**If role is NOT "admin":**

**Option A: Update via Supabase Dashboard**
1. In `profiles` table, find your row
2. Click to edit
3. Change `role` to `admin`
4. Save

**Option B: Update via SQL**
1. Go to **SQL Editor** in Supabase
2. Run this (replace `YOUR_EMAIL` with your email):
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com'
);
```

---

## 🔄 Do You Need to Restart Server?

**No!** You don't need to restart the server for:
- ✅ Code changes (Vite auto-reloads)
- ✅ Database changes (takes effect immediately)
- ✅ Role changes (refresh browser)

**Only restart if:**
- ❌ Server crashed
- ❌ Port changed
- ❌ Environment variables changed

---

## 🧪 Test Admin Access

After fixing your role:

1. **Logout** from the app (if logged in)
2. **Refresh browser** (F5)
3. **Login again** with your admin account
4. Go to: **http://localhost:5174/admin**
5. Should work now! ✅

---

## 🔍 Debug Steps

### Check Your Current Role

Open browser console (F12) and run:
```javascript
// Check your current user role
const user = JSON.parse(localStorage.getItem('sb-zademtsktedahwgehttw-auth-token'));
console.log('User role:', user?.user?.user_metadata?.role);
```

Or check in React DevTools:
- Components → AuthProvider → user → role

---

## 📋 Common Issues

### Issue 1: Signed up as Rider/Driver
**Fix:** Update role in `profiles` table to `admin`

### Issue 2: Role not saved during signup
**Fix:** Manually update in database (see Step 2 above)

### Issue 3: Multiple accounts
**Fix:** Make sure you're logged in with the admin account

---

## 🎯 Quick Fix

**Fastest way:**
1. Supabase Dashboard → Table Editor → `profiles`
2. Find your user → Change `role` to `admin`
3. Refresh browser
4. Go to `/admin` ✅

---

**No server restart needed - just update your role in the database and refresh!**


