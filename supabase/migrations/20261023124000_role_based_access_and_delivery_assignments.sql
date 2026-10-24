-- Apply after the base access, route-package, and status-audit migrations.
DO $$
BEGIN
  IF pg_catalog.to_regclass('public.envios') IS NULL
    OR pg_catalog.to_regclass('public.paquetes_ruta') IS NULL
    OR pg_catalog.to_regclass('public."Xcargo"') IS NULL
    OR pg_catalog.to_regclass('public.admin_presence') IS NULL
    OR pg_catalog.to_regclass('public.admin_status_audit') IS NULL THEN
    RAISE EXCEPTION 'La autorización por roles requiere envios, paquetes_ruta, Xcargo y admin_presence.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT account.raw_app_meta_data ->> 'role'
  FROM auth.users AS account
  WHERE account.id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;

CREATE TABLE IF NOT EXISTS public.delivery_assignments (
  source_table text NOT NULL CHECK (source_table IN ('envios', 'paquetes_ruta', 'Xcargo')),
  tracking_code text NOT NULL CHECK (tracking_code <> ''),
  courier_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  PRIMARY KEY (source_table, tracking_code)
);

CREATE INDEX IF NOT EXISTS delivery_assignments_courier_idx
  ON public.delivery_assignments (courier_user_id, source_table);

ALTER TABLE public.envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paquetes_ruta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Xcargo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.delivery_assignments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.delivery_assignments TO authenticated;

REVOKE ALL ON TABLE public.envios, public.paquetes_ruta, public."Xcargo" FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.envios, public.paquetes_ruta, public."Xcargo" TO authenticated;

DROP POLICY IF EXISTS delivery_assignments_role_guard ON public.delivery_assignments;
CREATE POLICY delivery_assignments_role_guard
  ON public.delivery_assignments
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    public.current_app_role() IN ('admin', 'editor')
    OR (
      public.current_app_role() = 'repartidor'
      AND courier_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (public.current_app_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS delivery_assignments_staff_read ON public.delivery_assignments;
CREATE POLICY delivery_assignments_staff_read
  ON public.delivery_assignments
  FOR SELECT
  TO authenticated
  USING (public.current_app_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS delivery_assignments_courier_read ON public.delivery_assignments;
CREATE POLICY delivery_assignments_courier_read
  ON public.delivery_assignments
  FOR SELECT
  TO authenticated
  USING (
    public.current_app_role() = 'repartidor'
    AND courier_user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS envios_admin_guard ON public.envios;
DROP POLICY IF EXISTS envios_admin_access ON public.envios;
DROP POLICY IF EXISTS envios_role_guard ON public.envios;
CREATE POLICY envios_role_guard
  ON public.envios
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    public.current_app_role() IN ('admin', 'editor')
    OR (
      public.current_app_role() = 'repartidor'
      AND EXISTS (
        SELECT 1
        FROM public.delivery_assignments AS assignment
        WHERE assignment.source_table IN ('envios', 'paquetes_ruta')
          AND pg_catalog.upper(pg_catalog.btrim(assignment.tracking_code)) =
            pg_catalog.upper(pg_catalog.btrim(envios.tracking_code))
          AND assignment.courier_user_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (public.current_app_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS envios_update_staff_guard ON public.envios;
CREATE POLICY envios_update_staff_guard
  ON public.envios
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (public.current_app_role() IN ('admin', 'editor'))
  WITH CHECK (public.current_app_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS envios_delete_staff_guard ON public.envios;
CREATE POLICY envios_delete_staff_guard
  ON public.envios
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (public.current_app_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS envios_staff_access ON public.envios;
CREATE POLICY envios_staff_access
  ON public.envios
  FOR ALL
  TO authenticated
  USING (public.current_app_role() IN ('admin', 'editor'))
  WITH CHECK (public.current_app_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS envios_courier_read ON public.envios;
CREATE POLICY envios_courier_read
  ON public.envios
  FOR SELECT
  TO authenticated
  USING (
    public.current_app_role() = 'repartidor'
    AND EXISTS (
      SELECT 1
      FROM public.delivery_assignments AS assignment
      WHERE assignment.source_table IN ('envios', 'paquetes_ruta')
        AND pg_catalog.upper(pg_catalog.btrim(assignment.tracking_code)) =
          pg_catalog.upper(pg_catalog.btrim(envios.tracking_code))
        AND assignment.courier_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS paquetes_ruta_admin_guard ON public.paquetes_ruta;
DROP POLICY IF EXISTS paquetes_ruta_admin_access ON public.paquetes_ruta;
DROP POLICY IF EXISTS paquetes_ruta_role_guard ON public.paquetes_ruta;
CREATE POLICY paquetes_ruta_role_guard
  ON public.paquetes_ruta
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    public.current_app_role() IN ('admin', 'editor')
    OR (
      public.current_app_role() = 'repartidor'
      AND EXISTS (
        SELECT 1
        FROM public.delivery_assignments AS assignment
        WHERE assignment.source_table IN ('envios', 'paquetes_ruta')
          AND pg_catalog.upper(pg_catalog.btrim(assignment.tracking_code)) =
            pg_catalog.upper(pg_catalog.btrim(paquetes_ruta.tracking_code))
          AND assignment.courier_user_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (public.current_app_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS paquetes_ruta_update_staff_guard ON public.paquetes_ruta;
CREATE POLICY paquetes_ruta_update_staff_guard
  ON public.paquetes_ruta
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (public.current_app_role() IN ('admin', 'editor'))
  WITH CHECK (public.current_app_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS paquetes_ruta_delete_staff_guard ON public.paquetes_ruta;
CREATE POLICY paquetes_ruta_delete_staff_guard
  ON public.paquetes_ruta
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (public.current_app_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS paquetes_ruta_staff_access ON public.paquetes_ruta;
CREATE POLICY paquetes_ruta_staff_access
  ON public.paquetes_ruta
  FOR ALL
  TO authenticated
  USING (public.current_app_role() IN ('admin', 'editor'))
  WITH CHECK (public.current_app_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS paquetes_ruta_courier_read ON public.paquetes_ruta;
CREATE POLICY paquetes_ruta_courier_read
  ON public.paquetes_ruta
  FOR SELECT
  TO authenticated
  USING (
    public.current_app_role() = 'repartidor'
    AND EXISTS (
      SELECT 1
      FROM public.delivery_assignments AS assignment
      WHERE assignment.source_table IN ('envios', 'paquetes_ruta')
        AND pg_catalog.upper(pg_catalog.btrim(assignment.tracking_code)) =
          pg_catalog.upper(pg_catalog.btrim(paquetes_ruta.tracking_code))
        AND assignment.courier_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS xcargo_admin_guard ON public."Xcargo";
DROP POLICY IF EXISTS xcargo_admin_access ON public."Xcargo";
DROP POLICY IF EXISTS paquetes_empresa_3_admin_guard ON public."Xcargo";
DROP POLICY IF EXISTS paquetes_empresa_3_admin_access ON public."Xcargo";
DROP POLICY IF EXISTS xcargo_role_guard ON public."Xcargo";
CREATE POLICY xcargo_role_guard
  ON public."Xcargo"
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    public.current_app_role() IN ('admin', 'editor')
    OR (
      public.current_app_role() = 'repartidor'
      AND EXISTS (
        SELECT 1
        FROM public.delivery_assignments AS assignment
        WHERE assignment.source_table = 'Xcargo'
          AND pg_catalog.upper(pg_catalog.btrim(assignment.tracking_code)) =
            pg_catalog.upper(pg_catalog.btrim("Xcargo".tracking_code))
          AND assignment.courier_user_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (public.current_app_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS xcargo_update_staff_guard ON public."Xcargo";
CREATE POLICY xcargo_update_staff_guard
  ON public."Xcargo"
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (public.current_app_role() IN ('admin', 'editor'))
  WITH CHECK (public.current_app_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS xcargo_delete_staff_guard ON public."Xcargo";
CREATE POLICY xcargo_delete_staff_guard
  ON public."Xcargo"
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (public.current_app_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS xcargo_staff_access ON public."Xcargo";
CREATE POLICY xcargo_staff_access
  ON public."Xcargo"
  FOR ALL
  TO authenticated
  USING (public.current_app_role() IN ('admin', 'editor'))
  WITH CHECK (public.current_app_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS xcargo_courier_read ON public."Xcargo";
CREATE POLICY xcargo_courier_read
  ON public."Xcargo"
  FOR SELECT
  TO authenticated
  USING (
    public.current_app_role() = 'repartidor'
    AND EXISTS (
      SELECT 1
      FROM public.delivery_assignments AS assignment
      WHERE assignment.source_table = 'Xcargo'
        AND pg_catalog.upper(pg_catalog.btrim(assignment.tracking_code)) =
          pg_catalog.upper(pg_catalog.btrim("Xcargo".tracking_code))
        AND assignment.courier_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS admin_presence_admin_guard ON public.admin_presence;
CREATE POLICY admin_presence_admin_guard
  ON public.admin_presence
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.current_app_role() IN ('admin', 'editor', 'repartidor'))
  WITH CHECK (public.current_app_role() IN ('admin', 'editor', 'repartidor'));

DROP POLICY IF EXISTS admin_presence_admin_read ON public.admin_presence;
CREATE POLICY admin_presence_admin_read
  ON public.admin_presence
  FOR SELECT
  TO authenticated
  USING (public.current_app_role() = 'admin');

DROP POLICY IF EXISTS admin_presence_own_read ON public.admin_presence;
CREATE POLICY admin_presence_own_read
  ON public.admin_presence
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS admin_status_audit_admin_guard ON public.admin_status_audit;
CREATE POLICY admin_status_audit_admin_guard
  ON public.admin_status_audit
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (public.current_app_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS admin_status_audit_admin_read ON public.admin_status_audit;
CREATE POLICY admin_status_audit_admin_read
  ON public.admin_status_audit
  FOR SELECT
  TO authenticated
  USING (public.current_app_role() IN ('admin', 'editor'));

CREATE OR REPLACE FUNCTION public.assign_delivery(
  p_source_table text,
  p_tracking_code text,
  p_courier_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_source_table text := p_source_table;
  v_tracking_code text := pg_catalog.upper(pg_catalog.btrim(p_tracking_code));
BEGIN
  IF COALESCE(public.current_app_role(), '') NOT IN ('admin', 'editor') THEN
    RAISE EXCEPTION 'Se requiere una cuenta administradora o editora para asignar envíos.';
  END IF;

  IF v_source_table IS NULL
    OR v_tracking_code IS NULL
    OR v_tracking_code = ''
    OR v_source_table NOT IN ('envios', 'paquetes_ruta', 'Xcargo') THEN
    RAISE EXCEPTION 'El envío seleccionado no es válido.';
  END IF;

  IF v_source_table = 'envios' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.envios AS shipment
      WHERE pg_catalog.upper(pg_catalog.btrim(shipment.tracking_code)) = v_tracking_code
    ) THEN
      RAISE EXCEPTION 'No se encontró el envío seleccionado.';
    END IF;
  ELSIF v_source_table = 'Xcargo' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public."Xcargo" AS shipment
      WHERE pg_catalog.upper(pg_catalog.btrim(shipment.tracking_code)) = v_tracking_code
    ) THEN
      RAISE EXCEPTION 'No se encontró el envío seleccionado.';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.paquetes_ruta AS route_package
      WHERE pg_catalog.upper(pg_catalog.btrim(route_package.tracking_code)) = v_tracking_code
    ) THEN
      RAISE EXCEPTION 'No se encontró el paquete de ruta seleccionado.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.envios AS shipment
      WHERE pg_catalog.upper(pg_catalog.btrim(shipment.tracking_code)) = v_tracking_code
    ) THEN
      v_source_table := 'envios';
    END IF;
  END IF;

  IF p_courier_user_id IS NULL THEN
    DELETE FROM public.delivery_assignments
    WHERE tracking_code = v_tracking_code
      AND (
        source_table = v_source_table
        OR (
          v_source_table = 'envios'
          AND source_table = 'paquetes_ruta'
        )
      );
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.users AS account
    JOIN public.admin_presence AS presence ON presence.user_id = account.id
    WHERE account.id = p_courier_user_id
      AND account.raw_app_meta_data ->> 'role' = 'repartidor'
  ) THEN
    RAISE EXCEPTION 'La cuenta seleccionada no está autorizada como repartidor.';
  END IF;

  INSERT INTO public.delivery_assignments (
    source_table,
    tracking_code,
    courier_user_id,
    assigned_by,
    assigned_at
  )
  VALUES (
    v_source_table,
    v_tracking_code,
    p_courier_user_id,
    (SELECT auth.uid()),
    pg_catalog.clock_timestamp()
  )
  ON CONFLICT (source_table, tracking_code) DO UPDATE
  SET courier_user_id = EXCLUDED.courier_user_id,
      assigned_by = EXCLUDED.assigned_by,
      assigned_at = EXCLUDED.assigned_at;

  IF v_source_table = 'envios' THEN
    DELETE FROM public.delivery_assignments
    WHERE source_table = 'paquetes_ruta'
      AND tracking_code = v_tracking_code;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_delivery(text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_delivery(text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.advance_assigned_delivery_status(
  p_source_table text,
  p_tracking_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tracking_code text := pg_catalog.upper(pg_catalog.btrim(p_tracking_code));
  v_current_status text;
  v_next_status text;
  v_updated_at timestamptz := pg_catalog.clock_timestamp();
  v_result jsonb;
BEGIN
  IF public.current_app_role() IS DISTINCT FROM 'repartidor' THEN
    RAISE EXCEPTION 'Solo un repartidor puede avanzar el estado desde esta pantalla.';
  END IF;

  IF p_source_table IS NULL
    OR p_source_table NOT IN ('envios', 'Xcargo')
    OR v_tracking_code IS NULL
    OR v_tracking_code = '' THEN
    RAISE EXCEPTION 'El envío seleccionado no es válido.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.delivery_assignments AS assignment
    WHERE (
        assignment.source_table = p_source_table
        OR (
          p_source_table = 'envios'
          AND assignment.source_table = 'paquetes_ruta'
        )
      )
      AND assignment.tracking_code = v_tracking_code
      AND assignment.courier_user_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Este envío no está asignado a tu cuenta.';
  END IF;

  IF p_source_table = 'envios' THEN
    SELECT shipment.estado_envio
    INTO v_current_status
    FROM public.envios AS shipment
    WHERE pg_catalog.upper(pg_catalog.btrim(shipment.tracking_code)) = v_tracking_code
    FOR UPDATE;
  ELSE
    SELECT shipment.estado_envio
    INTO v_current_status
    FROM public."Xcargo" AS shipment
    WHERE pg_catalog.upper(pg_catalog.btrim(shipment.tracking_code)) = v_tracking_code
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el envío asignado.';
  END IF;

  IF pg_catalog.lower(pg_catalog.btrim(v_current_status)) = 'en sucursal' THEN
    v_next_status := 'en camino';
  ELSIF pg_catalog.lower(pg_catalog.btrim(v_current_status)) = 'en camino' THEN
    v_next_status := 'recibido';
  ELSE
    RAISE EXCEPTION 'El estado actual no permite otro cambio desde la pantalla del repartidor.';
  END IF;

  IF p_source_table = 'envios' THEN
    UPDATE public.envios
    SET estado_envio = v_next_status,
        ultima_actualizacion = v_updated_at
    WHERE pg_catalog.upper(pg_catalog.btrim(tracking_code)) = v_tracking_code
    RETURNING pg_catalog.jsonb_build_object(
      'source_table', 'envios',
      'tracking_code', tracking_code,
      'estado_envio', estado_envio,
      'ultima_actualizacion', ultima_actualizacion
    )
    INTO v_result;
  ELSE
    UPDATE public."Xcargo"
    SET estado_envio = v_next_status,
        ultima_actualizacion = v_updated_at
    WHERE pg_catalog.upper(pg_catalog.btrim(tracking_code)) = v_tracking_code
    RETURNING pg_catalog.jsonb_build_object(
      'source_table', 'Xcargo',
      'tracking_code', tracking_code,
      'estado_envio', estado_envio,
      'ultima_actualizacion', ultima_actualizacion
    )
    INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.advance_assigned_delivery_status(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.advance_assigned_delivery_status(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.debug_borrar_envios()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count bigint;
BEGIN
  IF COALESCE(public.current_app_role(), '') NOT IN ('admin', 'editor') THEN
    RAISE EXCEPTION 'Se requiere una cuenta administradora o editora.';
  END IF;

  SELECT pg_catalog.count(*) INTO deleted_count
  FROM public.envios;

  TRUNCATE TABLE public.envios RESTART IDENTITY CASCADE;

  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.borrar_envio_y_sincronizar(p_id_excel bigint)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count bigint;
  max_id bigint;
  sequence_name text;
BEGIN
  IF COALESCE(public.current_app_role(), '') NOT IN ('admin', 'editor') THEN
    RAISE EXCEPTION 'Se requiere una cuenta administradora o editora.';
  END IF;

  SELECT pg_catalog.pg_get_serial_sequence('public.envios', 'id_excel')
  INTO sequence_name;
  IF sequence_name IS NULL THEN
    RAISE EXCEPTION 'public.envios.id_excel no tiene una secuencia asociada.';
  END IF;

  LOCK TABLE public.envios IN ACCESS EXCLUSIVE MODE;
  DELETE FROM public.envios WHERE id_excel = p_id_excel;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    SELECT pg_catalog.max(id_excel) INTO max_id FROM public.envios;
    PERFORM pg_catalog.setval(
      sequence_name::pg_catalog.regclass,
      COALESCE(max_id, 1),
      max_id IS NOT NULL
    );
  END IF;

  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.borrar_envios_activos_y_sincronizar(p_ids_excel bigint[])
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count bigint;
  max_id bigint;
  sequence_name text;
BEGIN
  IF COALESCE(public.current_app_role(), '') NOT IN ('admin', 'editor') THEN
    RAISE EXCEPTION 'Se requiere una cuenta administradora o editora.';
  END IF;

  SELECT pg_catalog.pg_get_serial_sequence('public.envios', 'id_excel')
  INTO sequence_name;
  IF sequence_name IS NULL THEN
    RAISE EXCEPTION 'public.envios.id_excel no tiene una secuencia asociada.';
  END IF;

  LOCK TABLE public.envios IN ACCESS EXCLUSIVE MODE;
  DELETE FROM public.envios
  WHERE id_excel = ANY(COALESCE(p_ids_excel, ARRAY[]::bigint[]));
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  SELECT pg_catalog.max(id_excel) INTO max_id FROM public.envios;
  PERFORM pg_catalog.setval(
    sequence_name::pg_catalog.regclass,
    COALESCE(max_id, 1),
    max_id IS NOT NULL
  );

  RETURN deleted_count;
END;
$$;
