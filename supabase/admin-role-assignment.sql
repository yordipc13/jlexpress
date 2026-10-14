-- Run this in the Supabase SQL Editor after applying the admin access migration.
-- Replace the placeholder UUID with the Auth user UUID(s), not email addresses.
DO $$
DECLARE
  admin_user_ids uuid[] := ARRAY[
    '00000000-0000-0000-0000-000000000000'::uuid
  ];
  admin_role text := 'admin';
  updated_users integer;
BEGIN
  IF admin_role IS NULL OR pg_catalog.btrim(admin_role) = '' THEN
    RAISE EXCEPTION 'Specify a non-empty app_metadata role.';
  END IF;

  IF '00000000-0000-0000-0000-000000000000'::uuid = ANY(admin_user_ids) THEN
    RAISE EXCEPTION 'Replace the placeholder with the Auth user UUID(s) before running this script.';
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb)
    || pg_catalog.jsonb_build_object('role', admin_role)
  WHERE id = ANY(admin_user_ids);

  GET DIAGNOSTICS updated_users = ROW_COUNT;
  IF updated_users <> pg_catalog.cardinality(admin_user_ids) THEN
    RAISE EXCEPTION 'Expected to update % Auth user(s), but updated %.',
      pg_catalog.cardinality(admin_user_ids), updated_users;
  END IF;

  INSERT INTO public.admin_presence (user_id, email)
  SELECT id, email
  FROM auth.users
  WHERE id = ANY(admin_user_ids)
    AND email IS NOT NULL
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email;
END;
$$;
