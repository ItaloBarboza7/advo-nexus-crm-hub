
-- Corrigir políticas de RLS para action_groups e action_types
-- para permitir que os usuários vejam os itens padrão (user_id IS NULL).

-- =================================================================
-- Tabela: action_groups
-- =================================================================
-- 1.1. Remove a política antiga e abrangente.
DROP POLICY IF EXISTS "Tenants can manage their own action groups" ON public.action_groups;

-- 1.2. Cria políticas granulares.
-- Permite que os tenants vejam seus próprios grupos e os grupos padrão (sem user_id).
CREATE POLICY "Tenants can view own and default action groups" ON public.action_groups
FOR SELECT USING (user_id = public.get_tenant_id() OR user_id IS NULL);

-- Permite que os tenants insiram seus próprios grupos.
CREATE POLICY "Tenants can insert their own action groups" ON public.action_groups
FOR INSERT WITH CHECK (user_id = public.get_tenant_id());

-- Permite que os tenants atualizem seus próprios grupos.
CREATE POLICY "Tenants can update their own action groups" ON public.action_groups
FOR UPDATE USING (user_id = public.get_tenant_id()) WITH CHECK (user_id = public.get_tenant_id());

-- Permite que os tenants excluam seus próprios grupos.
CREATE POLICY "Tenants can delete their own action groups" ON public.action_groups
FOR DELETE USING (user_id = public.get_tenant_id());


-- =================================================================
-- Tabela: action_types
-- =================================================================
-- 2.1. Remove a política antiga e abrangente.
DROP POLICY IF EXISTS "Tenants can manage their own action types" ON public.action_types;

-- 2.2. Cria políticas granulares.
-- Permite que os tenants vejam seus próprios tipos e os tipos padrão (sem user_id).
CREATE POLICY "Tenants can view own and default action types" ON public.action_types
FOR SELECT USING (user_id = public.get_tenant_id() OR user_id IS NULL);

-- Permite que os tenants insiram seus próprios tipos.
CREATE POLICY "Tenants can insert their own action types" ON public.action_types
FOR INSERT WITH CHECK (user_id = public.get_tenant_id());

-- Permite que os tenants atualizem seus próprios tipos.
CREATE POLICY "Tenants can update their own action types" ON public.action_types
FOR UPDATE USING (user_id = public.get_tenant_id()) WITH CHECK (user_id = public.get_tenant_id());

-- Permite que os tenants excluam seus próprios tipos.
CREATE POLICY "Tenants can delete their own action types" ON public.action_types
FOR DELETE USING (user_id = public.get_tenant_id());
