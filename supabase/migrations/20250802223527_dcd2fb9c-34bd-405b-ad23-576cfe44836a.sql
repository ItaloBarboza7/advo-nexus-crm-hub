
-- 1. Criar função para sincronizar leads quando uma coluna é renomeada no esquema do tenant
CREATE OR REPLACE FUNCTION public.sync_leads_on_tenant_column_rename()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  tenant_schema_name text;
  affected_leads_count integer := 0;
BEGIN
  -- Só executa se o nome da coluna mudou
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    -- Obter o nome do esquema do tenant
    tenant_schema_name := public.get_tenant_schema();
    
    -- Log da operação de rename
    RAISE LOG 'Column renamed in schema %: % -> %', tenant_schema_name, OLD.name, NEW.name;
    
    -- Atualizar todos os leads que tinham o status antigo para o novo status
    EXECUTE format('
      UPDATE %I.leads 
      SET status = $2, updated_at = now() 
      WHERE status = $1
    ', tenant_schema_name) USING OLD.name, NEW.name;
    
    GET DIAGNOSTICS affected_leads_count = ROW_COUNT;
    
    -- Log do resultado
    RAISE LOG 'Updated % leads from status "%" to "%"', affected_leads_count, OLD.name, NEW.name;
    
    -- Inserir histórico para cada lead afetado
    IF affected_leads_count > 0 THEN
      EXECUTE format('
        INSERT INTO %I.lead_status_history (lead_id, old_status, new_status)
        SELECT id, $1, $2 FROM %I.leads WHERE status = $2
      ', tenant_schema_name, tenant_schema_name) USING OLD.name, NEW.name;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Criar função para corrigir leads órfãos existentes
CREATE OR REPLACE FUNCTION public.fix_orphaned_leads_in_tenant(schema_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  orphaned_leads_count integer := 0;
  fixed_leads jsonb := '[]'::jsonb;
  lead_record record;
BEGIN
  -- Buscar e corrigir leads órfãos
  FOR lead_record IN 
    EXECUTE format('
      SELECT l.id, l.name, l.status
      FROM %I.leads l
      LEFT JOIN %I.kanban_columns kc ON l.status = kc.name
      WHERE kc.name IS NULL
    ', schema_name, schema_name)
  LOOP
    -- Mover para "Novo" (primeira coluna por ordem)
    EXECUTE format('
      UPDATE %I.leads 
      SET status = (
        SELECT name FROM %I.kanban_columns 
        WHERE order_position = 1 
        LIMIT 1
      ), updated_at = now()
      WHERE id = $1
    ', schema_name, schema_name) USING lead_record.id;
    
    -- Adicionar ao histórico
    EXECUTE format('
      INSERT INTO %I.lead_status_history (lead_id, old_status, new_status)
      VALUES ($1, $2, (SELECT name FROM %I.kanban_columns WHERE order_position = 1 LIMIT 1))
    ', schema_name, schema_name) USING lead_record.id, lead_record.status;
    
    -- Adicionar ao resultado
    fixed_leads := fixed_leads || jsonb_build_object(
      'id', lead_record.id,
      'name', lead_record.name,
      'old_status', lead_record.status,
      'new_status', 'Novo'
    );
    
    orphaned_leads_count := orphaned_leads_count + 1;
    
    RAISE LOG 'Fixed orphaned lead: % (%) - % -> Novo', lead_record.name, lead_record.id, lead_record.status;
  END LOOP;
  
  RETURN jsonb_build_object(
    'fixed_count', orphaned_leads_count,
    'fixed_leads', fixed_leads
  );
END;
$function$;

-- 3. Aplicar trigger em todos os esquemas de tenant existentes
DO $$
DECLARE
  tenant_record record;
BEGIN
  -- Buscar todos os esquemas de tenant
  FOR tenant_record IN 
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'tenant_%'
  LOOP
    -- Remover trigger existente se houver
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS sync_leads_on_column_rename_trigger ON %I.kanban_columns', tenant_record.schema_name);
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Could not drop trigger on %: %', tenant_record.schema_name, SQLERRM;
    END;
    
    -- Criar novo trigger
    EXECUTE format('
      CREATE TRIGGER sync_leads_on_column_rename_trigger
        AFTER UPDATE ON %I.kanban_columns
        FOR EACH ROW
        EXECUTE FUNCTION public.sync_leads_on_tenant_column_rename();
    ', tenant_record.schema_name);
    
    RAISE LOG 'Created sync trigger for schema: %', tenant_record.schema_name;
  END LOOP;
END $$;

-- 4. Corrigir leads órfãos no esquema atual do tenant
SELECT public.fix_orphaned_leads_in_tenant('tenant_02d1e863_c22f_4568_8f17_c84b838e7e60');

-- 5. Atualizar função ensure_tenant_schema para incluir o trigger em novos esquemas
CREATE OR REPLACE FUNCTION public.ensure_tenant_schema()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  tenant_schema_name text;
BEGIN
  tenant_schema_name := public.get_tenant_schema();
  
  -- Create the schema if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schemata.schema_name = tenant_schema_name
  ) THEN
    EXECUTE format('CREATE SCHEMA %I', tenant_schema_name);
    
    -- Create leads table with user_id field included
    EXECUTE format('
      CREATE TABLE %I.leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT NOT NULL,
        description TEXT,
        source TEXT,
        state TEXT,
        status TEXT NOT NULL DEFAULT ''Novo'',
        action_group TEXT,
        action_type TEXT,
        loss_reason TEXT,
        value NUMERIC,
        user_id UUID,
        closed_by_user_id UUID,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    ', tenant_schema_name);
    
    -- Create other tables (keeping existing structure)
    EXECUTE format('
      CREATE TABLE %I.kanban_columns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        order_position INTEGER NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    ', tenant_schema_name);
    
    EXECUTE format('
      CREATE TABLE %I.action_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    ', tenant_schema_name);
    
    EXECUTE format('
      CREATE TABLE %I.action_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        action_group_id UUID,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    ', tenant_schema_name);
    
    EXECUTE format('
      CREATE TABLE %I.lead_sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        label TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    ', tenant_schema_name);
    
    EXECUTE format('
      CREATE TABLE %I.loss_reasons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reason TEXT NOT NULL,
        is_fixed BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    ', tenant_schema_name);
    
    EXECUTE format('
      CREATE TABLE %I.lead_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID NOT NULL,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    ', tenant_schema_name);
    
    EXECUTE format('
      CREATE TABLE %I.company_info (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name TEXT NOT NULL,
        cnpj TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    ', tenant_schema_name);
    
    -- Insert default data
    EXECUTE format('
      INSERT INTO %I.kanban_columns (name, color, order_position, is_default) VALUES
      (''Novo'', ''bg-blue-100 text-blue-800'', 1, true),
      (''Proposta'', ''bg-yellow-100 text-yellow-800'', 2, true),
      (''Reunião'', ''bg-purple-100 text-purple-800'', 3, true),
      (''Contrato Fechado'', ''bg-green-100 text-green-800'', 4, true),
      (''Perdido'', ''bg-red-100 text-red-800'', 5, true),
      (''Finalizado'', ''bg-gray-100 text-gray-800'', 6, true);
    ', tenant_schema_name);
    
    EXECUTE format('
      INSERT INTO %I.action_groups (name, description) VALUES
      (''Outros'', ''Grupo padrão para ações não categorizadas'');
    ', tenant_schema_name);
    
    EXECUTE format('
      INSERT INTO %I.loss_reasons (reason) VALUES
      (''Preço alto''),
      (''Sem interesse''),
      (''Concorrência''),
      (''Timing inadequado''),
      (''Sem orçamento''),
      (''Outros'');
    ', tenant_schema_name);
    
    EXECUTE format('
      INSERT INTO %I.lead_sources (name, label) VALUES
      (''website'', ''Website''),
      (''referral'', ''Indicação''),
      (''social_media'', ''Redes Sociais''),
      (''phone'', ''Telefone''),
      (''email'', ''Email''),
      (''event'', ''Evento''),
      (''others'', ''Outros'');
    ', tenant_schema_name);
    
    -- Create all triggers
    EXECUTE format('
      CREATE TRIGGER update_leads_updated_at
        BEFORE UPDATE ON %I.leads
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    ', tenant_schema_name);
    
    EXECUTE format('
      CREATE TRIGGER update_kanban_columns_updated_at
        BEFORE UPDATE ON %I.kanban_columns
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    ', tenant_schema_name);
    
    EXECUTE format('
      CREATE TRIGGER update_action_groups_updated_at
        BEFORE UPDATE ON %I.action_groups
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    ', tenant_schema_name);
    
    EXECUTE format('
      CREATE TRIGGER update_action_types_updated_at
        BEFORE UPDATE ON %I.action_types
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    ', tenant_schema_name);
    
    EXECUTE format('
      CREATE TRIGGER update_lead_sources_updated_at
        BEFORE UPDATE ON %I.lead_sources
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    ', tenant_schema_name);
    
    EXECUTE format('
      CREATE TRIGGER update_loss_reasons_updated_at
        BEFORE UPDATE ON %I.loss_reasons
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    ', tenant_schema_name);
    
    EXECUTE format('
      CREATE TRIGGER update_company_info_updated_at
        BEFORE UPDATE ON %I.company_info
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    ', tenant_schema_name);
    
    EXECUTE format('
      CREATE TRIGGER track_lead_status_changes_trigger
        AFTER UPDATE ON %I.leads
        FOR EACH ROW
        EXECUTE FUNCTION public.track_lead_status_changes_tenant();
    ', tenant_schema_name);
    
    EXECUTE format('
      CREATE TRIGGER move_leads_on_column_delete_trigger
        BEFORE DELETE ON %I.kanban_columns
        FOR EACH ROW
        EXECUTE FUNCTION public.move_leads_to_finalizado_on_tenant_column_delete();
    ', tenant_schema_name);
  END IF;
  
  -- Ensure user_id column exists in existing schemas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = tenant_schema_name 
    AND table_name = 'leads' 
    AND column_name = 'user_id'
  ) THEN
    EXECUTE format('ALTER TABLE %I.leads ADD COLUMN user_id UUID', tenant_schema_name);
  END IF;
  
  -- Ensure closed_by_user_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = tenant_schema_name 
    AND table_name = 'leads' 
    AND column_name = 'closed_by_user_id'
  ) THEN
    EXECUTE format('ALTER TABLE %I.leads ADD COLUMN closed_by_user_id UUID', tenant_schema_name);
  END IF;
  
  -- Create or update tenant-specific functions and triggers
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.track_contract_closure_tenant()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $func$
    BEGIN
      IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = ''Contrato Fechado'' THEN
        NEW.closed_by_user_id := auth.uid();
      END IF;
      RETURN NEW;
    END;
    $func$;
  ', tenant_schema_name);
  
  -- Ensure triggers exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_schema = tenant_schema_name 
    AND trigger_name = 'track_contract_closure_trigger'
  ) THEN
    EXECUTE format('
      CREATE TRIGGER track_contract_closure_trigger
        BEFORE UPDATE ON %I.leads
        FOR EACH ROW
        EXECUTE FUNCTION %I.track_contract_closure_tenant();
    ', tenant_schema_name, tenant_schema_name);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_schema = tenant_schema_name 
    AND trigger_name = 'move_leads_on_column_delete_trigger'
  ) THEN
    EXECUTE format('
      CREATE TRIGGER move_leads_on_column_delete_trigger
        BEFORE DELETE ON %I.kanban_columns
        FOR EACH ROW
        EXECUTE FUNCTION public.move_leads_to_finalizado_on_tenant_column_delete();
    ', tenant_schema_name);
  END IF;
  
  -- Ensure sync trigger exists for column renames
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_schema = tenant_schema_name 
    AND trigger_name = 'sync_leads_on_column_rename_trigger'
  ) THEN
    EXECUTE format('
      CREATE TRIGGER sync_leads_on_column_rename_trigger
        AFTER UPDATE ON %I.kanban_columns
        FOR EACH ROW
        EXECUTE FUNCTION public.sync_leads_on_tenant_column_rename();
    ', tenant_schema_name);
  END IF;
  
  -- Add RLS policies to the tenant schema
  PERFORM public.add_rls_policies_to_tenant(tenant_schema_name);
  
  RETURN tenant_schema_name;
END;
$function$;
