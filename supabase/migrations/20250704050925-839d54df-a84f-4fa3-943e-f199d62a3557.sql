
-- Fix the exec_sql function to properly return SELECT query results
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  rec record;
  results jsonb := '[]'::jsonb;
  row_count integer := 0;
BEGIN
  RAISE LOG 'Executing SQL: %', sql;
  
  -- Para SELECT statements, precisamos capturar os resultados
  IF upper(trim(sql)) LIKE 'SELECT%' THEN
    FOR rec IN EXECUTE sql LOOP
      results := results || jsonb_build_array(to_jsonb(rec));
      row_count := row_count + 1;
    END LOOP;
    
    RAISE LOG 'Query returned % rows with data: %', row_count, results;
    
    -- Return the results array directly for SELECT queries
    RETURN results;
  ELSE
    -- Para outros statements (INSERT, UPDATE, DELETE), apenas executar
    EXECUTE sql;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    RAISE LOG 'Statement affected % rows', row_count;
    RETURN jsonb_build_object('affected_rows', row_count);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro detalhado
    RAISE LOG 'SQL Error: % - SQL: %', SQLERRM, sql;
    RAISE EXCEPTION 'Erro ao executar SQL: %', SQLERRM;
END;
$$;

-- Test the function with a simple query to verify it works
SELECT public.exec_sql('SELECT 1 as test_column, ''test_value'' as test_text');
