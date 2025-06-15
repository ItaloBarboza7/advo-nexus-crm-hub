
-- Esta migração corrige as políticas de segurança (RLS) para permitir a exclusão
-- de registros padrão (compartilhados) nas tabelas 'action_groups' e 'action_types'.

-- =================================================================
-- Tabela: action_groups
-- =================================================================
-- 1. Remove a política de exclusão restritiva atual, se existir.
DROP POLICY IF EXISTS "Tenants can delete their own action groups" ON public.action_groups;

-- 2. Cria a nova política de exclusão, que é mais permissiva.
-- Ela permite que usuários autenticados excluam seus próprios registros (onde user_id corresponde ao seu)
-- ou os registros padrão (onde user_id é NULO).
CREATE POLICY "Tenants can delete their own and default action groups"
ON public.action_groups
FOR DELETE
USING (user_id = public.get_tenant_id() OR user_id IS NULL);


-- =================================================================
-- Tabela: action_types
-- =================================================================
-- 3. Remove a política de exclusão restritiva atual, se existir.
DROP POLICY IF EXISTS "Tenants can delete their own action types" ON public.action_types;

-- 4. Cria a nova política de exclusão, que é mais permissiva.
-- Isso permite que a exclusão em cascata (ON DELETE CASCADE) funcione corretamente
-- quando um grupo de ação padrão é excluído.
CREATE POLICY "Tenants can delete their own and default action types"
ON public.action_types
FOR DELETE
USING (user_id = public.get_tenant_id() OR user_id IS NULL);
