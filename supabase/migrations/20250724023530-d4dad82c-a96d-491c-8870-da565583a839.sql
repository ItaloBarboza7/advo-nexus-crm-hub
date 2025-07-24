
-- Add user_id column to existing tenant schema leads tables and update the ensure_tenant_schema function

-- First, let's create a function to add user_id to existing tenant schemas
CREATE OR REPLACE FUNCTION add_user_id_to_existing_tenant_schemas()
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
  -- Loop through all existing tenant schemas
  FOR tenant_record IN 
    SELECT s.schema_name 
    FROM information_schema.schemata s
    WHERE s.schema_name LIKE 'tenant_%'
  LOOP
    tenant_schema_name := tenant_record.schema_name;
    
    -- Extract the tenant_id from the schema name
    -- tenant_abc_def_ghi -> abc-def-ghi
    tenant_id_value := replace(substring(tenant_schema_name from 8), '_', '-')::uuid;
    
    -- Check if the user_id column already exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = tenant_schema_name 
      AND table_name = 'leads' 
      AND column_name = 'user_id'
    ) INTO column_exists;
    
    -- Add user_id column if it doesn't exist
    IF NOT column_exists THEN
      EXECUTE format('ALTER TABLE %I.leads ADD COLUMN user_id UUID', tenant_schema_name);
      RAISE LOG 'Added user_id column to leads table in schema: %', tenant_schema_name;
    END IF;
    
    -- Update existing leads without user_id to have the tenant_id as user_id
    EXECUTE format('
      UPDATE %I.leads 
      SET user_id = $1
      WHERE user_id IS NULL
    ', tenant_schema_name) USING tenant_id_value;
    
    RAISE LOG 'Updated leads without user_id in schema: % for tenant: %', tenant_schema_name, tenant_id_value;
  END LOOP;
END;
$$;

-- Execute the function to update existing schemas
SELECT add_user_id_to_existing_tenant_schemas();

-- Clean up the function
DROP FUNCTION add_user_id_to_existing_tenant_schemas();

-- Now update the ensure_tenant_schema function to include user_id in future schemas
CREATE OR REPLACE FUNCTION public.ensure_tenant_schema()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  
  -- Add RLS policies to the tenant schema
  PERFORM public.add_rls_policies_to_tenant(tenant_schema_name);
  
  RETURN tenant_schema_name;
END;
$$;
