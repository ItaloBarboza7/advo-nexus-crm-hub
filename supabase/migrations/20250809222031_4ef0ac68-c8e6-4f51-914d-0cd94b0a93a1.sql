
-- Fase 1: Correções críticas de segurança do banco de dados

-- 1. Criar função para controlar RLS estrita (feature flag)
CREATE OR REPLACE FUNCTION public.is_strict_rls_enabled()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Por padrão FALSE para não quebrar funcionalidades existentes
  -- Pode ser alterado para TRUE quando estivermos prontos
  SELECT false;
$$;

-- 2. Hardening da função exec_sql contra injeção SQL
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
BEGIN
  RAISE LOG 'Executing SQL: %', sql;
  
  -- HARDENING: Bloquear múltiplas declarações SQL (previne injeção)
  IF position(';' in trim(trailing ';' from trim(sql))) > 0 THEN
    RAISE EXCEPTION 'SECURITY: Multiple SQL statements not allowed';
  END IF;
  
  -- HARDENING: Bloquear DDL perigoso
  sql_lower := lower(trim(sql));
  IF sql_lower ~ '\b(drop|create|alter|truncate|delete\s+from\s+auth\.|delete\s+from\s+storage\.)\b' THEN
    RAISE EXCEPTION 'SECURITY: DDL or dangerous operations not allowed';
  END IF;
  
  -- Obter o schema do tenant atual
  current_tenant_schema := public.get_tenant_schema();
  
  -- Trim whitespace and newlines
  trimmed_sql := trim(both E' \t\n\r' from sql);
  sql_lower := lower(trimmed_sql);
  
  -- 🔒 VALIDAÇÃO DE SEGURANÇA: Verificar se há referências a outros schemas tenant_
  -- Extrair todos os schemas tenant_ mencionados no SQL
  SELECT array_agg(DISTINCT match[1])
  INTO found_schemas
  FROM regexp_split_to_table(sql_lower, E'\\s+') AS word,
       regexp_matches(word, '(tenant_[a-f0-9_]+)', 'g') AS match;
  
  -- Se encontrou schemas e algum não é o atual, bloquear
  IF found_schemas IS NOT NULL THEN
    FOREACH schema_name IN ARRAY found_schemas
    LOOP
      IF schema_name != current_tenant_schema THEN
        RAISE EXCEPTION 'ACESSO NEGADO: Tentativa de acesso ao schema % detectada. Usuário só pode acessar schema %. Operação bloqueada por segurança.', 
                       schema_name, current_tenant_schema;
      END IF;
    END LOOP;
    
    RAISE LOG 'Validação de segurança passou: todas as referências são para o schema correto %', current_tenant_schema;
  END IF;
  
  -- Continuar com a execução normal se passou na validação
  IF upper(trimmed_sql) LIKE 'SELECT%' THEN
    FOR rec IN EXECUTE sql LOOP
      results := results || jsonb_build_array(to_jsonb(rec));
      row_count := row_count + 1;
    END LOOP;
    
    RAISE LOG 'Query returned % rows for tenant schema %', row_count, current_tenant_schema;
    RETURN results;
  ELSE
    -- Para outros statements (INSERT, UPDATE), apenas executar
    EXECUTE sql;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    RAISE LOG 'Statement affected % rows in tenant schema %', row_count, current_tenant_schema;
    RETURN jsonb_build_object('affected_rows', row_count);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro detalhado com informações de segurança
    RAISE LOG 'SQL Error for tenant schema %: % - SQL: %', current_tenant_schema, SQLERRM, sql;
    RAISE EXCEPTION 'Erro ao executar SQL para tenant %: %', current_tenant_schema, SQLERRM;
END;
$function$;

-- 3. Corrigir search_path em todas as funções SECURITY DEFINER existentes
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(
    (SELECT parent_user_id FROM public.user_profiles WHERE user_id = auth.uid()),
    auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_tenant_schema()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT 'tenant_' || replace(public.get_tenant_id()::text, '-', '_');
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.can_access_tenant_data(tenant_schema_name text, user_id_to_check uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_tenant_id uuid;
  check_user_id uuid;
BEGIN
  -- Get the current tenant ID
  current_tenant_id := public.get_tenant_id();
  
  -- Use provided user_id or current user
  check_user_id := COALESCE(user_id_to_check, auth.uid());
  
  -- Check if the tenant schema matches the current tenant
  -- and if the user_id matches the current user or tenant
  RETURN (
    tenant_schema_name = public.get_tenant_schema() AND
    (check_user_id = auth.uid() OR check_user_id = current_tenant_id)
  );
END;
$function$;

-- 4. Habilitar RLS nas tabelas core com políticas permissivas (não vão quebrar)
ALTER TABLE public.action_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loss_reasons ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas "flexíveis" que respeitam o feature flag
-- Estas políticas vão permitir acesso normal quando is_strict_rls_enabled() = false
-- E restringir quando = true

-- Para action_groups
DROP POLICY IF EXISTS "Flexible RLS policy for action_groups" ON public.action_groups;
CREATE POLICY "Flexible RLS policy for action_groups" ON public.action_groups
FOR ALL
USING (
  CASE 
    WHEN public.is_strict_rls_enabled() THEN user_id = public.get_tenant_id()
    ELSE true
  END
)
WITH CHECK (
  CASE 
    WHEN public.is_strict_rls_enabled() THEN user_id = public.get_tenant_id()
    ELSE true
  END
);

-- Para action_types
DROP POLICY IF EXISTS "Flexible RLS policy for action_types" ON public.action_types;
CREATE POLICY "Flexible RLS policy for action_types" ON public.action_types
FOR ALL
USING (
  CASE 
    WHEN public.is_strict_rls_enabled() THEN user_id = public.get_tenant_id()
    ELSE true
  END
)
WITH CHECK (
  CASE 
    WHEN public.is_strict_rls_enabled() THEN user_id = public.get_tenant_id()
    ELSE true
  END
);

-- Para kanban_columns
DROP POLICY IF EXISTS "Flexible RLS policy for kanban_columns" ON public.kanban_columns;
CREATE POLICY "Flexible RLS policy for kanban_columns" ON public.kanban_columns
FOR ALL
USING (
  CASE 
    WHEN public.is_strict_rls_enabled() THEN user_id = public.get_tenant_id()
    ELSE true
  END
)
WITH CHECK (
  CASE 
    WHEN public.is_strict_rls_enabled() THEN user_id = public.get_tenant_id()
    ELSE true
  END
);

-- Para lead_sources
DROP POLICY IF EXISTS "Flexible RLS policy for lead_sources" ON public.lead_sources;
CREATE POLICY "Flexible RLS policy for lead_sources" ON public.lead_sources
FOR ALL
USING (
  CASE 
    WHEN public.is_strict_rls_enabled() THEN user_id = public.get_tenant_id()
    ELSE true
  END
)
WITH CHECK (
  CASE 
    WHEN public.is_strict_rls_enabled() THEN user_id = public.get_tenant_id()
    ELSE true
  END
);

-- Para lead_status_history (sem user_id, então sempre permissivo)
DROP POLICY IF EXISTS "Flexible RLS policy for lead_status_history" ON public.lead_status_history;
CREATE POLICY "Flexible RLS policy for lead_status_history" ON public.lead_status_history
FOR ALL
USING (true)
WITH CHECK (true);

-- Para leads
DROP POLICY IF EXISTS "Flexible RLS policy for leads" ON public.leads;
CREATE POLICY "Flexible RLS policy for leads" ON public.leads
FOR ALL
USING (
  CASE 
    WHEN public.is_strict_rls_enabled() THEN user_id = public.get_tenant_id()
    ELSE true
  END
)
WITH CHECK (
  CASE 
    WHEN public.is_strict_rls_enabled() THEN user_id = public.get_tenant_id()
    ELSE true
  END
);

-- Para loss_reasons
DROP POLICY IF EXISTS "Flexible RLS policy for loss_reasons" ON public.loss_reasons;
CREATE POLICY "Flexible RLS policy for loss_reasons" ON public.loss_reasons
FOR ALL
USING (
  CASE 
    WHEN public.is_strict_rls_enabled() THEN (user_id = public.get_tenant_id() OR user_id IS NULL)
    ELSE true
  END
)
WITH CHECK (
  CASE 
    WHEN public.is_strict_rls_enabled() THEN (user_id = public.get_tenant_id() OR user_id IS NULL)
    ELSE true
  END
);

-- 6. Adicionar logging de segurança
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, details jsonb DEFAULT '{}')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE LOG 'SECURITY EVENT [%]: User %, Tenant %, Details: %', 
    event_type, 
    auth.uid(), 
    public.get_tenant_id(), 
    details;
END;
$$;

-- Log que as correções foram aplicadas
SELECT public.log_security_event('SECURITY_HARDENING_APPLIED', '{"phase": 1, "strict_rls": false}'::jsonb);
