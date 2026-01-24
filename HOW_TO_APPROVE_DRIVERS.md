# 👤 How to Access Admin Dashboard & Approve Drivers

## 🚪 Step 1: Access Admin Dashboard

### Option A: Direct URL
1. Open your browser
2. Go to: **http://localhost:5174/admin**
3. You'll be redirected to login if not authenticated

### Option B: Sign Up/Login as Admin
1. Go to: **http://localhost:5174**
2. Click **"Sign Up"** (if you don't have an admin account)
3. Enter your details
4. **Important:** Select **"Admin"** as your role
5. Click **"Sign Up"**
6. You'll be automatically redirected to `/admin`

---

## 🔐 Step 2: Login as Admin

If you already have an admin account:
1. Go to: **http://localhost:5174**
2. Enter your **email** and **password**
3. Click **"Sign In"**
4. You'll be redirected to `/admin` dashboard

---

## ✅ Step 3: Approve Drivers

Once in the Admin Dashboard, you have **two ways** to approve drivers:

### Method 1: Approve Driver Applications (New Drivers)

1. **Click the "Applications" tab** at the top
2. You'll see a list of driver applications with status:
   - **Pending** - Needs approval
   - **Approved** - Already approved
   - **Rejected** - Was rejected

3. **For pending applications:**
   - Click the **"Approve"** button next to the driver
   - Confirm the approval
   - Driver will be activated and can start accepting rides

### Method 2: Activate/Deactivate Existing Drivers

1. **Click the "Drivers" tab** at the top
2. You'll see all drivers with their status:
   - **Active** (green badge) - Can accept rides
   - **Inactive** (gray badge) - Cannot accept rides

3. **To activate a driver:**
   - Find the driver with "Inactive" status
   - Click the **"Activate"** button
   - Driver will become active

4. **To deactivate a driver:**
   - Find the driver with "Active" status
   - Click the **"Deactivate"** button
   - Driver will become inactive

---

## 📋 Admin Dashboard Tabs

The admin dashboard has these tabs:

1. **Overview** - Metrics and statistics
2. **Rides** - View and manage all rides
3. **Drivers** - View and activate/deactivate drivers
4. **Applications** - Approve/reject driver applications
5. **Verification** - Verify driver documents (if implemented)
6. **Payments** - View payment reports

---

## 🎯 Quick Steps Summary

**To approve a new driver:**
1. Go to **http://localhost:5174/admin**
2. Login as admin (or sign up with admin role)
3. Click **"Applications"** tab
4. Click **"Approve"** next to pending driver
5. Done! ✅

**To activate an existing driver:**
1. Go to **http://localhost:5174/admin**
2. Click **"Drivers"** tab
3. Find inactive driver
4. Click **"Activate"** button
5. Done! ✅

---

## 🔍 What You'll See

### Applications Tab:
- Driver name
- Application date
- Status (Pending/Approved/Rejected)
- **Approve** and **Reject** buttons

### Drivers Tab:
- Driver name
- Vehicle information
- Status (Active/Inactive)
- Total trips
- Rating
- **Activate/Deactivate** toggle button

---

## ⚠️ Important Notes

- **Admin role required:** You must sign up/login with "Admin" role
- **Protected route:** `/admin` is protected - only admins can access
- **Real-time updates:** Changes reflect immediately
- **Driver matching:** Only active drivers can be matched to rides

---

## 🆘 Troubleshooting

### "Access Denied" or Redirected to Login
- Make sure you're logged in
- Verify your account has "admin" role
- Check browser console for errors

### Can't See Applications Tab
- Make sure you're on the admin dashboard (`/admin`)
- Refresh the page
- Check if there are any pending applications

### Driver Still Can't Accept Rides After Approval
- Check driver is **active** (not just approved)
- Verify driver completed onboarding
- Check driver is **online** (toggled on in driver app)

---

**That's it! You can now approve and manage drivers from the admin dashboard.**


