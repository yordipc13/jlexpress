CREATE OR REPLACE FUNCTION public.debug_borrar_envios()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count bigint;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Se requiere una cuenta administradora.';
  END IF;

  SELECT count(*) INTO deleted_count
  FROM public.envios;

  TRUNCATE TABLE public.envios RESTART IDENTITY CASCADE;

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.debug_borrar_envios() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.debug_borrar_envios() TO authenticated;

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
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Se requiere una cuenta administradora.';
  END IF;

  SELECT pg_catalog.pg_get_serial_sequence('public.envios', 'id_excel')
  INTO sequence_name;
  IF sequence_name IS NULL THEN
    RAISE EXCEPTION 'public.envios.id_excel no tiene una secuencia asociada.';
  END IF;

  LOCK TABLE public.envios IN ACCESS EXCLUSIVE MODE;

  DELETE FROM public.envios
  WHERE id_excel = p_id_excel;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    SELECT pg_catalog.max(id_excel) INTO max_id
    FROM public.envios;

    PERFORM pg_catalog.setval(
      sequence_name::pg_catalog.regclass,
      COALESCE(max_id, 1),
      max_id IS NOT NULL
    );
  END IF;

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.borrar_envio_y_sincronizar(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.borrar_envio_y_sincronizar(bigint) TO authenticated;

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
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Se requiere una cuenta administradora.';
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

  SELECT pg_catalog.max(id_excel) INTO max_id
  FROM public.envios;

  PERFORM pg_catalog.setval(
    sequence_name::pg_catalog.regclass,
    COALESCE(max_id, 1),
    max_id IS NOT NULL
  );

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.borrar_envios_activos_y_sincronizar(bigint[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.borrar_envios_activos_y_sincronizar(bigint[]) TO authenticated;