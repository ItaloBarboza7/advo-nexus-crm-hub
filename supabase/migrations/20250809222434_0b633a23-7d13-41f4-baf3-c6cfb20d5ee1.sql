
-- Fase 2: Hardening adicional e monitoramento avançado

-- 1. Melhorar a função exec_sql com validações mais rigorosas
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  result jsonb;
  rec record;
  results jsonb := '[]'::jsonb;
  row_count integer := 0;
  trimmed_sql text;
  current_tenant_schema text;
  sql_lower text;
  tenant_pattern text := 'tenant_[a-f0-9_]+';
  found_schemas text[];
  schema_name text;
  forbidden_patterns text[] := ARRAY[
    'information_schema',
    'pg_catalog',
    'pg_',
    'auth\.',
    'storage\.',
    'realtime\.',
    'supabase_functions\.',
    'vault\.'
  ];
  pattern text;
BEGIN
  -- Log início da execução com detalhes de segurança
  RAISE LOG 'SECURITY: exec_sql called by user % for tenant % - SQL: %', 
    auth.uid(), public.get_tenant_id(), sql;
  
  -- HARDENING: Verificar se SQL não é nulo ou vazio
  IF sql IS NULL OR trim(sql) = '' THEN
    RAISE EXCEPTION 'SECURITY: Empty or null SQL not allowed';
  END IF;
  
  -- HARDENING: Limite de tamanho do SQL (previne ataques de DoS)
  IF length(sql) > 10000 THEN
    RAISE EXCEPTION 'SECURITY: SQL query too long (max 10000 chars)';
  END IF;
  
  -- HARDENING: Bloquear múltiplas declarações SQL (previne injeção)
  IF position(';' in trim(trailing ';' from trim(sql))) > 0 THEN
    PERFORM public.log_security_event('BLOCKED_MULTIPLE_STATEMENTS', 
      jsonb_build_object('sql', left(sql, 200)));
    RAISE EXCEPTION 'SECURITY: Multiple SQL statements not allowed';
  END IF;
  
  -- HARDENING: Bloquear padrões perigosos
  sql_lower := lower(trim(sql));
  
  -- Verificar DDL perigoso
  IF sql_lower ~ '\b(drop|create|alter|truncate)\b' THEN
    PERFORM public.log_security_event('BLOCKED_DDL_ATTEMPT', 
      jsonb_build_object('sql', left(sql, 200), 'type', 'DDL'));
    RAISE EXCEPTION 'SECURITY: DDL operations not allowed';
  END IF;
  
  -- Verificar acesso a schemas protegidos
  FOREACH pattern IN ARRAY forbidden_patterns
  LOOP
    IF sql_lower ~ pattern THEN
      PERFORM public.log_security_event('BLOCKED_SCHEMA_ACCESS', 
        jsonb_build_object('sql', left(sql, 200), 'blocked_pattern', pattern));
      RAISE EXCEPTION 'SECURITY: Access to protected schema/table pattern "%" not allowed', pattern;
    END IF;
  END LOOP;
  
  -- Obter o schema do tenant atual
  current_tenant_schema := public.get_tenant_schema();
  
  -- Trim whitespace and newlines
  trimmed_sql := trim(both E' \t\n\r' from sql);
  sql_lower := lower(trimmed_sql);
  
  -- 🔒 VALIDAÇÃO CRÍTICA: Verificar cross-tenant access
  SELECT array_agg(DISTINCT match[1])
  INTO found_schemas
  FROM regexp_split_to_table(sql_lower, E'\\s+') AS word,
       regexp_matches(word, '(tenant_[a-f0-9_]+)', 'g') AS match;
  
  -- Se encontrou schemas e algum não é o atual, bloquear
  IF found_schemas IS NOT NULL THEN
    FOREACH schema_name IN ARRAY found_schemas
    LOOP
      IF schema_name != current_tenant_schema THEN
        PERFORM public.log_security_event('BLOCKED_CROSS_TENANT_ACCESS', 
          jsonb_build_object(
            'attempted_schema', schema_name,
            'current_schema', current_tenant_schema,
            'sql', left(sql, 200)
          ));
        RAISE EXCEPTION 'SECURITY: Cross-tenant access denied. Attempted: %, Allowed: %', 
                       schema_name, current_tenant_schema;
      END IF;
    END LOOP;
    
    RAISE LOG 'SECURITY: Cross-tenant validation passed for schema %', current_tenant_schema;
  END IF;
  
  -- Executar query com monitoramento
  IF upper(trimmed_sql) LIKE 'SELECT%' THEN
    FOR rec IN EXECUTE sql LOOP
      results := results || jsonb_build_array(to_jsonb(rec));
      row_count := row_count + 1;
    END LOOP;
    
    PERFORM public.log_security_event('QUERY_EXECUTED', 
      jsonb_build_object(
        'type', 'SELECT',
        'rows_returned', row_count,
        'schema', current_tenant_schema
      ));
    
    RAISE LOG 'Query returned % rows for tenant schema %', row_count, current_tenant_schema;
    RETURN results;
  ELSE
    -- Para outros statements (INSERT, UPDATE, DELETE)
    EXECUTE sql;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    
    PERFORM public.log_security_event('MUTATION_EXECUTED', 
      jsonb_build_object(
        'type', CASE 
          WHEN upper(trimmed_sql) LIKE 'INSERT%' THEN 'INSERT'
          WHEN upper(trimmed_sql) LIKE 'UPDATE%' THEN 'UPDATE'
          WHEN upper(trimmed_sql) LIKE 'DELETE%' THEN 'DELETE'
          ELSE 'OTHER'
        END,
        'rows_affected', row_count,
        'schema', current_tenant_schema
      ));
    
    RAISE LOG 'Statement affected % rows in tenant schema %', row_count, current_tenant_schema;
    RETURN jsonb_build_object('affected_rows', row_count);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Log detalhado do erro com contexto de segurança
    PERFORM public.log_security_event('SQL_ERROR', 
      jsonb_build_object(
        'error', SQLERRM,
        'sqlstate', SQLSTATE,
        'sql', left(sql, 200),
        'schema', current_tenant_schema
      ));
    RAISE LOG 'SQL Error for tenant schema %: % - SQL: %', current_tenant_schema, SQLERRM, sql;
    RAISE EXCEPTION 'Database error for tenant %: %', current_tenant_schema, SQLERRM;
END;
$function$;

-- 2. Criar função para validar integridade de dados entre schemas
CREATE OR REPLACE FUNCTION public.validate_tenant_data_integrity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_tenant_id uuid;
  current_tenant_schema text;
  validation_results jsonb := '{}';
  lead_count integer;
  schema_exists boolean;
BEGIN
  current_tenant_id := public.get_tenant_id();
  current_tenant_schema := public.get_tenant_schema();
  
  -- Verificar se o schema do tenant existe
  SELECT EXISTS(
    SELECT 1 FROM information_schema.schemata 
    WHERE schema_name = current_tenant_schema
  ) INTO schema_exists;
  
  validation_results := jsonb_build_object(
    'tenant_id', current_tenant_id,
    'tenant_schema', current_tenant_schema,
    'schema_exists', schema_exists,
    'timestamp', now()
  );
  
  -- Se schema existe, validar dados
  IF schema_exists THEN
    EXECUTE format('SELECT COUNT(*) FROM %I.leads', current_tenant_schema) INTO lead_count;
    validation_results := validation_results || jsonb_build_object(
      'tenant_leads_count', lead_count
    );
  END IF;
  
  -- Contar leads na tabela global para este tenant
  SELECT COUNT(*) INTO lead_count 
  FROM public.leads 
  WHERE user_id = current_tenant_id;
  
  validation_results := validation_results || jsonb_build_object(
    'global_leads_count', lead_count
  );
  
  RETURN validation_results;
END;
$function$;

-- 3. Criar função para monitorar sessões de usuários
CREATE OR REPLACE FUNCTION public.get_user_session_info()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  session_info jsonb;
  tenant_id uuid;
  user_profile record;
BEGIN
  tenant_id := public.get_tenant_id();
  
  -- Buscar informações do perfil do usuário
  SELECT * INTO user_profile 
  FROM public.user_profiles 
  WHERE user_id = auth.uid();
  
  session_info := jsonb_build_object(
    'user_id', auth.uid(),
    'tenant_id', tenant_id,
    'tenant_schema', public.get_tenant_schema(),
    'is_member', (user_profile.parent_user_id IS NOT NULL),
    'session_timestamp', now()
  );
  
  -- Log da sessão para auditoria
  PERFORM public.log_security_event('SESSION_INFO_REQUESTED', session_info);
  
  RETURN session_info;
END;
$function$;

-- 4. Melhorar função ensure_tenant_schema com mais validações
CREATE OR REPLACE FUNCTION public.ensure_tenant_schema()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  tenant_schema_name text;
  tenant_id_val uuid;
  lock_key bigint;
  schema_exists boolean;
BEGIN
  -- Get tenant ID and schema name
  tenant_id_val := public.get_tenant_id();
  tenant_schema_name := public.get_tenant_schema();
  
  -- Validar se tenant_id é válido
  IF tenant_id_val IS NULL THEN
    RAISE EXCEPTION 'SECURITY: Invalid tenant ID';
  END IF;
  
  -- Log da operação
  PERFORM public.log_security_event('ENSURE_TENANT_SCHEMA_CALLED', 
    jsonb_build_object('tenant_schema', tenant_schema_name));
  
  -- Create a lock key based on tenant ID (convert UUID to bigint for advisory lock)
  lock_key := ('x' || substr(replace(tenant_id_val::text, '-', ''), 1, 15))::bit(60)::bigint;
  
  -- Acquire advisory lock to prevent concurrent schema creation for same tenant
  PERFORM pg_advisory_xact_lock(lock_key);
  
  -- Check if schema already exists (double-check after acquiring lock)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schemata.schema_name = tenant_schema_name
  ) INTO schema_exists;
  
  IF schema_exists THEN
    -- Schema exists, just ensure completed_followups table
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = tenant_schema_name 
      AND table_name = 'completed_followups'
    ) THEN
      EXECUTE format('
        CREATE TABLE %I.completed_followups (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lead_id UUID NOT NULL,
          user_id UUID NOT NULL,
          lead_status_at_completion TEXT NOT NULL,
          completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          UNIQUE(lead_id, user_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_completed_followups_lead_user 
        ON %I.completed_followups(lead_id, user_id);
        
        CREATE INDEX IF NOT EXISTS idx_completed_followups_completed_at 
        ON %I.completed_followups(completed_at);
      ', tenant_schema_name, tenant_schema_name, tenant_schema_name);
      
      PERFORM public.log_security_event('COMPLETED_FOLLOWUPS_TABLE_CREATED', 
        jsonb_build_object('schema', tenant_schema_name));
    END IF;
    
    RETURN tenant_schema_name;
  END IF;
  
  -- Log criação de novo schema
  PERFORM public.log_security_event('NEW_TENANT_SCHEMA_CREATION', 
    jsonb_build_object('schema', tenant_schema_name));
  
  -- Create the schema if it doesn't exist
  EXECUTE format('CREATE SCHEMA %I', tenant_schema_name);
  
  -- Create leads table with user_id field included
  EXECUTE format('
    CREATE TABLE %I.leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      description TEXT,
      source TEXT,
      state TEXT,
      status TEXT NOT NULL DEFAULT ''Novo'',
      action_group TEXT,
      action_type TEXT,
      loss_reason TEXT,
      value NUMERIC,
      user_id UUID,
      closed_by_user_id UUID,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
  ', tenant_schema_name);
  
  -- Create other tables (keeping existing structure)
  EXECUTE format('
    CREATE TABLE %I.kanban_columns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      order_position INTEGER NOT NULL,
      is_default BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
  ', tenant_schema_name);
  
  EXECUTE format('
    CREATE TABLE %I.action_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
  ', tenant_schema_name);
  
  EXECUTE format('
    CREATE TABLE %I.action_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      action_group_id UUID,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
  ', tenant_schema_name);
  
  EXECUTE format('
    CREATE TABLE %I.lead_sources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
  ', tenant_schema_name);
  
  EXECUTE format('
    CREATE TABLE %I.loss_reasons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reason TEXT NOT NULL,
      is_fixed BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
  ', tenant_schema_name);
  
  EXECUTE format('
    CREATE TABLE %I.lead_status_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID NOT NULL,
      old_status TEXT,
      new_status TEXT NOT NULL,
      changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
  ', tenant_schema_name);
  
  EXECUTE format('
    CREATE TABLE %I.company_info (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_name TEXT NOT NULL,
      cnpj TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
  ', tenant_schema_name);
  
  -- Create completed_followups table
  EXECUTE format('
    CREATE TABLE %I.completed_followups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID NOT NULL,
      user_id UUID NOT NULL,
      lead_status_at_completion TEXT NOT NULL,
      completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      UNIQUE(lead_id, user_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_completed_followups_lead_user 
    ON %I.completed_followups(lead_id, user_id);
    
    CREATE INDEX IF NOT EXISTS idx_completed_followups_completed_at 
    ON %I.completed_followups(completed_at);
  ', tenant_schema_name, tenant_schema_name, tenant_schema_name);
  
  -- Insert default data
  EXECUTE format('
    INSERT INTO %I.kanban_columns (name, color, order_position, is_default) VALUES
    (''Novo'', ''bg-blue-100 text-blue-800'', 1, true),
    (''Proposta'', ''bg-yellow-100 text-yellow-800'', 2, true),
    (''Reunião'', ''bg-purple-100 text-purple-800'', 3, true),
    (''Contrato Fechado'', ''bg-green-100 text-green-800'', 4, true),
    (''Perdido'', ''bg-red-100 text-red-800'', 5, true),
    (''Finalizado'', ''bg-gray-100 text-gray-800'', 6, true);
  ', tenant_schema_name);
  
  EXECUTE format('
    INSERT INTO %I.action_groups (name, description) VALUES
    (''Outros'', ''Grupo padrão para ações não categorizadas'');
  ', tenant_schema_name);
  
  EXECUTE format('
    INSERT INTO %I.loss_reasons (reason) VALUES
    (''Preço alto''),
    (''Sem interesse''),
    (''Concorrência''),
    (''Timing inadequado''),
    (''Sem orçamento''),
    (''Outros'');
  ', tenant_schema_name);
  
  EXECUTE format('
    INSERT INTO %I.lead_sources (name, label) VALUES
    (''website'', ''Website''),
    (''referral'', ''Indicação''),
    (''social_media'', ''Redes Sociais''),
    (''phone'', ''Telefone''),
    (''email'', ''Email''),
    (''event'', ''Evento''),
    (''others'', ''Outros'');
  ', tenant_schema_name);
  
  -- Create all triggers
  EXECUTE format('
    CREATE TRIGGER update_leads_updated_at
      BEFORE UPDATE ON %I.leads
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  ', tenant_schema_name);
  
  EXECUTE format('
    CREATE TRIGGER update_kanban_columns_updated_at
      BEFORE UPDATE ON %I.kanban_columns
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  ', tenant_schema_name);
  
  EXECUTE format('
    CREATE TRIGGER update_action_groups_updated_at
      BEFORE UPDATE ON %I.action_groups
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  ', tenant_schema_name);
  
  EXECUTE format('
    CREATE TRIGGER update_action_types_updated_at
      BEFORE UPDATE ON %I.action_types
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  ', tenant_schema_name);
  
  EXECUTE format('
    CREATE TRIGGER update_lead_sources_updated_at
      BEFORE UPDATE ON %I.lead_sources
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  ', tenant_schema_name);
  
  EXECUTE format('
    CREATE TRIGGER update_loss_reasons_updated_at
      BEFORE UPDATE ON %I.loss_reasons
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  ', tenant_schema_name);
  
  EXECUTE format('
    CREATE TRIGGER update_company_info_updated_at
      BEFORE UPDATE ON %I.company_info
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  ', tenant_schema_name);
  
  EXECUTE format('
    CREATE TRIGGER track_lead_status_changes_trigger
      AFTER UPDATE ON %I.leads
      FOR EACH ROW
      EXECUTE FUNCTION public.track_lead_status_changes_tenant();
  ', tenant_schema_name);
  
  EXECUTE format('
    CREATE TRIGGER move_leads_on_column_delete_trigger
      BEFORE DELETE ON %I.kanban_columns
      FOR EACH ROW
      EXECUTE FUNCTION public.move_leads_to_finalizado_on_tenant_column_delete();
  ', tenant_schema_name);
  
  -- Create tenant-specific functions and triggers
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.track_contract_closure_tenant()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $func$
    BEGIN
      IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = ''Contrato Fechado'' THEN
        NEW.closed_by_user_id := auth.uid();
      END IF;
      RETURN NEW;
    END;
    $func$;
  ', tenant_schema_name);
  
  -- Create tenant-specific function for updating leads on column rename
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.update_leads_on_column_rename_tenant()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $func$
    BEGIN
      -- Atualizar todos os leads que tinham o nome antigo da coluna para o novo nome
      UPDATE %I.leads 
      SET status = NEW.name, updated_at = now() 
      WHERE status = OLD.name;
      
      RAISE LOG ''Updated leads from status %% to %% in schema %I'', OLD.name, NEW.name;
      
      RETURN NEW;
    END;
    $func$;
  ', tenant_schema_name, tenant_schema_name, tenant_schema_name);
  
  -- Ensure triggers exist
  EXECUTE format('
    CREATE TRIGGER track_contract_closure_trigger
      BEFORE UPDATE ON %I.leads
      FOR EACH ROW
      EXECUTE FUNCTION %I.track_contract_closure_tenant();
  ', tenant_schema_name, tenant_schema_name);
  
  EXECUTE format('
    CREATE TRIGGER update_leads_on_column_rename_trigger
      AFTER UPDATE OF name ON %I.kanban_columns
      FOR EACH ROW
      WHEN (OLD.name IS DISTINCT FROM NEW.name)
      EXECUTE FUNCTION %I.update_leads_on_column_rename_tenant();
  ', tenant_schema_name, tenant_schema_name);
  
  -- Add RLS policies to the tenant schema
  PERFORM public.add_rls_policies_to_tenant(tenant_schema_name);
  
  -- Log sucesso da criação
  PERFORM public.log_security_event('TENANT_SCHEMA_CREATED_SUCCESS', 
    jsonb_build_object('schema', tenant_schema_name));
  
  RETURN tenant_schema_name;
END;
$function$;

-- 5. Log de finalização da Fase 2
SELECT public.log_security_event('SECURITY_HARDENING_PHASE_2_COMPLETE', 
  '{"improvements": ["enhanced_exec_sql", "data_validation", "session_monitoring", "audit_logging"]}'::jsonb);
