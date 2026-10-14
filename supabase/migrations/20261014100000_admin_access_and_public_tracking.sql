DO $$
BEGIN
  IF pg_catalog.to_regclass('public.envios') IS NULL THEN
    RAISE EXCEPTION 'La migración requiere que exista public.envios. Añade primero su esquema inicial verificado.';
  END IF;

  IF (
    SELECT pg_catalog.count(*)
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'envios'
      AND column_name IN ('tracking_code', 'estado_envio', 'ultima_actualizacion')
  ) <> 3 THEN
    RAISE EXCEPTION 'public.envios debe incluir tracking_code, estado_envio y ultima_actualizacion.';
  END IF;
END;
$$;

ALTER TABLE public.envios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS envios_admin_guard ON public.envios;
CREATE POLICY envios_admin_guard
  ON public.envios
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS envios_admin_access ON public.envios;
CREATE POLICY envios_admin_access
  ON public.envios
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.envios TO authenticated;

CREATE TABLE IF NOT EXISTS public.admin_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  last_seen_at timestamptz
);

ALTER TABLE public.admin_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_presence_admin_guard ON public.admin_presence;
CREATE POLICY admin_presence_admin_guard
  ON public.admin_presence
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_presence_admin_read ON public.admin_presence;
CREATE POLICY admin_presence_admin_read
  ON public.admin_presence
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_presence_own_insert ON public.admin_presence;
CREATE POLICY admin_presence_own_insert
  ON public.admin_presence
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS admin_presence_own_update ON public.admin_presence;
CREATE POLICY admin_presence_own_update
  ON public.admin_presence
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON TABLE public.admin_presence TO authenticated;

INSERT INTO public.admin_presence (user_id, email)
SELECT id, email
FROM auth.users
WHERE raw_app_meta_data ->> 'role' = 'admin'
  AND email IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email;

CREATE OR REPLACE FUNCTION public.consultar_envio(p_tracking_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT pg_catalog.jsonb_build_object(
    'tracking_code', envio.tracking_code,
    'estado_envio', envio.estado_envio,
    'ultima_actualizacion', envio.ultima_actualizacion
  )
  FROM public.envios AS envio
  WHERE pg_catalog.upper(pg_catalog.btrim(envio.tracking_code)) =
    pg_catalog.upper(pg_catalog.btrim(p_tracking_code))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.consultar_envio(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consultar_envio(text) TO anon, authenticated;
