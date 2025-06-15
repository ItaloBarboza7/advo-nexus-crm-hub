
-- Esta migração corrige as políticas de segurança a nível de linha (RLS) para as tabelas 'action_groups' e 'action_types'.
-- As políticas anteriores impediam que os usuários excluíssem registros padrão (onde user_id é NULL),
-- o que, por sua vez, bloqueava a funcionalidade ON DELETE CASCADE.
-- Essas alterações permitem que usuários autenticados excluam seus próprios registros, bem como os registros padrão.

-- =================================================================
-- Tabela: action_groups
-- =================================================================
-- 1. Remove a política de exclusão (DELETE) antiga.
DROP POLICY IF EXISTS "Tenants can delete their own action groups" ON public.action_groups;

-- 2. Cria a nova política de exclusão que inclui os registros padrão.
CREATE POLICY "Tenants can delete their own and default action groups" ON public.action_groups
FOR DELETE USING (user_id = public.get_tenant_id() OR user_id IS NULL);


-- =================================================================
-- Tabela: action_types
-- =================================================================
-- 3. Remove a política de exclusão (DELETE) antiga.
DROP POLICY IF EXISTS "Tenants can delete their own action types" ON public.action_types;

-- 4. Cria a nova política de exclusão que inclui os registros padrão.
-- Isso é necessário para que o ON DELETE CASCADE funcione corretamente nos grupos de ação padrão.
CREATE POLICY "Tenants can delete their own and default action types" ON public.action_types
FOR DELETE USING (user_id = public.get_tenant_id() OR user_id IS NULL);
