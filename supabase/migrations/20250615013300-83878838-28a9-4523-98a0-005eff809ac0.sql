
-- Esta migração restaura as políticas de segurança (RLS) restritivas para a exclusão
-- de 'action_groups' e 'action_types', garantindo que os tenants (usuários)
-- possam apagar apenas seus próprios registros e não os registros padrão (compartilhados).

-- =================================================================
-- Tabela: action_groups
-- =================================================================
-- 1. Remove a política de exclusão permissiva atual, que permitia apagar registros padrão.
DROP POLICY IF EXISTS "Tenants can delete their own and default action groups" ON public.action_groups;

-- 2. Recria a política de exclusão restritiva, que permite aos usuários apagar APENAS seus próprios grupos.
-- Itens com user_id nulo (padrão do sistema) ficam protegidos contra exclusão por usuários.
CREATE POLICY "Tenants can delete their own action groups"
ON public.action_groups
FOR DELETE
USING (user_id = public.get_tenant_id());


-- =================================================================
-- Tabela: action_types
-- =================================================================
-- 3. Remove a política de exclusão permissiva atual.
DROP POLICY IF EXISTS "Tenants can delete their own and default action types" ON public.action_types;

-- 4. Recria a política de exclusão restritiva para os tipos de ação.
CREATE POLICY "Tenants can delete their own action types"
ON public.action_types
FOR DELETE
USING (user_id = public.get_tenant_id());

