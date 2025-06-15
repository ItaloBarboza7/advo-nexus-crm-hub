
-- TABELA LEADS
CREATE POLICY "Tenants manage their own leads" ON public.leads
  FOR ALL
  USING (user_id = public.get_tenant_id())
  WITH CHECK (user_id = public.get_tenant_id());

UPDATE public.leads
SET user_id = public.get_tenant_id()
WHERE user_id IS NULL;

ALTER TABLE public.leads
  ALTER COLUMN user_id SET NOT NULL;


-- TABELA KANBAN_COLUMNS (remove antigas e cria novas)
DROP POLICY IF EXISTS "Allow select for all users" ON public.kanban_columns;
DROP POLICY IF EXISTS "Allow insert for all users" ON public.kanban_columns;
DROP POLICY IF EXISTS "Allow update for all users" ON public.kanban_columns;
DROP POLICY IF EXISTS "Allow delete for all users" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenants can view own and default columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenants can insert their own columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenants can update their own non-default columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenants can delete their own non-default columns" ON public.kanban_columns;

CREATE POLICY "Tenants can view own and default columns"
  ON public.kanban_columns
  FOR SELECT
  USING (user_id = public.get_tenant_id() OR (user_id IS NULL AND is_default = true));

CREATE POLICY "Tenants can insert their own columns"
  ON public.kanban_columns
  FOR INSERT
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can update their own non-default columns"
  ON public.kanban_columns
  FOR UPDATE
  USING (user_id = public.get_tenant_id() AND is_default = false)
  WITH CHECK (user_id = public.get_tenant_id() AND is_default = false);

CREATE POLICY "Tenants can delete their own non-default columns"
  ON public.kanban_columns
  FOR DELETE
  USING (user_id = public.get_tenant_id() AND is_default = false);

UPDATE public.kanban_columns
SET user_id = public.get_tenant_id()
WHERE user_id IS NULL AND is_default = false;


-- TABELA ACTION_GROUPS (remove e recria políticas)
DROP POLICY IF EXISTS "Tenants can manage their own action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can view own and default action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can insert their own action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can update their own action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can delete their own action groups" ON public.action_groups;

CREATE POLICY "Tenants can view own and default action groups"
  ON public.action_groups
  FOR SELECT
  USING (user_id = public.get_tenant_id() OR user_id IS NULL);

CREATE POLICY "Tenants can insert their own action groups"
  ON public.action_groups
  FOR INSERT
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can update their own action groups"
  ON public.action_groups
  FOR UPDATE
  USING (user_id = public.get_tenant_id())
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can delete their own action groups"
  ON public.action_groups
  FOR DELETE
  USING (user_id = public.get_tenant_id());

UPDATE public.action_groups
SET user_id = public.get_tenant_id()
WHERE user_id IS NULL;
