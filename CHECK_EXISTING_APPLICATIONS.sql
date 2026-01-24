-- Check existing driver applications
SELECT 
  da.id,
  da.status,
  da.user_id,
  p.full_name,
  p.role,
  da.vehicle_make || ' ' || da.vehicle_model as vehicle,
  da.created_at,
  da.reviewed_at
FROM driver_applications da
JOIN profiles p ON p.id = da.user_id
ORDER BY da.created_at DESC;


