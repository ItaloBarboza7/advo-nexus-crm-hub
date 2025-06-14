
-- 1. Função para obter o ID do "tenant" (a conta do administrador) no backend.
-- Essencial para a lógica de multi-tenancy.
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (SELECT parent_user_id FROM public.user_profiles WHERE user_id = auth.uid()),
    auth.uid()
  )
$$;

-- 2. Modifica a tabela `loss_reasons` para ser específica de cada tenant.
ALTER TABLE public.loss_reasons ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX idx_loss_reasons_user_id ON public.loss_reasons(user_id);

-- 3. Função de gatilho (trigger) para definir o `user_id` do tenant em novos motivos de perda.
CREATE OR REPLACE FUNCTION public.set_loss_reason_tenant_id()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.user_id := public.get_tenant_id();
  RETURN NEW;
END;
$$;

-- 4. Cria o gatilho (trigger) para a tabela `loss_reasons`.
CREATE TRIGGER on_loss_reason_insert_set_user_id
BEFORE INSERT ON public.loss_reasons
FOR EACH ROW
EXECUTE FUNCTION public.set_loss_reason_tenant_id();

-- 5. Atualiza as políticas de segurança (RLS) para `loss_reasons`.
ALTER TABLE public.loss_reasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable delete for all users" ON "public"."loss_reasons";

CREATE POLICY "Tenants can view own and system loss reasons" ON public.loss_reasons
FOR SELECT USING (user_id = public.get_tenant_id() OR is_fixed = true);

CREATE POLICY "Tenants can insert their own loss reasons" ON public.loss_reasons
FOR INSERT WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can update their own non-fixed loss reasons" ON public.loss_reasons
FOR UPDATE USING (user_id = public.get_tenant_id() AND is_fixed = false);

CREATE POLICY "Tenants can delete their own non-fixed loss reasons" ON public.loss_reasons
FOR DELETE USING (user_id = public.get_tenant_id() AND is_fixed = false);

-- 6. Adiciona políticas de segurança (RLS) à tabela `company_info` para torná-la específica do tenant.
ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can manage their own company info" ON public.company_info
FOR ALL USING (user_id = public.get_tenant_id()) WITH CHECK (user_id = public.get_tenant_id());
