ALTER TABLE public.envios
  ALTER COLUMN estado_envio SET DEFAULT 'en sucursal';

UPDATE public.envios
SET estado_envio = 'en sucursal'
WHERE estado_envio IS NULL;
