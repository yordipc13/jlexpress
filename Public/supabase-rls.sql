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

--After creating the admin user, set its server-managed role claim once:

UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
WHERE email = 'yordiperaza.c@gmail.com';

UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
WHERE email = 'josuacastillo59@gmail.com';

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

-- Re-run the INSERT above after granting the admin role to another user so
-- that the allowed-user list includes the account before its first login.

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

CREATE TABLE IF NOT EXISTS public.suscripciones_notificaciones (
  tracking_code text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (tracking_code, email)
);

ALTER TABLE public.suscripciones_notificaciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.suscripciones_notificaciones FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tracking_code text NOT NULL,
  email text NOT NULL,
  estado_envio text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  sent_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error text
);

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.notification_outbox TO service_role;

CREATE OR REPLACE FUNCTION public.suscribirse_notificaciones(
  p_tracking_code text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_code text := pg_catalog.upper(pg_catalog.btrim(p_tracking_code));
  normalized_email text := pg_catalog.lower(pg_catalog.btrim(p_email));
BEGIN
  IF normalized_code = '' OR normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Ingresa un código de seguimiento y un correo válido.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.envios AS envio
    WHERE pg_catalog.upper(pg_catalog.btrim(envio.tracking_code)) = normalized_code
  ) THEN
    RAISE EXCEPTION 'No encontramos un paquete con ese código de seguimiento.';
  END IF;

  INSERT INTO public.suscripciones_notificaciones (tracking_code, email)
  VALUES (normalized_code, normalized_email)
  ON CONFLICT (tracking_code, email) DO NOTHING;

  RETURN pg_catalog.jsonb_build_object('subscribed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.suscribirse_notificaciones(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.suscribirse_notificaciones(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.queue_tracking_status_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notification_outbox (tracking_code, email, estado_envio)
  SELECT NEW.tracking_code, suscripcion.email, NEW.estado_envio
  FROM public.suscripciones_notificaciones AS suscripcion
  WHERE pg_catalog.upper(pg_catalog.btrim(suscripcion.tracking_code)) =
    pg_catalog.upper(pg_catalog.btrim(NEW.tracking_code));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS envios_queue_status_notification ON public.envios;
CREATE TRIGGER envios_queue_status_notification
  AFTER UPDATE OF estado_envio ON public.envios
  FOR EACH ROW
  WHEN (OLD.estado_envio IS DISTINCT FROM NEW.estado_envio)
  EXECUTE FUNCTION public.queue_tracking_status_notification();
