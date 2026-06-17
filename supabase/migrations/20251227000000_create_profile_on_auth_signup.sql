-- Create public profiles automatically when Supabase Auth creates a user.
-- This keeps email-confirmation signup working because the client may not
-- have an authenticated session until after the confirmation link is used.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text;
  profile_role text;
  profile_name text;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'rider');
  profile_role := CASE
    WHEN requested_role IN ('rider', 'driver') THEN requested_role
    ELSE 'rider'
  END;
  profile_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name'
  );

  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, profile_role, profile_name)
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('role', profile_role)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
