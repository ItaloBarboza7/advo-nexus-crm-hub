
-- ========================================================================
-- SOLUÇÃO DEFINITIVA: Remove todas as políticas públicas conflitantes
-- e mantém apenas as políticas multi-tenant corretas
-- ========================================================================

-- 1. LEADS - Remove todas as políticas conflitantes
DROP POLICY IF EXISTS "Allow select for all users" ON public.leads;
DROP POLICY IF EXISTS "Allow insert for all users" ON public.leads;
DROP POLICY IF EXISTS "Allow update for all users" ON public.leads;
DROP POLICY IF EXISTS "Allow delete for all users" ON public.leads;
DROP POLICY IF EXISTS "Tenants can manage their own leads" ON public.leads;
DROP POLICY IF EXISTS "Tenants manage their own leads" ON public.leads;

-- Cria a política multi-tenant única para leads
CREATE POLICY "Tenant isolation for leads" ON public.leads
FOR ALL
USING (user_id = public.get_tenant_id())
WITH CHECK (user_id = public.get_tenant_id());

-- 2. KANBAN_COLUMNS - Remove todas as políticas conflitantes
DROP POLICY IF EXISTS "Allow select for all users" ON public.kanban_columns;
DROP POLICY IF EXISTS "Allow insert for all users" ON public.kanban_columns;
DROP POLICY IF EXISTS "Allow update for all users" ON public.kanban_columns;
DROP POLICY IF EXISTS "Allow delete for all users" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenants can view own and default columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenants can insert their own columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenants can update their own non-default columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenants can delete their own non-default columns" ON public.kanban_columns;

-- Cria políticas multi-tenant para kanban_columns
CREATE POLICY "Tenant view columns" ON public.kanban_columns
FOR SELECT
USING (user_id = public.get_tenant_id() OR (user_id IS NULL AND is_default = true));

CREATE POLICY "Tenant insert columns" ON public.kanban_columns
FOR INSERT
WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenant update columns" ON public.kanban_columns
FOR UPDATE
USING (user_id = public.get_tenant_id() AND is_default = false)
WITH CHECK (user_id = public.get_tenant_id() AND is_default = false);

CREATE POLICY "Tenant delete columns" ON public.kanban_columns
FOR DELETE
USING (user_id = public.get_tenant_id() AND is_default = false);

-- 3. ACTION_GROUPS - Remove todas as políticas conflitantes
DROP POLICY IF EXISTS "Allow select for all users" ON public.action_groups;
DROP POLICY IF EXISTS "Allow insert for all users" ON public.action_groups;
DROP POLICY IF EXISTS "Allow update for all users" ON public.action_groups;
DROP POLICY IF EXISTS "Allow delete for all users" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can view own and default action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can insert their own action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can update their own action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can delete their own action groups" ON public.action_groups;

-- Cria políticas multi-tenant para action_groups
CREATE POLICY "Tenant view action groups" ON public.action_groups
FOR SELECT
USING (user_id = public.get_tenant_id() OR user_id IS NULL);

CREATE POLICY "Tenant insert action groups" ON public.action_groups
FOR INSERT
WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenant update action groups" ON public.action_groups
FOR UPDATE
USING (user_id = public.get_tenant_id())
WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenant delete action groups" ON public.action_groups
FOR DELETE
USING (user_id = public.get_tenant_id());

-- 4. ACTION_TYPES - Remove todas as políticas conflitantes
DROP POLICY IF EXISTS "Allow select for all users" ON public.action_types;
DROP POLICY IF EXISTS "Allow insert for all users" ON public.action_types;
DROP POLICY IF EXISTS "Allow update for all users" ON public.action_types;
DROP POLICY IF EXISTS "Allow delete for all users" ON public.action_types;
DROP POLICY IF EXISTS "Tenants can view own and default action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenants can insert their own action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenants can update their own action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenants can delete their own action types" ON public.action_types;

-- Cria políticas multi-tenant para action_types
CREATE POLICY "Tenant view action types" ON public.action_types
FOR SELECT
USING (user_id = public.get_tenant_id() OR user_id IS NULL);

CREATE POLICY "Tenant insert action types" ON public.action_types
FOR INSERT
WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenant update action types" ON public.action_types
FOR UPDATE
USING (user_id = public.get_tenant_id())
WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenant delete action types" ON public.action_types
FOR DELETE
USING (user_id = public.get_tenant_id());

-- 5. LEAD_SOURCES - Remove todas as políticas conflitantes
DROP POLICY IF EXISTS "Allow select for all users" ON public.lead_sources;
DROP POLICY IF EXISTS "Allow insert for all users" ON public.lead_sources;
DROP POLICY IF EXISTS "Allow update for all users" ON public.lead_sources;
DROP POLICY IF EXISTS "Allow delete for all users" ON public.lead_sources;
DROP POLICY IF EXISTS "Tenants can view own and default lead sources" ON public.lead_sources;
DROP POLICY IF EXISTS "Tenants can insert their own lead_sources" ON public.lead_sources;
DROP POLICY IF EXISTS "Tenants can update their own lead_sources" ON public.lead_sources;
DROP POLICY IF EXISTS "Tenants can delete own lead_sources" ON public.lead_sources;

-- Cria políticas multi-tenant para lead_sources
CREATE POLICY "Tenant view lead sources" ON public.lead_sources
FOR SELECT
USING (user_id = public.get_tenant_id() OR user_id IS NULL);

CREATE POLICY "Tenant insert lead sources" ON public.lead_sources
FOR INSERT
WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenant update lead sources" ON public.lead_sources
FOR UPDATE
USING (user_id = public.get_tenant_id())
WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenant delete lead sources" ON public.lead_sources
FOR DELETE
USING (user_id = public.get_tenant_id());

-- 6. Garantir que RLS está habilitado
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loss_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;

-- 7. Verificação final - limpar leads órfãos
DELETE FROM public.leads WHERE user_id IS NULL;

-- 8. Verificar se todas as políticas foram aplicadas corretamente
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN policyname LIKE '%Allow%for all users%' THEN '❌ POLÍTICA PÚBLICA DETECTADA'
        ELSE '✅ Política OK'
    END as status
FROM pg_policies 
WHERE tablename IN ('leads', 'kanban_columns', 'action_groups', 'action_types', 'lead_sources')
ORDER BY tablename, policyname;
