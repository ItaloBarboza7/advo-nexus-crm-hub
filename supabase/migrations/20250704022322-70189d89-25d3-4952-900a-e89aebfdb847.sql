-- Migração para corrigir leads sem user_id nos esquemas de tenant
-- Esta função percorrerá todos os esquemas de tenant e atualizará leads sem user_id

CREATE OR REPLACE FUNCTION fix_leads_without_user_id()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_record RECORD;
  tenant_schema_name text;
  tenant_id_value uuid;
BEGIN
  -- Buscar todos os esquemas de tenant existentes
  FOR tenant_record IN 
    SELECT s.schema_name 
    FROM information_schema.schemata s
    WHERE s.schema_name LIKE 'tenant_%'
  LOOP
    tenant_schema_name := tenant_record.schema_name;
    
    -- Extrair o tenant_id do nome do schema
    -- tenant_abc_def_ghi -> abc-def-ghi
    tenant_id_value := replace(substring(tenant_schema_name from 8), '_', '-')::uuid;
    
    -- Verificar se existem leads sem user_id
    EXECUTE format('
      UPDATE %I.leads 
      SET user_id = $1
      WHERE user_id IS NULL
    ', tenant_schema_name) USING tenant_id_value;
    
    RAISE LOG 'Updated leads without user_id in schema: % for tenant: %', tenant_schema_name, tenant_id_value;
  END LOOP;
END;
$$;

-- Executar a função
SELECT fix_leads_without_user_id();

-- Remover a função após uso
DROP FUNCTION fix_leads_without_user_id();