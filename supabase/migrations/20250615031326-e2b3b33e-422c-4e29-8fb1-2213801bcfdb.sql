
-- 1. Drop all relevant policies that depend on get_tenant_id (CASCADE not supported for DROP POLICY, so list all)
DROP POLICY IF EXISTS "Tenants can view own and system loss reasons" ON public.loss_reasons;
DROP POLICY IF EXISTS "Tenants can insert their own loss reasons" ON public.loss_reasons;
DROP POLICY IF EXISTS "Tenants can update their own non-fixed loss reasons" ON public.loss_reasons;
DROP POLICY IF EXISTS "Tenants can delete their own non-fixed loss reasons" ON public.loss_reasons;

DROP POLICY IF EXISTS "Tenants can manage their own company info" ON public.company_info;

DROP POLICY IF EXISTS "Tenants can manage their own leads" ON public.leads;

DROP POLICY IF EXISTS "Tenants can view own and default columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenants can insert their own columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenants can update their own non-default columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenants can delete their own non-default columns" ON public.kanban_columns;

DROP POLICY IF EXISTS "Tenants can manage their own hidden items" ON public.hidden_default_items;
DROP POLICY IF EXISTS "Tenants can view their own hidden items" ON public.hidden_default_items;
DROP POLICY IF EXISTS "Tenants can insert their own hidden items" ON public.hidden_default_items;
DROP POLICY IF EXISTS "Tenants can update their own hidden items" ON public.hidden_default_items;
DROP POLICY IF EXISTS "Tenants can delete their own hidden items" ON public.hidden_default_items;

DROP POLICY IF EXISTS "Tenants can view own and default action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can insert their own action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can update their own action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can delete their own action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can manage their own action groups" ON public.action_groups;

DROP POLICY IF EXISTS "Tenants can view own and default action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenants can insert their own action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenants can update their own action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenants can delete their own action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenants can manage their own action types" ON public.action_types;

-- 2. Drop and recreate get_tenant_id function (removing SET search_path)
DROP FUNCTION IF EXISTS public.get_tenant_id();
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT parent_user_id FROM public.user_profiles WHERE user_id = auth.uid()),
    auth.uid()
  );
$$;

-- 3. Recreate all correct policies using get_tenant_id (multi-tenant, most granular RLS possible):

-- company_info
CREATE POLICY "Tenants can manage their own company info"
  ON public.company_info
  FOR ALL
  USING (user_id = public.get_tenant_id())
  WITH CHECK (user_id = public.get_tenant_id());

-- loss_reasons
CREATE POLICY "Tenants can view own and system loss reasons"
  ON public.loss_reasons
  FOR SELECT
  USING (user_id = public.get_tenant_id() OR user_id IS NULL);

CREATE POLICY "Tenants can insert their own loss reasons"
  ON public.loss_reasons
  FOR INSERT
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can update their own non-fixed loss reasons"
  ON public.loss_reasons
  FOR UPDATE
  USING (user_id = public.get_tenant_id() AND is_fixed = false)
  WITH CHECK (user_id = public.get_tenant_id() AND is_fixed = false);

CREATE POLICY "Tenants can delete their own non-fixed loss reasons"
  ON public.loss_reasons
  FOR DELETE
  USING (user_id = public.get_tenant_id() AND is_fixed = false);

-- leads
CREATE POLICY "Tenants can manage their own leads"
  ON public.leads
  FOR ALL
  USING (user_id = public.get_tenant_id())
  WITH CHECK (user_id = public.get_tenant_id());

-- kanban_columns
CREATE POLICY "Tenants can view own and default columns"
  ON public.kanban_columns
  FOR SELECT
  USING (user_id = public.get_tenant_id() OR user_id IS NULL);

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

-- hidden_default_items
CREATE POLICY "Tenants can manage their own hidden items"
  ON public.hidden_default_items
  FOR ALL
  USING (user_id = public.get_tenant_id())
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can view their own hidden items"
  ON public.hidden_default_items
  FOR SELECT
  USING (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can insert their own hidden items"
  ON public.hidden_default_items
  FOR INSERT
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can update their own hidden items"
  ON public.hidden_default_items
  FOR UPDATE
  USING (user_id = public.get_tenant_id())
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can delete their own hidden items"
  ON public.hidden_default_items
  FOR DELETE
  USING (user_id = public.get_tenant_id());

-- action_groups
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

-- action_types
CREATE POLICY "Tenants can view own and default action types"
  ON public.action_types
  FOR SELECT
  USING (user_id = public.get_tenant_id() OR user_id IS NULL);

CREATE POLICY "Tenants can insert their own action types"
  ON public.action_types
  FOR INSERT
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can update their own action types"
  ON public.action_types
  FOR UPDATE
  USING (user_id = public.get_tenant_id())
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can delete their own action types"
  ON public.action_types
  FOR DELETE
  USING (user_id = public.get_tenant_id());
