
-- 1) Ativar RLS estrita por feature flag
CREATE OR REPLACE FUNCTION public.is_strict_rls_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT true;
$$;

-- 2) Remover políticas permissivas "Tenant users can access ..." em tabelas públicas

-- leads
DROP POLICY IF EXISTS "Tenant users can access leads" ON public.leads;

-- kanban_columns
DROP POLICY IF EXISTS "Tenant users can access kanban_columns" ON public.kanban_columns;

-- action_groups
DROP POLICY IF EXISTS "Tenant users can access action_groups" ON public.action_groups;

-- action_types
DROP POLICY IF EXISTS "Tenant users can access action_types" ON public.action_types;

-- lead_sources
DROP POLICY IF EXISTS "Tenant users can access lead_sources" ON public.lead_sources;

-- company_info
DROP POLICY IF EXISTS "Tenant users can access company_info" ON public.company_info;

-- loss_reasons: remover políticas abertas redundantes
DROP POLICY IF EXISTS "Tenant users can access loss_reasons" ON public.loss_reasons;
DROP POLICY IF EXISTS "Anyone can insert loss reasons" ON public.loss_reasons;
DROP POLICY IF EXISTS "Anyone can view loss reasons" ON public.loss_reasons;

-- 3) user_profiles: remover exposição pública e criar política por tenant
DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.user_profiles;

CREATE POLICY "Tenant users can view tenant profiles"
ON public.user_profiles
FOR SELECT
USING (
  user_id = auth.uid()
  OR parent_user_id = public.get_tenant_id()
  OR user_id = public.get_tenant_id()
);

-- 4) lead_status_history: remover políticas abertas e garantir segurança por tenant
DROP POLICY IF EXISTS "Anyone can insert lead status history" ON public.lead_status_history;
DROP POLICY IF EXISTS "Anyone can update lead status history" ON public.lead_status_history;
DROP POLICY IF EXISTS "Anyone can view lead status history" ON public.lead_status_history;
DROP POLICY IF EXISTS "Flexible RLS policy for lead_status_history" ON public.lead_status_history;
DROP POLICY IF EXISTS "Tenant users can access lead_status_history" ON public.lead_status_history;

-- Seleção já coberta por política existente no dump:
-- "Tenants can view history for their own leads" (USING EXISTS JOIN leads)
-- Garantir INSERT seguro (apenas para leads do tenant):
CREATE POLICY "Tenants can insert history for their own leads"
ON public.lead_status_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_status_history.lead_id
      AND l.user_id = public.get_tenant_id()
  )
);

-- 5) Endurecer exec_sql: apenas SELECT e apenas tabelas permitidas no schema do tenant atual
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
  match record;
  t_name text;
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

  -- Somente SELECT
  IF left(sql_lower, 6) <> 'select' THEN
    PERFORM public.log_security_event('BLOCKED_NON_SELECT', jsonb_build_object('sql', left(sql, 200)));
    RAISE EXCEPTION 'SECURITY: Only SELECT statements are allowed';
  END IF;

  -- Bloquear schemas protegidos
  IF sql_lower ~ '\b(information_schema|pg_catalog|pg_|auth\.|storage\.|realtime\.|supabase_functions\.|vault\.)' THEN
    PERFORM public.log_security_event('BLOCKED_SCHEMA_ACCESS', jsonb_build_object('sql', left(sql, 200)));
    RAISE EXCEPTION 'SECURITY: Access to protected schemas not allowed';
  END IF;

  -- Validar schema do tenant
  current_tenant_schema := public.get_tenant_schema();

  -- Extrair schemas e tabelas referenciados padrões "schema.table"
  found_schemas := ARRAY(SELECT DISTINCT m[1]
                         FROM regexp_matches(sql_lower, '(tenant_[a-f0-9_]+)\.([a-z_][a-z0-9_]*)', 'g') AS m);
  found_tables := ARRAY(SELECT DISTINCT m[2]
                        FROM regexp_matches(sql_lower, '(tenant_[a-f0-9_]+)\.([a-z_][a-z0-9_]*)', 'g') AS m);

  -- Se referiu a algum tenant schema, tem que ser o atual e tabelas permitidas
  IF found_schemas IS NOT NULL AND array_length(found_schemas,1) > 0 THEN
    FOREACH t_name IN ARRAY found_schemas LOOP
      IF t_name <> current_tenant_schema THEN
        PERFORM public.log_security_event('BLOCKED_CROSS_TENANT_ACCESS',
          jsonb_build_object('attempted_schema', t_name, 'current_schema', current_tenant_schema, 'sql', left(sql, 200)));
        RAISE EXCEPTION 'SECURITY: Cross-tenant access denied. Attempted: %, Allowed: %', t_name, current_tenant_schema;
      END IF;
    END LOOP;

    -- Verificar tabelas
    FOREACH t_name IN ARRAY found_tables LOOP
      IF NOT (t_name = ANY(allowed_tables)) THEN
        PERFORM public.log_security_event('BLOCKED_TABLE_ACCESS',
          jsonb_build_object('table', t_name, 'sql', left(sql, 200)));
        RAISE EXCEPTION 'SECURITY: Access to table "%" is not allowed via exec_sql', t_name;
      END IF;
    END LOOP;
  END IF;

  -- Executar SELECT
  FOR rec IN EXECUTE sql LOOP
    results := results || jsonb_build_array(to_jsonb(rec));
    row_count := row_count + 1;
  END LOOP;

  PERFORM public.log_security_event('QUERY_EXECUTED',
    jsonb_build_object('type', 'SELECT', 'rows_returned', row_count, 'schema', current_tenant_schema));

  RETURN results;

EXCEPTION WHEN OTHERS THEN
  PERFORM public.log_security_event('SQL_ERROR',
    jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE, 'sql', left(sql, 200)));
  RAISE;
END;
$function$;
