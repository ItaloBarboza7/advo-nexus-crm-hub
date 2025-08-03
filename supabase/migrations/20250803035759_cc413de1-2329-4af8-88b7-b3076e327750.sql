-- Criar função para atualizar leads quando uma coluna Kanban é renomeada
CREATE OR REPLACE FUNCTION public.update_leads_on_column_rename()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  tenant_schema_name text;
BEGIN
  -- Obter o nome do esquema do tenant
  tenant_schema_name := public.get_tenant_schema();
  
  -- Atualizar todos os leads que tinham o nome antigo da coluna para o novo nome
  EXECUTE format('
    UPDATE %I.leads 
    SET status = $1, updated_at = now() 
    WHERE status = $2
  ', tenant_schema_name) USING NEW.name, OLD.name;
  
  RAISE LOG 'Updated leads from status % to % in schema %', OLD.name, NEW.name, tenant_schema_name;
  
  RETURN NEW;
END;
$function$;

-- Função para adicionar trigger de renomeação ao esquema do tenant
CREATE OR REPLACE FUNCTION public.add_column_rename_trigger_to_tenant(schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Criar trigger para atualizar leads quando coluna for renomeada
  EXECUTE format('
    DROP TRIGGER IF EXISTS update_leads_on_column_rename_trigger ON %I.kanban_columns;
    CREATE TRIGGER update_leads_on_column_rename_trigger
      AFTER UPDATE OF name ON %I.kanban_columns
      FOR EACH ROW
      WHEN (OLD.name IS DISTINCT FROM NEW.name)
      EXECUTE FUNCTION public.update_leads_on_column_rename();
  ', schema_name, schema_name);
  
  RAISE LOG 'Added column rename trigger to schema: %', schema_name;
END;
$function$;

-- Adicionar trigger ao esquema do tenant atual
SELECT public.add_column_rename_trigger_to_tenant(public.get_tenant_schema());