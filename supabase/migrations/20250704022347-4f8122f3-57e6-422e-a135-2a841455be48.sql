-- Adicionar coluna user_id às tabelas de leads dos tenants e corrigir dados existentes

CREATE OR REPLACE FUNCTION add_user_id_to_tenant_leads()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_record RECORD;
  tenant_schema_name text;
  tenant_id_value uuid;
  column_exists boolean;
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
    
    -- Verificar se a coluna user_id já existe
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = tenant_schema_name 
      AND table_name = 'leads' 
      AND column_name = 'user_id'
    ) INTO column_exists;
    
    -- Adicionar coluna se não existir
    IF NOT column_exists THEN
      EXECUTE format('ALTER TABLE %I.leads ADD COLUMN user_id UUID', tenant_schema_name);
      RAISE LOG 'Added user_id column to leads table in schema: %', tenant_schema_name;
    END IF;
    
    -- Atualizar leads sem user_id
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
SELECT add_user_id_to_tenant_leads();

-- Remover a função após uso
DROP FUNCTION add_user_id_to_tenant_leads();