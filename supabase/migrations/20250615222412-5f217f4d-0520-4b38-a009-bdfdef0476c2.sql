
-- Limpar e recriar políticas de forma mais cuidadosa
-- Primeiro, remover todas as políticas que podem existir (usando CASCADE se necessário)

-- Para LEADS
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow select for all users" ON public.leads;
    DROP POLICY IF EXISTS "Allow insert for all users" ON public.leads;
    DROP POLICY IF EXISTS "Allow update for all users" ON public.leads;
    DROP POLICY IF EXISTS "Allow delete for all users" ON public.leads;
    DROP POLICY IF EXISTS "Tenants can manage their own leads" ON public.leads;
    DROP POLICY IF EXISTS "Tenants manage their own leads" ON public.leads;
EXCEPTION WHEN OTHERS THEN
    -- Ignorar erros se a política não existir
    NULL;
END $$;

-- Para KANBAN_COLUMNS
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow select for all users" ON public.kanban_columns;
    DROP POLICY IF EXISTS "Allow insert for all users" ON public.kanban_columns;
    DROP POLICY IF EXISTS "Allow update for all users" ON public.kanban_columns;
    DROP POLICY IF EXISTS "Allow delete for all users" ON public.kanban_columns;
    DROP POLICY IF EXISTS "Tenants can view own and default columns" ON public.kanban_columns;
    DROP POLICY IF EXISTS "Tenants can insert their own columns" ON public.kanban_columns;
    DROP POLICY IF EXISTS "Tenants can update their own non-default columns" ON public.kanban_columns;
    DROP POLICY IF EXISTS "Tenants can delete their own non-default columns" ON public.kanban_columns;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Para ACTION_GROUPS
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow select for all users" ON public.action_groups;
    DROP POLICY IF EXISTS "Allow insert for all users" ON public.action_groups;
    DROP POLICY IF EXISTS "Allow update for all users" ON public.action_groups;
    DROP POLICY IF EXISTS "Allow delete for all users" ON public.action_groups;
    DROP POLICY IF EXISTS "Tenants can view own and default action groups" ON public.action_groups;
    DROP POLICY IF EXISTS "Tenants can insert their own action groups" ON public.action_groups;
    DROP POLICY IF EXISTS "Tenants can update their own action groups" ON public.action_groups;
    DROP POLICY IF EXISTS "Tenants can delete their own action groups" ON public.action_groups;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Para ACTION_TYPES
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow select for all users" ON public.action_types;
    DROP POLICY IF EXISTS "Allow insert for all users" ON public.action_types;
    DROP POLICY IF EXISTS "Allow update for all users" ON public.action_types;
    DROP POLICY IF EXISTS "Allow delete for all users" ON public.action_types;
    DROP POLICY IF EXISTS "Tenants can view own and default action types" ON public.action_types;
    DROP POLICY IF EXISTS "Tenants can insert their own action types" ON public.action_types;
    DROP POLICY IF EXISTS "Tenants can update their own action types" ON public.action_types;
    DROP POLICY IF EXISTS "Tenants can delete their own action types" ON public.action_types;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Para LEAD_SOURCES
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow select for all users" ON public.lead_sources;
    DROP POLICY IF EXISTS "Allow insert for all users" ON public.lead_sources;
    DROP POLICY IF EXISTS "Allow update for all users" ON public.lead_sources;
    DROP POLICY IF EXISTS "Allow delete for all users" ON public.lead_sources;
    DROP POLICY IF EXISTS "Tenants can view own and default lead sources" ON public.lead_sources;
    DROP POLICY IF EXISTS "Tenants can insert their own lead_sources" ON public.lead_sources;
    DROP POLICY IF EXISTS "Tenants can update their own lead_sources" ON public.lead_sources;
    DROP POLICY IF EXISTS "Tenants can delete own lead_sources" ON public.lead_sources;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Recriar políticas corretas para isolamento multi-tenant

-- LEADS: Isolamento completo por tenant
CREATE POLICY "Tenants manage their own leads" ON public.leads
  FOR ALL
  USING (user_id = public.get_tenant_id())
  WITH CHECK (user_id = public.get_tenant_id());

-- KANBAN_COLUMNS: Tenants veem suas colunas + colunas padrão
CREATE POLICY "Tenants can view own and default columns" ON public.kanban_columns
  FOR SELECT
  USING (user_id = public.get_tenant_id() OR (user_id IS NULL AND is_default = true));

CREATE POLICY "Tenants can insert their own columns" ON public.kanban_columns
  FOR INSERT
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can update their own non-default columns" ON public.kanban_columns
  FOR UPDATE
  USING (user_id = public.get_tenant_id() AND is_default = false)
  WITH CHECK (user_id = public.get_tenant_id() AND is_default = false);

CREATE POLICY "Tenants can delete their own non-default columns" ON public.kanban_columns
  FOR DELETE
  USING (user_id = public.get_tenant_id() AND is_default = false);

-- ACTION_GROUPS: Tenants veem seus grupos + grupos padrão
CREATE POLICY "Tenants can view own and default action groups" ON public.action_groups
  FOR SELECT
  USING (user_id = public.get_tenant_id() OR user_id IS NULL);

CREATE POLICY "Tenants can insert their own action groups" ON public.action_groups
  FOR INSERT
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can update their own action groups" ON public.action_groups
  FOR UPDATE
  USING (user_id = public.get_tenant_id())
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can delete their own action groups" ON public.action_groups
  FOR DELETE
  USING (user_id = public.get_tenant_id());

-- ACTION_TYPES: Tenants veem seus tipos + tipos padrão
CREATE POLICY "Tenants can view own and default action types" ON public.action_types
  FOR SELECT
  USING (user_id = public.get_tenant_id() OR user_id IS NULL);

CREATE POLICY "Tenants can insert their own action types" ON public.action_types
  FOR INSERT
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can update their own action types" ON public.action_types
  FOR UPDATE
  USING (user_id = public.get_tenant_id())
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can delete their own action types" ON public.action_types
  FOR DELETE
  USING (user_id = public.get_tenant_id());

-- LEAD_SOURCES: Tenants veem suas fontes + fontes padrão
CREATE POLICY "Tenants can view own and default lead sources" ON public.lead_sources
  FOR SELECT
  USING (user_id = public.get_tenant_id() OR user_id IS NULL);

CREATE POLICY "Tenants can insert their own lead_sources" ON public.lead_sources
  FOR INSERT
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can update their own lead_sources" ON public.lead_sources
  FOR UPDATE
  USING (user_id = public.get_tenant_id())
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can delete own lead_sources" ON public.lead_sources
  FOR DELETE
  USING (user_id = public.get_tenant_id());

-- Garantir que o RLS está habilitado em todas as tabelas críticas
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

-- Garantir que todos os leads existentes tenham user_id preenchido
-- (Apenas para leads que ainda não têm user_id)
DO $$
BEGIN
    -- Primeiro, tentar preencher user_id vazio usando get_tenant_id para o usuário atual
    -- Isso só funcionará se houver um usuário autenticado durante a migração
    UPDATE public.leads 
    SET user_id = (SELECT auth.uid()) 
    WHERE user_id IS NULL 
    AND (SELECT auth.uid()) IS NOT NULL;
    
    -- Se ainda houver leads sem user_id, vamos deixar como está por enquanto
    -- O administrador pode corrigir manualmente depois
END $$;

-- Garantir que a coluna user_id seja obrigatória (NOT NULL) apenas se não houver mais leads sem user_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.leads WHERE user_id IS NULL) THEN
        ALTER TABLE public.leads ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;
