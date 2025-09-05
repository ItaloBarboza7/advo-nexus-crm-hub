
-- 1) Remover políticas antigas (baseadas em uuid)

DROP POLICY IF EXISTS "Tenant users can create whatsapp connections" ON public.whatsapp_connections;
DROP POLICY IF EXISTS "Tenant users can delete whatsapp connections" ON public.whatsapp_connections;
DROP POLICY IF EXISTS "Tenant users can update whatsapp connections" ON public.whatsapp_connections;
DROP POLICY IF EXISTS "Tenant users can view whatsapp connections" ON public.whatsapp_connections;

-- 2) Ajustar trigger para gravar tenant_id como texto

CREATE OR REPLACE FUNCTION public.set_whatsapp_connection_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    -- agora tenant_id é TEXT
    NEW.tenant_id := public.get_tenant_id()::text;
  END IF;
  IF NEW.created_by_user_id IS NULL THEN
    NEW.created_by_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) Alterar tipo da coluna para TEXT

ALTER TABLE public.whatsapp_connections
  ALTER COLUMN tenant_id TYPE text USING tenant_id::text;

-- 4) Recriar políticas com casts adequados

-- Visualização: apenas dados do próprio tenant
CREATE POLICY "Tenant users can view whatsapp connections"
  ON public.whatsapp_connections
  FOR SELECT
  USING (tenant_id::uuid = public.get_tenant_id());

-- Criação: obrigar tenant id do próprio tenant + usuário criador correto
CREATE POLICY "Tenant users can create whatsapp connections"
  ON public.whatsapp_connections
  FOR INSERT
  WITH CHECK (tenant_id::uuid = public.get_tenant_id() AND created_by_user_id = auth.uid());

-- Atualização: somente do próprio tenant
CREATE POLICY "Tenant users can update whatsapp connections"
  ON public.whatsapp_connections
  FOR UPDATE
  USING (tenant_id::uuid = public.get_tenant_id())
  WITH CHECK (tenant_id::uuid = public.get_tenant_id());

-- Exclusão: somente do próprio tenant
CREATE POLICY "Tenant users can delete whatsapp connections"
  ON public.whatsapp_connections
  FOR DELETE
  USING (tenant_id::uuid = public.get_tenant_id());
