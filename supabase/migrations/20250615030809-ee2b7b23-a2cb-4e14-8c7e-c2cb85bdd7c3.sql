
-- Corrige as políticas RLS das tabelas action_groups e action_types no Supabase
-- 1. Remove todas as políticas existentes nestas tabelas relacionadas a tenants/usuários
DROP POLICY IF EXISTS "Tenants can manage their own action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can view own and default action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can insert their own action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can update their own action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can delete their own action groups" ON public.action_groups;

DROP POLICY IF EXISTS "Tenants can manage their own action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenants can view own and default action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenants can insert their own action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenants can update their own action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenants can delete their own action types" ON public.action_types;

-- 2. Cria apenas as políticas corretas e idempotentes para multi-tenant com uso dos itens padrão:
-- action_groups
CREATE POLICY "Tenants can view own and default action groups" ON public.action_groups
FOR SELECT USING (user_id = public.get_tenant_id() OR user_id IS NULL);

CREATE POLICY "Tenants can insert their own action groups" ON public.action_groups
FOR INSERT WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can update their own action groups" ON public.action_groups
FOR UPDATE USING (user_id = public.get_tenant_id()) WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can delete their own action groups" ON public.action_groups
FOR DELETE USING (user_id = public.get_tenant_id());

-- action_types
CREATE POLICY "Tenants can view own and default action types" ON public.action_types
FOR SELECT USING (user_id = public.get_tenant_id() OR user_id IS NULL);

CREATE POLICY "Tenants can insert their own action types" ON public.action_types
FOR INSERT WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can update their own action types" ON public.action_types
FOR UPDATE USING (user_id = public.get_tenant_id()) WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can delete their own action types" ON public.action_types
FOR DELETE USING (user_id = public.get_tenant_id());
