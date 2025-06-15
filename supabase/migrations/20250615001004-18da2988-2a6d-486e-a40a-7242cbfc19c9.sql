
-- Esta migração corrige as políticas de segurança para impedir que usuários
-- excluam registros padrão (compartilhados), garantindo o isolamento de dados.

-- =================================================================
-- Tabela: action_groups
-- =================================================================
-- 1. Remove a política de exclusão anterior que era muito permissiva.
DROP POLICY IF EXISTS "Tenants can delete their own and default action groups" ON public.action_groups;

-- 2. Remove a política antiga caso ela exista, para evitar duplicidade.
DROP POLICY IF EXISTS "Tenants can delete their own action groups" ON public.action_groups;

-- 3. Cria a política de exclusão correta, que permite aos usuários deletar APENAS seus próprios grupos.
CREATE POLICY "Tenants can delete their own action groups" ON public.action_groups
FOR DELETE USING (user_id = public.get_tenant_id());


-- =================================================================
-- Tabela: action_types
-- =================================================================
-- 4. Remove a política de exclusão anterior que era muito permissiva.
DROP POLICY IF EXISTS "Tenants can delete their own and default action types" ON public.action_types;

-- 5. Remove a política antiga caso ela exista, para evitar duplicidade.
DROP POLICY IF EXISTS "Tenants can delete their own action types" ON public.action_types;

-- 6. Cria a política de exclusão correta, que permite aos usuários deletar APENAS seus próprios tipos de ação.
CREATE POLICY "Tenants can delete their own action types" ON public.action_types
FOR DELETE USING (user_id = public.get_tenant_id());
