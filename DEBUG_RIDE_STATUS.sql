-- Debug script to check ride status in production
-- Run this in Supabase SQL Editor to diagnose the issue

-- Check the specific ride from the screenshot
SELECT 
  id,
  rider_id,
  driver_id,
  status,
  created_at,
  accepted_at,
  requested_at
FROM rides
WHERE id = 'f8ceaa4d-06d3-4751-8a6d-8897f669a3c9';

-- Check if realtime is enabled for rides table
SELECT 
  schemaname,
  tablename,
  attname,
  atttypid::regtype
FROM pg_publication_tables
WHERE tablename = 'rides';

-- Check recent rides and their driver assignments
SELECT 
  id,
  status,
  driver_id,
  created_at,
  accepted_at,
  CASE 
    WHEN driver_id IS NOT NULL THEN 'HAS DRIVER'
    ELSE 'NO DRIVER'
  END as driver_status
FROM rides
WHERE status IN ('matching', 'requested', 'accepted')
ORDER BY created_at DESC
LIMIT 10;

-- Check if there are any available drivers
SELECT 
  id,
  user_id,
  is_available,
  is_active,
  last_location_updated_at
FROM driver_profiles
WHERE is_available = true
  AND is_active = true
ORDER BY last_location_updated_at DESC;

