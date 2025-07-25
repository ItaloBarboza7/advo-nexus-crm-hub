
-- Corrigir leads existentes com user_id NULL nos esquemas de tenant
-- Esta função percorrerá todos os esquemas de tenant e atualizará leads sem user_id

CREATE OR REPLACE FUNCTION fix_tenant_leads_user_id()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_record RECORD;
  tenant_schema_name text;
  tenant_id_value uuid;
  affected_rows integer;
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
    
    -- Verificar se existem leads sem user_id e corrigi-los
    EXECUTE format('
      UPDATE %I.leads 
      SET user_id = $1
      WHERE user_id IS NULL
    ', tenant_schema_name) USING tenant_id_value;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    IF affected_rows > 0 THEN
      RAISE LOG 'Fixed % leads without user_id in schema: % for tenant: %', affected_rows, tenant_schema_name, tenant_id_value;
    END IF;
  END LOOP;
END;
$$;

-- Executar a função para corrigir dados existentes
SELECT fix_tenant_leads_user_id();

-- Remover a função após uso
DROP FUNCTION fix_tenant_leads_user_id();
