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
