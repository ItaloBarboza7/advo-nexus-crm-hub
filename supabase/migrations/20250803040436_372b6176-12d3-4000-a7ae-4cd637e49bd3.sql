-- Garantir que todos os esquemas de tenant existentes tenham o trigger de renomeação
DO $$
DECLARE
  tenant_schema_record RECORD;
BEGIN
  -- Buscar todos os esquemas de tenant existentes
  FOR tenant_schema_record IN 
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'tenant_%'
  LOOP
    -- Criar função específica do tenant para atualizar leads quando coluna é renomeada
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.update_leads_on_column_rename_tenant()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $func$
      BEGIN
        -- Atualizar todos os leads que tinham o nome antigo da coluna para o novo nome
        UPDATE %I.leads 
        SET status = NEW.name, updated_at = now() 
        WHERE status = OLD.name;
        
        RAISE LOG ''Updated leads from status %% to %% in schema %I'', OLD.name, NEW.name;
        
        RETURN NEW;
      END;
      $func$;
    ', tenant_schema_record.schema_name, tenant_schema_record.schema_name, tenant_schema_record.schema_name);
    
    -- Verificar se o trigger já existe e removê-lo se necessário
    IF EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_schema = tenant_schema_record.schema_name 
      AND trigger_name = 'update_leads_on_column_rename_trigger'
    ) THEN
      EXECUTE format('DROP TRIGGER update_leads_on_column_rename_trigger ON %I.kanban_columns', tenant_schema_record.schema_name);
    END IF;
    
    -- Criar o trigger
    EXECUTE format('
      CREATE TRIGGER update_leads_on_column_rename_trigger
        AFTER UPDATE OF name ON %I.kanban_columns
        FOR EACH ROW
        WHEN (OLD.name IS DISTINCT FROM NEW.name)
        EXECUTE FUNCTION %I.update_leads_on_column_rename_tenant();
    ', tenant_schema_record.schema_name, tenant_schema_record.schema_name);
    
    RAISE LOG 'Added column rename trigger to existing schema: %', tenant_schema_record.schema_name;
  END LOOP;
END;
$$;