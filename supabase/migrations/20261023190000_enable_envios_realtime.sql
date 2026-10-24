DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    RAISE EXCEPTION 'No existe la publicación supabase_realtime.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'envios'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.envios;
  END IF;
END;
$$;