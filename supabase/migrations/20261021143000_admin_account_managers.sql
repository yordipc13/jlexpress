DO $$
BEGIN
  IF pg_catalog.to_regclass('public.admin_presence') IS NULL THEN
    RAISE EXCEPTION 'La administración de cuentas requiere public.admin_presence.';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.admin_account_managers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_account_managers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_account_managers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_account_managers TO service_role;

DO $$
DECLARE
  manager_count integer;
BEGIN
  SELECT pg_catalog.count(DISTINCT presence.user_id)
  INTO manager_count
  FROM public.admin_presence AS presence
  JOIN auth.users AS account ON account.id = presence.user_id
  WHERE account.raw_app_meta_data ->> 'role' = 'admin';

  IF manager_count <> 3 THEN
    RAISE EXCEPTION 'Se esperaban exactamente 3 cuentas admin actuales para autorizar. Se encontraron %. Revisa admin_presence antes de aplicar.', manager_count;
  END IF;

  INSERT INTO public.admin_account_managers (user_id)
  SELECT DISTINCT presence.user_id
  FROM public.admin_presence AS presence
  JOIN auth.users AS account ON account.id = presence.user_id
  WHERE account.raw_app_meta_data ->> 'role' = 'admin'
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;