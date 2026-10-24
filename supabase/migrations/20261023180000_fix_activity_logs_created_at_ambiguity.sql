CREATE OR REPLACE FUNCTION public.get_admin_activity_logs(p_action text DEFAULT NULL)
RETURNS TABLE (
  id bigint,
  action text,
  message text,
  actor_email text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.current_app_role() NOT IN ('admin', 'editor') THEN
    RAISE EXCEPTION 'Se requiere una cuenta administradora o editora para consultar los logs.';
  END IF;
  IF p_action IS NOT NULL AND p_action NOT IN (
    'pedido_agregado',
    'pedido_editado',
    'pedido_borrado',
    'estado_cambiado',
    'pedido_finalizado',
    'repartidor_finalizo_pedido',
    'archivo_importado',
    'repartidor_asignado',
    'asignacion_retirada',
    'usuario_agregado',
    'rol_cambiado',
    'usuario_eliminado'
  ) THEN
    RAISE EXCEPTION 'El filtro de actividad no es válido.';
  END IF;

  DELETE FROM public.admin_activity_logs AS log_to_purge
  WHERE log_to_purge.created_at < pg_catalog.clock_timestamp() - interval '7 days';

  RETURN QUERY
  SELECT log.id, log.action, log.message, log.actor_email, log.created_at
  FROM public.admin_activity_logs AS log
  WHERE log.created_at >= pg_catalog.clock_timestamp() - interval '7 days'
    AND (p_action IS NULL OR log.action = p_action)
  ORDER BY log.created_at DESC
  LIMIT 1000;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_activity_logs(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_activity_logs(text) TO authenticated;
