-- Criar uma tabela específica para rastrear fechamentos de contratos
CREATE TABLE IF NOT EXISTS public.contract_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  closed_by_user_id UUID NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.contract_closures ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para contract_closures
CREATE POLICY "Tenants can view their own contract closures" 
ON public.contract_closures 
FOR SELECT 
USING (tenant_id = get_tenant_id());

CREATE POLICY "Tenants can insert their own contract closures" 
ON public.contract_closures 
FOR INSERT 
WITH CHECK (tenant_id = get_tenant_id());

-- Função para rastrear fechamento de contratos globalmente
CREATE OR REPLACE FUNCTION public.track_global_contract_closure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se o status mudou para "Contrato Fechado", registrar no histórico global
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Contrato Fechado' THEN
    INSERT INTO public.contract_closures (lead_id, closed_by_user_id, tenant_id, closed_at)
    VALUES (NEW.id, auth.uid(), get_tenant_id(), now());
  END IF;
  
  RETURN NEW;
END;
$$;

-- Função para adicionar trigger de rastreamento a um tenant específico
CREATE OR REPLACE FUNCTION public.add_contract_tracking_to_tenant(schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Adicionar trigger para rastrear fechamentos
  EXECUTE format('
    DROP TRIGGER IF EXISTS track_global_contract_closure_trigger ON %I.leads;
    CREATE TRIGGER track_global_contract_closure_trigger
      AFTER UPDATE ON %I.leads
      FOR EACH ROW
      EXECUTE FUNCTION public.track_global_contract_closure();
  ', schema_name, schema_name);
END;
$$;

-- Aplicar o trigger ao tenant atual
SELECT public.add_contract_tracking_to_tenant('tenant_20548379_7f8c_4a8a_9fd8_b059158466db');

-- Povoar a tabela com contratos já fechados
INSERT INTO public.contract_closures (lead_id, closed_by_user_id, tenant_id, closed_at)
SELECT 
  l.id as lead_id,
  COALESCE(l.closed_by_user_id, '20548379-7f8c-4a8a-9fd8-b059158466db') as closed_by_user_id,
  '20548379-7f8c-4a8a-9fd8-b059158466db'::uuid as tenant_id,
  l.updated_at as closed_at
FROM tenant_20548379_7f8c_4a8a_9fd8_b059158466db.leads l
WHERE l.status = 'Contrato Fechado'
ON CONFLICT DO NOTHING;