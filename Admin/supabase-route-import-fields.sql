ALTER TABLE public.envios
  ADD COLUMN IF NOT EXISTS id_paquete text,
  ADD COLUMN IF NOT EXISTS total_a_pagar text,
  ADD COLUMN IF NOT EXISTS perfil text,
  ADD COLUMN IF NOT EXISTS ruta_id text,
  ADD COLUMN IF NOT EXISTS ruta_nombre text,
  ADD COLUMN IF NOT EXISTS ruta_estado text,
  ADD COLUMN IF NOT EXISTS ruta_fecha_inicio text,
  ADD COLUMN IF NOT EXISTS ruta_fecha_fin text,
  ADD COLUMN IF NOT EXISTS ruta_fecha_actualizacion text;