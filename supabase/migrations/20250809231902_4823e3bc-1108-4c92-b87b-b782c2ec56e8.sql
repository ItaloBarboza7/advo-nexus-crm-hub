
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  result jsonb;
  rec record;
  results jsonb := '[]'::jsonb;
  row_count integer := 0;
  trimmed_sql text;
  sql_lower text;
  current_tenant_schema text;
  found_schemas text[];
  found_tables text[];
  t_name text;
  first_token text;
  allowed_tables text[] := ARRAY[
    'leads',
    'lead_status_history',
    'kanban_columns',
    'action_groups',
    'action_types',
    'lead_sources',
    'loss_reasons',
    'company_info',
    'completed_followups'
  ];
BEGIN
  -- Log início
  PERFORM public.log_security_event('EXEC_SQL_CALLED', jsonb_build_object('sql', left(sql, 200)));

  IF sql IS NULL OR trim(sql) = '' THEN
    RAISE EXCEPTION 'SECURITY: Empty or null SQL not allowed';
  END IF;

  trimmed_sql := trim(both E' \t\n\r' from sql);
  sql_lower := lower(trimmed_sql);

  -- Bloquear múltiplas instruções
  IF position(';' in trim(trailing ';' from trimmed_sql)) > 0 THEN
    PERFORM public.log_security_event('BLOCKED_MULTIPLE_STATEMENTS', jsonb_build_object('sql', left(sql, 200)));
    RAISE EXCEPTION 'SECURITY: Multiple SQL statements not allowed';
  END IF;

  -- Bloquear DDL e comandos perigosos
  IF sql_lower ~ '^\s*(alter|drop|create|grant|revoke|truncate|comment|vacuum|analyze)\b' THEN
    PERFORM public.log_security_event('BLOCKED_DDL', jsonb_build_object('sql', left(sql, 200)));
    RAISE EXCEPTION 'SECURITY: DDL or maintenance commands are not allowed';
  END IF;

  -- Validar schema do tenant
  current_tenant_schema := public.get_tenant_schema();

  -- Extrair schemas e tabelas referenciados no padrão "schema.table"
  found_schemas := ARRAY(
    SELECT DISTINCT m[1]
    FROM regexp_matches(sql_lower, '(tenant_[a-f0-9_]+)\.([a-z_][a-z0-9_]*)', 'g') AS m
  );

  found_tables := ARRAY(
    SELECT DISTINCT m[2]
    FROM regexp_matches(sql_lower, '(tenant_[a-f0-9_]+)\.([a-z_][a-z0-9_]*)', 'g') AS m
  );

  -- Se referiu a algum tenant schema, tem que ser o atual
  IF found_schemas IS NOT NULL AND array_length(found_schemas,1) > 0 THEN
    FOREACH t_name IN ARRAY found_schemas LOOP
      IF t_name <> current_tenant_schema THEN
        PERFORM public.log_security_event('BLOCKED_CROSS_TENANT_ACCESS',
          jsonb_build_object('attempted_schema', t_name, 'current_schema', current_tenant_schema, 'sql', left(sql, 200)));
        RAISE EXCEPTION 'SECURITY: Cross-tenant access denied. Attempted: %, Allowed: %', t_name, current_tenant_schema;
      END IF;
    END LOOP;

    -- Verificar tabelas permitidas
    FOREACH t_name IN ARRAY found_tables LOOP
      IF NOT (t_name = ANY(allowed_tables)) THEN
        PERFORM public.log_security_event('BLOCKED_TABLE_ACCESS',
          jsonb_build_object('table', t_name, 'sql', left(sql, 200)));
        RAISE EXCEPTION 'SECURITY: Access to table "%" is not allowed via exec_sql', t_name;
      END IF;
    END LOOP;
  END IF;

  -- Determinar tipo de comando
  first_token := regexp_replace(sql_lower, '^\s*([a-z]+).*$','\1');

  -- Fluxo SELECT (retorna linhas)
  IF first_token = 'select' THEN
    FOR rec IN EXECUTE trimmed_sql LOOP
      results := results || jsonb_build_array(to_jsonb(rec));
      row_count := row_count + 1;
    END LOOP;

    PERFORM public.log_security_event('QUERY_EXECUTED',
      jsonb_build_object('type', 'SELECT', 'rows_returned', row_count, 'schema', current_tenant_schema));

    RETURN results;
  END IF;

  -- Fluxo INSERT/UPDATE/DELETE controlado
  IF first_token IN ('insert','update','delete') THEN
    -- Exigir referência a schema do tenant e tabela permitida
    IF found_schemas IS NULL OR array_length(found_schemas,1) = 0 THEN
      PERFORM public.log_security_event('BLOCKED_NO_TENANT_SCHEMA',
        jsonb_build_object('sql', left(sql, 200)));
      RAISE EXCEPTION 'SECURITY: Statement must reference the current tenant schema explicitly';
    END IF;

    -- Exigir WHERE em UPDATE/DELETE para evitar operações massivas
    IF first_token IN ('update','delete') AND position(' where ' in sql_lower) = 0 THEN
      PERFORM public.log_security_event('BLOCKED_MISSING_WHERE',
        jsonb_build_object('sql', left(sql, 200)));
      RAISE EXCEPTION 'SECURITY: UPDATE/DELETE without WHERE clause is not allowed';
    END IF;

    -- Executar DML
    EXECUTE trimmed_sql;
    GET DIAGNOSTICS row_count = ROW_COUNT;

    PERFORM public.log_security_event('DML_EXECUTED',
      jsonb_build_object('type', upper(first_token), 'affected_rows', row_count, 'schema', current_tenant_schema));

    RETURN jsonb_build_object('affected_rows', row_count);
  END IF;

  -- Qualquer outro comando é bloqueado
  PERFORM public.log_security_event('BLOCKED_UNSUPPORTED_COMMAND',
    jsonb_build_object('sql', left(sql, 200)));
  RAISE EXCEPTION 'SECURITY: Only SELECT/INSERT/UPDATE/DELETE are allowed';

EXCEPTION WHEN OTHERS THEN
  PERFORM public.log_security_event('SQL_ERROR',
    jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE, 'sql', left(sql, 200)));
  RAISE;
END;
$function$;
