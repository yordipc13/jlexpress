CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.public_tracking_rate_limit_salt (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  secret bytea NOT NULL
);

INSERT INTO private.public_tracking_rate_limit_salt (singleton, secret)
VALUES (true, extensions.gen_random_bytes(32))
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS private.public_tracking_rate_limits (
  client_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  updated_at timestamptz NOT NULL
);

ALTER TABLE private.public_tracking_rate_limit_salt ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.public_tracking_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE private.public_tracking_rate_limit_salt
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.public_tracking_rate_limits
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.allow_public_tracking_request(p_client_ip text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_client_hash text;
  v_request_count integer;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_salt bytea;
BEGIN
  IF p_client_ip IS NULL OR pg_catalog.btrim(p_client_ip) = '' THEN
    RETURN false;
  END IF;

  SELECT secret
  INTO v_salt
  FROM private.public_tracking_rate_limit_salt
  WHERE singleton;

  IF v_salt IS NULL THEN
    RAISE EXCEPTION 'No se pudo validar la solicitud de rastreo.';
  END IF;

  v_client_hash := pg_catalog.encode(
    extensions.hmac(
      pg_catalog.convert_to(pg_catalog.btrim(p_client_ip), 'UTF8'),
      v_salt,
      'sha256'
    ),
    'hex'
  );

  INSERT INTO private.public_tracking_rate_limits AS limits (
    client_hash,
    window_started_at,
    request_count,
    updated_at
  )
  VALUES (v_client_hash, v_now, 1, v_now)
  ON CONFLICT (client_hash) DO UPDATE
  SET window_started_at = CASE
        WHEN limits.window_started_at <= v_now - interval '1 minute' THEN v_now
        ELSE limits.window_started_at
      END,
      request_count = CASE
        WHEN limits.window_started_at <= v_now - interval '1 minute' THEN 1
        ELSE limits.request_count + 1
      END,
      updated_at = v_now
  RETURNING request_count INTO v_request_count;

  IF v_request_count = 1 AND pg_catalog.random() < 0.01 THEN
    DELETE FROM private.public_tracking_rate_limits
    WHERE updated_at < v_now - interval '1 day';
  END IF;

  RETURN v_request_count <= 20;
END;
$$;

REVOKE ALL ON FUNCTION private.allow_public_tracking_request(text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consultar_envio(p_tracking_code text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_headers jsonb;
  v_client_ip text;
  v_result jsonb;
BEGIN
  v_headers := COALESCE(
    NULLIF(pg_catalog.current_setting('request.headers', true), '')::jsonb,
    '{}'::jsonb
  );
  v_client_ip := NULLIF(pg_catalog.btrim(v_headers ->> 'cf-connecting-ip'), '');

  IF v_client_ip IS NULL THEN
    RAISE SQLSTATE 'PT503'
      USING MESSAGE = 'El servicio de rastreo no está disponible temporalmente.';
  END IF;

  IF NOT private.allow_public_tracking_request(v_client_ip) THEN
    RAISE SQLSTATE 'PT429'
      USING MESSAGE = 'Demasiadas consultas de rastreo. Espera un minuto e inténtalo de nuevo.';
  END IF;

  SELECT pg_catalog.jsonb_build_object(
    'tracking_code', envio.tracking_code,
    'estado_envio', envio.estado_envio,
    'ultima_actualizacion', envio.ultima_actualizacion
  )
  INTO v_result
  FROM public.envios AS envio
  WHERE pg_catalog.upper(pg_catalog.btrim(envio.tracking_code)) =
    pg_catalog.upper(pg_catalog.btrim(p_tracking_code))
  LIMIT 1;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.consultar_envio(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consultar_envio(text) TO anon, authenticated;