-- Enable the trigger so it fires when users are created
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- Verify it's enabled
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  CASE tgenabled
    WHEN 'O' THEN 'Enabled (Origin)'
    WHEN 'D' THEN 'Disabled'
    WHEN 'R' THEN 'Replica'
    WHEN 'A' THEN 'Always'
    ELSE 'Unknown'
  END as status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';






