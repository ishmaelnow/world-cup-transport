-- View the CURRENT trigger function definition to see what's wrong
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'handle_driver_application_review';

