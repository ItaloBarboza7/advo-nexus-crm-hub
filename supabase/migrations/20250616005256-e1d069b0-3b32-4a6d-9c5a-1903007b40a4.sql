
-- Criar função exec_sql que está sendo usada pelos hooks mas não existe ainda
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  rec record;
  results jsonb := '[]'::jsonb;
BEGIN
  -- Para SELECT statements, precisamos capturar os resultados
  IF upper(trim(sql)) LIKE 'SELECT%' THEN
    FOR rec IN EXECUTE sql LOOP
      results := results || jsonb_build_array(to_jsonb(rec));
    END LOOP;
    RETURN results;
  ELSE
    -- Para outros statements (INSERT, UPDATE, DELETE), apenas executar
    EXECUTE sql;
    RETURN '[]'::jsonb;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro e re-raise
    RAISE EXCEPTION 'Erro ao executar SQL: %', SQLERRM;
END;
$$;

-- Garantir que RLS está desabilitado nas tabelas públicas antigas
-- para evitar conflitos durante a migração
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_info DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loss_reasons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_status_history DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas RLS das tabelas públicas
DROP POLICY IF EXISTS "Tenant isolation for leads" ON public.leads;
DROP POLICY IF EXISTS "Tenant view columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenant insert columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenant update columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenant delete columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenant view action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenant insert action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenant update action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenant delete action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenant view action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenant insert action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenant update action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenant delete action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenant view lead sources" ON public.lead_sources;
DROP POLICY IF EXISTS "Tenant insert lead sources" ON public.lead_sources;
DROP POLICY IF EXISTS "Tenant update lead sources" ON public.lead_sources;
DROP POLICY IF EXISTS "Tenant delete lead sources" ON public.lead_sources;

-- Comentário: A partir de agora, apenas esquemas separados serão usados para isolamento total
