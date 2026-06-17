# 🚗 How Rides Get Assigned to Drivers

## Complete Flow Overview

```
Rider Requests Ride → Match Driver → Driver Accepts → Ride Starts → Ride Completes
```

---

## Step-by-Step Process

### 1. **Rider Requests a Ride** 📱

**Location:** Rider Dashboard (`/rider`)

**What Happens:**
1. Rider enters pickup and dropoff locations
2. System calculates fare estimate
3. Rider clicks **"Request Ride"**
4. System creates ride record with status: `requested` or `matching`

**Code:** `src/pages/rider/RiderDashboard.tsx` (line 153)

---

### 2. **Automatic Driver Matching** 🤖

**Location:** Supabase Edge Function (`match-driver`)

**What Happens:**
- **Automatically triggered** after ride is created
- Finds nearest available driver within **10 miles** of pickup location
- Uses **Haversine formula** to calculate distance
- Updates ride with `driver_id` and status: `accepted`

**Matching Criteria:**
- ✅ Driver must be `is_available = true`
- ✅ Driver must be `is_active = true`
- ✅ Driver must have location (`last_location_lat` and `last_location_lng`)
- ✅ Driver must be within **10 miles** of pickup location
- ✅ Selects **nearest driver** if multiple available

**Code:** `supabase/functions/match-driver/index.ts`

**Edge Function Call:**
```typescript
POST /functions/v1/match-driver
Body: { rideId: "..." }
```

---

### 3. **Driver Sees the Ride** 👀

**Location:** Driver Dashboard (`/driver`)

**What Happens:**
- Driver dashboard **automatically refreshes** (real-time)
- New ride appears in "Available Rides" section
- Shows pickup location, dropoff location, and fare estimate
- Driver can see ride details and map

**Real-Time Updates:**
- Uses Supabase **Realtime subscriptions**
- Automatically updates when ride status changes
- No page refresh needed

---

### 4. **Driver Accepts the Ride** ✅

**Location:** Driver Dashboard → Available Rides

**What Happens:**
1. Driver clicks **"Accept Ride"** button
2. System updates ride status to `accepted`
3. Rider is notified (real-time)
4. Driver navigates to pickup location

**Status Flow:**
```
requested/matching → accepted → arriving → in_progress → completed
```

---

### 5. **Driver Updates Location** 📍

**Location:** Driver Dashboard (Active Ride view)

**What Happens:**
- Driver's location is **automatically tracked** (if permission granted)
- Or driver can manually update location
- Rider sees driver's real-time location on map
- System calculates ETA based on distance

---

### 6. **Ride Completion** 🎉

**What Happens:**
1. Driver arrives at pickup → Status: `arriving`
2. Rider gets in → Driver clicks "Start Ride" → Status: `in_progress`
3. Driver arrives at destination → Driver clicks "Complete Ride" → Status: `completed`
4. Payment is processed automatically
5. Driver earnings are recorded

---

## Important Requirements

### For Drivers to Receive Rides:

1. **Driver Application Approved** ✅
   - Admin must approve driver application
   - Creates `driver_profiles` record

2. **Driver Must Be Online** 🟢
   - Toggle "Go Online" in driver dashboard
   - Sets `is_available = true` in database

3. **Driver Must Have Location** 📍
   - Location must be set (`last_location_lat`, `last_location_lng`)
   - Can be set manually or via GPS

4. **Driver Must Be Active** ✅
   - `is_active = true` in `driver_profiles` table
   - Admin can deactivate drivers

---

## Manual Assignment (Admin)

**Location:** Admin Dashboard → Rides Tab

**What Happens:**
- Admin can manually assign rides to specific drivers
- Useful if automatic matching fails
- Overrides automatic matching

**When to Use:**
- No drivers available automatically
- Specific driver requested
- Emergency situations

---

## Troubleshooting

### "No drivers available"
**Causes:**
- No drivers are online (`is_available = false`)
- No drivers within 10 miles
- Drivers don't have location set
- All drivers are on active rides

**Solutions:**
1. Check driver dashboard - are drivers online?
2. Check driver locations in admin dashboard
3. Manually assign ride via admin dashboard

### "Ride stuck in matching"
**Causes:**
- `match-driver` Edge Function not deployed
- Edge Function error
- No available drivers

**Solutions:**
1. Check Supabase Edge Functions - is `match-driver` deployed?
2. Check Edge Function logs in Supabase Dashboard
3. Verify drivers are online and have locations

---

## Technical Details

### Matching Algorithm

```typescript
1. Get all available drivers (is_available = true, is_active = true)
2. Filter drivers with location data
3. Calculate distance from pickup to each driver
4. Filter drivers within 10 miles
5. Sort by distance (nearest first)
6. Assign to nearest driver
7. Update ride status to 'accepted'
```

### Real-Time Updates

- Uses Supabase **Realtime** subscriptions
- Automatically updates UI when:
  - New ride created
  - Ride status changes
  - Driver location updates
  - Ride completed

### Database Tables Involved

- `rides` - Stores ride requests
- `driver_profiles` - Driver availability and location
- `notifications` - Real-time notifications
- `earnings` - Driver payments

---

## Quick Test Flow

1. **Create Test Driver:**
   - Sign up as driver
   - Get application approved by admin
   - Go online in driver dashboard

2. **Request Test Ride:**
   - Sign up as rider
   - Request a ride
   - Watch it get matched automatically

3. **Accept Ride:**
   - Driver sees ride in dashboard
   - Driver accepts
   - Ride status updates in real-time

---

## Summary

✅ **Automatic Matching:** Happens instantly when rider requests ride  
✅ **Real-Time Updates:** Both rider and driver see updates instantly  
✅ **Distance-Based:** Nearest driver within 10 miles gets assigned  
✅ **Manual Override:** Admin can manually assign if needed  

**The system is fully automated - no manual intervention needed!**


