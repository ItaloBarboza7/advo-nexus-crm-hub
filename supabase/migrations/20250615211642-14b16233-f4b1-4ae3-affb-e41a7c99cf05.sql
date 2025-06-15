
-- ======================
-- 1. Corrige policies e triggers para a tabela LEADS
-- ======================
-- Remove todas as policies antigas
DROP POLICY IF EXISTS "Allow select for all users" ON public.leads;
DROP POLICY IF EXISTS "Allow insert for all users" ON public.leads;
DROP POLICY IF EXISTS "Allow update for all users" ON public.leads;
DROP POLICY IF EXISTS "Allow delete for all users" ON public.leads;
DROP POLICY IF EXISTS "Tenants can manage their own leads" ON public.leads;

-- Remove triggers duplicados
DROP TRIGGER IF EXISTS on_lead_insert_set_user_id ON public.leads;
DROP FUNCTION IF EXISTS public.set_lead_tenant_id();

-- Cria trigger e função correta para setar user_id
CREATE OR REPLACE FUNCTION public.set_lead_tenant_id()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := public.get_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lead_insert_set_user_id
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.set_lead_tenant_id();

-- Aplica RLS corretamente
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants manage their own leads"
  ON public.leads
  FOR ALL
  USING (user_id = public.get_tenant_id())
  WITH CHECK (user_id = public.get_tenant_id());

-- Normaliza todos leads com user_id nulo para o tenant atual
UPDATE public.leads
SET user_id = public.get_tenant_id()
WHERE user_id IS NULL;

-- ======================
-- 2. Kanban Columns: só dono vê sua coluna, mas pode haver padrões globais (user_id IS NULL e is_default = true)
-- ======================
DROP POLICY IF EXISTS "Allow select for all users" ON public.kanban_columns;
DROP POLICY IF EXISTS "Allow insert for all users" ON public.kanban_columns;
DROP POLICY IF EXISTS "Allow update for all users" ON public.kanban_columns;
DROP POLICY IF EXISTS "Allow delete for all users" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenants can view own and default columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenants can insert their own columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenants can update their own non-default columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Tenants can delete their own non-default columns" ON public.kanban_columns;

DROP TRIGGER IF EXISTS on_kanban_column_insert_set_user_id ON public.kanban_columns;
DROP FUNCTION IF EXISTS public.set_kanban_column_tenant_id();

-- Trigger
CREATE OR REPLACE FUNCTION public.set_kanban_column_tenant_id()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := public.get_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_kanban_column_insert_set_user_id
BEFORE INSERT ON public.kanban_columns
FOR EACH ROW
EXECUTE FUNCTION public.set_kanban_column_tenant_id();

ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

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

-- Normaliza colunas sem user_id que não são default para o tenant atual
UPDATE public.kanban_columns
SET user_id = public.get_tenant_id()
WHERE user_id IS NULL AND is_default = false;

-- ======================
-- 3. ACTION GROUPS/ACTION TYPES: visíveis se próprio ou padrão (user_id IS NULL)
-- ======================
-- action_groups
DROP POLICY IF EXISTS "Tenants can manage their own action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can view own and default action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can insert their own action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can update their own action groups" ON public.action_groups;
DROP POLICY IF EXISTS "Tenants can delete their own action groups" ON public.action_groups;

DROP TRIGGER IF EXISTS on_action_group_insert_set_user_id ON public.action_groups;
DROP FUNCTION IF EXISTS public.set_action_group_tenant_id();

CREATE OR REPLACE FUNCTION public.set_action_group_tenant_id()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := public.get_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_action_group_insert_set_user_id
BEFORE INSERT ON public.action_groups
FOR EACH ROW
EXECUTE FUNCTION public.set_action_group_tenant_id();

ALTER TABLE public.action_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own and default action groups"
  ON public.action_groups
  FOR SELECT USING (user_id = public.get_tenant_id() OR user_id IS NULL);

CREATE POLICY "Tenants can insert their own action groups"
  ON public.action_groups
  FOR INSERT WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can update their own action groups"
  ON public.action_groups
  FOR UPDATE USING (user_id = public.get_tenant_id()) WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can delete their own action groups"
  ON public.action_groups
  FOR DELETE USING (user_id = public.get_tenant_id());

-- Normaliza action_groups sem user_id para os grupos não-padrão (regras globais podem exigir inspeção manual nessa tabela)

-- action_types
DROP POLICY IF EXISTS "Tenants can manage their own action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenants can view own and default action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenants can insert their own action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenants can update their own action types" ON public.action_types;
DROP POLICY IF EXISTS "Tenants can delete their own action types" ON public.action_types;

DROP TRIGGER IF EXISTS on_action_type_insert_set_user_id ON public.action_types;
DROP FUNCTION IF EXISTS public.set_action_type_tenant_id();

CREATE OR REPLACE FUNCTION public.set_action_type_tenant_id()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := public.get_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_action_type_insert_set_user_id
BEFORE INSERT ON public.action_types
FOR EACH ROW
EXECUTE FUNCTION public.set_action_type_tenant_id();

ALTER TABLE public.action_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own and default action types"
  ON public.action_types
  FOR SELECT USING (user_id = public.get_tenant_id() OR user_id IS NULL);

CREATE POLICY "Tenants can insert their own action types"
  ON public.action_types
  FOR INSERT WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can update their own action types"
  ON public.action_types
  FOR UPDATE USING (user_id = public.get_tenant_id()) WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can delete their own action types"
  ON public.action_types
  FOR DELETE USING (user_id = public.get_tenant_id());

-- Normaliza action_types sem user_id para o tenant quando apropriado (exceto os padrões/globais);

-- ======================
-- 4. LEAD SOURCES: próprias e padrões (user_id IS NULL)
-- ======================
DROP POLICY IF EXISTS "Tenants can view own and default lead sources" ON public.lead_sources;
DROP POLICY IF EXISTS "Tenants can insert their own lead_sources" ON public.lead_sources;
DROP POLICY IF EXISTS "Tenants can update their own lead_sources" ON public.lead_sources;
DROP POLICY IF EXISTS "Tenants can delete own lead_sources" ON public.lead_sources;

DROP TRIGGER IF EXISTS on_lead_source_insert_set_user_id ON public.lead_sources;
DROP FUNCTION IF EXISTS public.set_lead_source_tenant_id();

CREATE OR REPLACE FUNCTION public.set_lead_source_tenant_id()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := public.get_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lead_source_insert_set_user_id
BEFORE INSERT ON public.lead_sources
FOR EACH ROW
EXECUTE FUNCTION public.set_lead_source_tenant_id();

ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own and default lead sources"
  ON public.lead_sources
  FOR SELECT
  USING (
    user_id = public.get_tenant_id()
    OR user_id IS NULL
  );

CREATE POLICY "Tenants can insert their own lead_sources"
  ON public.lead_sources
  FOR INSERT
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can update their own lead_sources"
  ON public.lead_sources
  FOR UPDATE
  USING (user_id = public.get_tenant_id())
  WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can delete own lead_sources"
  ON public.lead_sources
  FOR DELETE
  USING (user_id = public.get_tenant_id());

-- Normaliza para o tenant fontes de lead que não sejam padrão
UPDATE public.lead_sources
SET user_id = public.get_tenant_id()
WHERE user_id IS NULL AND label NOT IN ('Google', 'Facebook', 'Instagram'); -- ajustar conforme suas fontes padrão

-- ======================
-- 5. COMPANY INFO: isolada ao tenant
-- ======================
DROP POLICY IF EXISTS "Tenants can manage their own company info" ON public.company_info;

ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their own company info"
  ON public.company_info
  FOR ALL
  USING (user_id = public.get_tenant_id())
  WITH CHECK (user_id = public.get_tenant_id());

-- Normaliza registros antigos com user_id nulo
UPDATE public.company_info
SET user_id = public.get_tenant_id()
WHERE user_id IS NULL;

-- ========================
-- 6. loss_reasons: já configurada mas só checar
-- ========================
-- (As políticas já garantem isolamento, apenas checar se user_id está correta nos registros antigos)

UPDATE public.loss_reasons
SET user_id = public.get_tenant_id()
WHERE user_id IS NULL AND is_fixed = false;

-- ========================
-- 7. lead_status_history - herda de leads (não precisa mexer)
-- ========================

-- FIM DO SCRIPT DE ISOLAMENTO MULTI-TENANT
