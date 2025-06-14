
-- Este script implementa a funcionalidade de multi-tenancy em várias tabelas
-- para garantir que os dados de cada conta de administrador sejam isolados.

-- =================================================================
-- Tabela: leads
-- =================================================================
-- 1.1. Adiciona a coluna `user_id` para rastrear o tenant.
ALTER TABLE public.leads ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX idx_leads_user_id ON public.leads(user_id);

-- 1.2. Cria uma função de gatilho para preencher `user_id` em novas inserções.
CREATE OR REPLACE FUNCTION public.set_lead_tenant_id()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.user_id := public.get_tenant_id();
  RETURN NEW;
END;
$$;

-- 1.3. Cria o gatilho para a tabela `leads`.
CREATE TRIGGER on_lead_insert_set_user_id
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.set_lead_tenant_id();

-- 1.4. Habilita e cria as políticas de segurança (RLS).
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can manage their own leads" ON public.leads
FOR ALL USING (user_id = public.get_tenant_id()) WITH CHECK (user_id = public.get_tenant_id());


-- =================================================================
-- Tabela: kanban_columns
-- =================================================================
-- 2.1. Adiciona a coluna `user_id`.
ALTER TABLE public.kanban_columns ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX idx_kanban_columns_user_id ON public.kanban_columns(user_id);

-- 2.2. Cria a função de gatilho para `kanban_columns`.
CREATE OR REPLACE FUNCTION public.set_kanban_column_tenant_id()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.user_id := public.get_tenant_id();
  RETURN NEW;
END;
$$;

-- 2.3. Cria o gatilho para `kanban_columns`.
CREATE TRIGGER on_kanban_column_insert_set_user_id
BEFORE INSERT ON public.kanban_columns
FOR EACH ROW
EXECUTE FUNCTION public.set_kanban_column_tenant_id();

-- 2.4. Habilita e cria as políticas de segurança (RLS).
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own and default columns" ON public.kanban_columns
FOR SELECT USING (user_id = public.get_tenant_id() OR is_default = true);

CREATE POLICY "Tenants can insert their own columns" ON public.kanban_columns
FOR INSERT WITH CHECK (user_id = public.get_tenant_id() AND is_default = false);

CREATE POLICY "Tenants can update their own non-default columns" ON public.kanban_columns
FOR UPDATE USING (user_id = public.get_tenant_id() AND is_default = false) WITH CHECK (user_id = public.get_tenant_id() AND is_default = false);

CREATE POLICY "Tenants can delete their own non-default columns" ON public.kanban_columns
FOR DELETE USING (user_id = public.get_tenant_id() AND is_default = false);


-- =================================================================
-- Tabela: action_groups
-- =================================================================
-- 3.1. Adiciona a coluna `user_id`.
ALTER TABLE public.action_groups ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX idx_action_groups_user_id ON public.action_groups(user_id);

-- 3.2. Cria a função de gatilho para `action_groups`.
CREATE OR REPLACE FUNCTION public.set_action_group_tenant_id()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.user_id := public.get_tenant_id();
  RETURN NEW;
END;
$$;

-- 3.3. Cria o gatilho para `action_groups`.
CREATE TRIGGER on_action_group_insert_set_user_id
BEFORE INSERT ON public.action_groups
FOR EACH ROW
EXECUTE FUNCTION public.set_action_group_tenant_id();

-- 3.4. Habilita e cria as políticas de segurança (RLS).
ALTER TABLE public.action_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can manage their own action groups" ON public.action_groups
FOR ALL USING (user_id = public.get_tenant_id()) WITH CHECK (user_id = public.get_tenant_id());


-- =================================================================
-- Tabela: action_types
-- =================================================================
-- 4.1. Adiciona a coluna `user_id`.
ALTER TABLE public.action_types ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX idx_action_types_user_id ON public.action_types(user_id);

-- 4.2. Cria a função de gatilho para `action_types`.
CREATE OR REPLACE FUNCTION public.set_action_type_tenant_id()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.user_id := public.get_tenant_id();
  RETURN NEW;
END;
$$;

-- 4.3. Cria o gatilho para `action_types`.
CREATE TRIGGER on_action_type_insert_set_user_id
BEFORE INSERT ON public.action_types
FOR EACH ROW
EXECUTE FUNCTION public.set_action_type_tenant_id();

-- 4.4. Habilita e cria as políticas de segurança (RLS).
ALTER TABLE public.action_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can manage their own action types" ON public.action_types
FOR ALL USING (user_id = public.get_tenant_id()) WITH CHECK (user_id = public.get_tenant_id());


-- =================================================================
-- Tabela: lead_status_history
-- =================================================================
-- 5.1. Habilita e cria as políticas de segurança (RLS).
-- A segurança é herdada da tabela `leads`.
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view history for their own leads" ON public.lead_status_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE id = lead_status_history.lead_id
  )
);
-- Nota: Inserções, atualizações e exclusões nesta tabela são gerenciadas
-- indiretamente através de gatilhos na tabela `leads`, que já possui RLS.

