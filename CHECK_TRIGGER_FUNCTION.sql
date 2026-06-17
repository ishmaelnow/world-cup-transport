-- Check the full trigger function definition
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Also check if the trigger is enabled
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgisinternal as is_internal
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';






