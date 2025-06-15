
-- 1. Adiciona a coluna user_id para controle de tenant nas fontes de lead
ALTER TABLE public.lead_sources
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_lead_sources_user_id ON public.lead_sources(user_id);

-- 2. Trigger para sempre definir user_id ao inserir fonte de lead (exceto para fontes defaults/globais)
CREATE OR REPLACE FUNCTION public.set_lead_source_tenant_id()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- Só coloca user_id se não vier definido explicitamente (ou seja, só para fontes não-default)
  IF NEW.user_id IS NULL THEN
    NEW.user_id := public.get_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_lead_source_insert_set_user_id ON public.lead_sources;

CREATE TRIGGER on_lead_source_insert_set_user_id
BEFORE INSERT ON public.lead_sources
FOR EACH ROW
EXECUTE FUNCTION public.set_lead_source_tenant_id();

-- 3. Ativa RLS e implementa políticas para fontes de lead visíveis para o tenant
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

-- Cada tenant vê suas fontes ou as "padrão" (user_id is null e não ocultadas)
CREATE POLICY "Tenants can view own and default lead sources" ON public.lead_sources
FOR SELECT
USING (
  user_id = public.get_tenant_id()
  OR user_id IS NULL
);

-- Tenant só pode inserir fontes próprias
CREATE POLICY "Tenants can insert their own lead_sources" ON public.lead_sources
FOR INSERT
WITH CHECK (user_id = public.get_tenant_id());

-- Tenant pode atualizar fontes próprias
CREATE POLICY "Tenants can update their own lead_sources" ON public.lead_sources
FOR UPDATE
USING (user_id = public.get_tenant_id())
WITH CHECK (user_id = public.get_tenant_id());

-- Tenant pode deletar apenas suas fontes (não as default/globais)
CREATE POLICY "Tenants can delete own lead_sources" ON public.lead_sources
FOR DELETE
USING (user_id = public.get_tenant_id());

-- (Opcional) Atualiza função get_visible_lead_sources() se precisar unir lógica de ocultamento, mas ela já existe e cobre este caso.

