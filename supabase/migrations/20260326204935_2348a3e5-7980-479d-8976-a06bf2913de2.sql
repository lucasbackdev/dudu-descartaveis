CREATE OR REPLACE FUNCTION public.get_db_size_info()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  db_size bigint;
  limit_size bigint := 500 * 1024 * 1024; -- 500MB
BEGIN
  SELECT pg_database_size(current_database()) INTO db_size;
  
  result := jsonb_build_object(
    'used_bytes', db_size,
    'limit_bytes', limit_size,
    'used_mb', round((db_size::numeric / (1024 * 1024))::numeric, 2),
    'limit_mb', 500,
    'percentage', round((db_size::numeric / limit_size * 100)::numeric, 2),
    'is_estimate', false
  );
  
  RETURN result;
END;
$$;