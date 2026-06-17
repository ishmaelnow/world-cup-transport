-- Debug: Check what's happening with driver acceptance
-- Run this to see the actual state of rides and driver profiles

-- Check 1: See available rides and their status
SELECT 
  id,
  rider_id,
  driver_id,
  status,
  requested_at,
  created_at
FROM rides
WHERE status IN ('matching', 'requested')
ORDER BY requested_at DESC
LIMIT 10;

-- Check 2: See driver profiles and their IDs
SELECT 
  id as driver_profile_id,
  user_id,
  is_available,
  is_active
FROM driver_profiles
WHERE is_available = true
  AND is_active = true
LIMIT 10;

-- Check 3: Check if there's a mismatch between driver_profiles.id and what's being used
-- This will show if driver_id in rides matches driver_profiles.id
SELECT 
  r.id as ride_id,
  r.status,
  r.driver_id,
  dp.id as driver_profile_id,
  dp.user_id,
  CASE 
    WHEN r.driver_id IS NULL THEN 'No driver assigned'
    WHEN r.driver_id = dp.id THEN 'Match'
    ELSE 'Mismatch'
  END as match_status
FROM rides r
LEFT JOIN driver_profiles dp ON dp.id = r.driver_id
WHERE r.status IN ('matching', 'requested')
ORDER BY r.requested_at DESC
LIMIT 10;

