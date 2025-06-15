
-- ========================================================================
-- CORREÇÃO DEFINITIVA: Remove políticas públicas conflitantes e mantém apenas multi-tenant
-- ========================================================================

-- 1. LEADS - Remove políticas públicas conflitantes
DROP POLICY IF EXISTS "Allow select for all users" ON public.leads;
DROP POLICY IF EXISTS "Allow insert for all users" ON public.leads;
DROP POLICY IF EXISTS "Allow update for all users" ON public.leads;
DROP POLICY IF EXISTS "Allow delete for all users" ON public.leads;

-- Verifica se a política multi-tenant existe, se não, cria
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'leads' 
        AND policyname = 'Tenants manage their own leads'
    ) THEN
        CREATE POLICY "Tenants manage their own leads" ON public.leads
        FOR ALL
        USING (user_id = public.get_tenant_id())
        WITH CHECK (user_id = public.get_tenant_id());
    END IF;
END $$;

-- 2. KANBAN_COLUMNS - Remove políticas públicas conflitantes
DROP POLICY IF EXISTS "Allow select for all users" ON public.kanban_columns;
DROP POLICY IF EXISTS "Allow insert for all users" ON public.kanban_columns;
DROP POLICY IF EXISTS "Allow update for all users" ON public.kanban_columns;
DROP POLICY IF EXISTS "Allow delete for all users" ON public.kanban_columns;

-- Garante que as políticas multi-tenant existem
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'kanban_columns' 
        AND policyname = 'Tenants can view own and default columns'
    ) THEN
        CREATE POLICY "Tenants can view own and default columns" ON public.kanban_columns
        FOR SELECT
        USING (user_id = public.get_tenant_id() OR (user_id IS NULL AND is_default = true));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'kanban_columns' 
        AND policyname = 'Tenants can insert their own columns'
    ) THEN
        CREATE POLICY "Tenants can insert their own columns" ON public.kanban_columns
        FOR INSERT
        WITH CHECK (user_id = public.get_tenant_id());
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'kanban_columns' 
        AND policyname = 'Tenants can update their own non-default columns'
    ) THEN
        CREATE POLICY "Tenants can update their own non-default columns" ON public.kanban_columns
        FOR UPDATE
        USING (user_id = public.get_tenant_id() AND is_default = false)
        WITH CHECK (user_id = public.get_tenant_id() AND is_default = false);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'kanban_columns' 
        AND policyname = 'Tenants can delete their own non-default columns'
    ) THEN
        CREATE POLICY "Tenants can delete their own non-default columns" ON public.kanban_columns
        FOR DELETE
        USING (user_id = public.get_tenant_id() AND is_default = false);
    END IF;
END $$;

-- 3. ACTION_GROUPS - Remove políticas públicas conflitantes
DROP POLICY IF EXISTS "Allow select for all users" ON public.action_groups;
DROP POLICY IF EXISTS "Allow insert for all users" ON public.action_groups;
DROP POLICY IF EXISTS "Allow update for all users" ON public.action_groups;
DROP POLICY IF EXISTS "Allow delete for all users" ON public.action_groups;

-- Garante que as políticas multi-tenant existem
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'action_groups' 
        AND policyname = 'Tenants can view own and default action groups'
    ) THEN
        CREATE POLICY "Tenants can view own and default action groups" ON public.action_groups
        FOR SELECT
        USING (user_id = public.get_tenant_id() OR user_id IS NULL);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'action_groups' 
        AND policyname = 'Tenants can insert their own action groups'
    ) THEN
        CREATE POLICY "Tenants can insert their own action groups" ON public.action_groups
        FOR INSERT
        WITH CHECK (user_id = public.get_tenant_id());
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'action_groups' 
        AND policyname = 'Tenants can update their own action groups'
    ) THEN
        CREATE POLICY "Tenants can update their own action groups" ON public.action_groups
        FOR UPDATE
        USING (user_id = public.get_tenant_id())
        WITH CHECK (user_id = public.get_tenant_id());
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'action_groups' 
        AND policyname = 'Tenants can delete their own action groups'
    ) THEN
        CREATE POLICY "Tenants can delete their own action groups" ON public.action_groups
        FOR DELETE
        USING (user_id = public.get_tenant_id());
    END IF;
END $$;

-- 4. ACTION_TYPES - Remove políticas públicas conflitantes
DROP POLICY IF EXISTS "Allow select for all users" ON public.action_types;
DROP POLICY IF EXISTS "Allow insert for all users" ON public.action_types;
DROP POLICY IF EXISTS "Allow update for all users" ON public.action_types;
DROP POLICY IF EXISTS "Allow delete for all users" ON public.action_types;

-- Garante que as políticas multi-tenant existem
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'action_types' 
        AND policyname = 'Tenants can view own and default action types'
    ) THEN
        CREATE POLICY "Tenants can view own and default action types" ON public.action_types
        FOR SELECT
        USING (user_id = public.get_tenant_id() OR user_id IS NULL);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'action_types' 
        AND policyname = 'Tenants can insert their own action types'
    ) THEN
        CREATE POLICY "Tenants can insert their own action types" ON public.action_types
        FOR INSERT
        WITH CHECK (user_id = public.get_tenant_id());
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'action_types' 
        AND policyname = 'Tenants can update their own action types'
    ) THEN
        CREATE POLICY "Tenants can update their own action types" ON public.action_types
        FOR UPDATE
        USING (user_id = public.get_tenant_id())
        WITH CHECK (user_id = public.get_tenant_id());
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'action_types' 
        AND policyname = 'Tenants can delete their own action types'
    ) THEN
        CREATE POLICY "Tenants can delete their own action types" ON public.action_types
        FOR DELETE
        USING (user_id = public.get_tenant_id());
    END IF;
END $$;

-- 5. LEAD_SOURCES - Remove políticas públicas conflitantes
DROP POLICY IF EXISTS "Allow select for all users" ON public.lead_sources;
DROP POLICY IF EXISTS "Allow insert for all users" ON public.lead_sources;
DROP POLICY IF EXISTS "Allow update for all users" ON public.lead_sources;
DROP POLICY IF EXISTS "Allow delete for all users" ON public.lead_sources;

-- Garante que as políticas multi-tenant existem
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'lead_sources' 
        AND policyname = 'Tenants can view own and default lead sources'
    ) THEN
        CREATE POLICY "Tenants can view own and default lead sources" ON public.lead_sources
        FOR SELECT
        USING (user_id = public.get_tenant_id() OR user_id IS NULL);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'lead_sources' 
        AND policyname = 'Tenants can insert their own lead_sources'
    ) THEN
        CREATE POLICY "Tenants can insert their own lead_sources" ON public.lead_sources
        FOR INSERT
        WITH CHECK (user_id = public.get_tenant_id());
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'lead_sources' 
        AND policyname = 'Tenants can update their own lead_sources'
    ) THEN
        CREATE POLICY "Tenants can update their own lead_sources" ON public.lead_sources
        FOR UPDATE
        USING (user_id = public.get_tenant_id())
        WITH CHECK (user_id = public.get_tenant_id());
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'lead_sources' 
        AND policyname = 'Tenants can delete own lead_sources'
    ) THEN
        CREATE POLICY "Tenants can delete own lead_sources" ON public.lead_sources
        FOR DELETE
        USING (user_id = public.get_tenant_id());
    END IF;
END $$;

-- 6. Garantir que o RLS está habilitado em todas as tabelas críticas
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loss_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;

-- 7. Verificação final: garantir que todos os leads têm user_id preenchido
-- Atualiza leads órfãos para evitar vazamentos
DO $$
DECLARE
    tenant_uuid uuid;
BEGIN
    -- Se houver leads sem user_id, precisamos investigar e corrigir
    IF EXISTS (SELECT 1 FROM public.leads WHERE user_id IS NULL) THEN
        -- Log para debugging
        RAISE NOTICE 'ATENÇÃO: Encontrados leads sem user_id. Isso precisa ser corrigido manualmente.';
        
        -- Para fins de teste, vamos marcar esses leads como órfãos
        -- O administrador deve decidir o que fazer com eles
        UPDATE public.leads 
        SET description = COALESCE(description, '') || ' [LEAD ÓRFÃO - VERIFICAR]'
        WHERE user_id IS NULL;
    END IF;
END $$;

-- 8. Verificação das políticas instaladas
-- Mostra um resumo das políticas ativas para confirmar o isolamento
SELECT 
    tablename,
    policyname,
    cmd,
    qual as "USING_condition",
    with_check as "WITH_CHECK_condition"
FROM pg_policies 
WHERE tablename IN ('leads', 'kanban_columns', 'action_groups', 'action_types', 'lead_sources')
ORDER BY tablename, policyname;
