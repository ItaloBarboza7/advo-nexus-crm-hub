
-- Atualizar a função ensure_tenant_schema para usar lock advisory e evitar conflitos de concorrência
CREATE OR REPLACE FUNCTION public.ensure_tenant_schema()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  tenant_schema_name text;
  tenant_id_val uuid;
  lock_key bigint;
BEGIN
  -- Get tenant ID and schema name
  tenant_id_val := public.get_tenant_id();
  tenant_schema_name := public.get_tenant_schema();
  
  -- Create a lock key based on tenant ID (convert UUID to bigint for advisory lock)
  lock_key := ('x' || substr(replace(tenant_id_val::text, '-', ''), 1, 15))::bit(60)::bigint;
  
  -- Acquire advisory lock to prevent concurrent schema creation for same tenant
  PERFORM pg_advisory_xact_lock(lock_key);
  
  -- Check if schema already exists (double-check after acquiring lock)
  IF EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schemata.schema_name = tenant_schema_name
  ) THEN
    -- Schema exists, just ensure completed_followups table
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = tenant_schema_name 
      AND table_name = 'completed_followups'
    ) THEN
      EXECUTE format('
        CREATE TABLE %I.completed_followups (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lead_id UUID NOT NULL,
          user_id UUID NOT NULL,
          lead_status_at_completion TEXT NOT NULL,
          completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          UNIQUE(lead_id, user_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_completed_followups_lead_user 
        ON %I.completed_followups(lead_id, user_id);
        
        CREATE INDEX IF NOT EXISTS idx_completed_followups_completed_at 
        ON %I.completed_followups(completed_at);
      ', tenant_schema_name, tenant_schema_name, tenant_schema_name);
    END IF;
    
    RETURN tenant_schema_name;
  END IF;
  
  -- Create the schema if it doesn't exist
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
  
  -- Create completed_followups table
  EXECUTE format('
    CREATE TABLE %I.completed_followups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID NOT NULL,
      user_id UUID NOT NULL,
      lead_status_at_completion TEXT NOT NULL,
      completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      UNIQUE(lead_id, user_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_completed_followups_lead_user 
    ON %I.completed_followups(lead_id, user_id);
    
    CREATE INDEX IF NOT EXISTS idx_completed_followups_completed_at 
    ON %I.completed_followups(completed_at);
  ', tenant_schema_name, tenant_schema_name, tenant_schema_name);
  
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
  
  -- Create tenant-specific functions and triggers
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
  
  -- Create tenant-specific function for updating leads on column rename
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
  ', tenant_schema_name, tenant_schema_name, tenant_schema_name);
  
  -- Ensure triggers exist
  EXECUTE format('
    CREATE TRIGGER track_contract_closure_trigger
      BEFORE UPDATE ON %I.leads
      FOR EACH ROW
      EXECUTE FUNCTION %I.track_contract_closure_tenant();
  ', tenant_schema_name, tenant_schema_name);
  
  EXECUTE format('
    CREATE TRIGGER update_leads_on_column_rename_trigger
      AFTER UPDATE OF name ON %I.kanban_columns
      FOR EACH ROW
      WHEN (OLD.name IS DISTINCT FROM NEW.name)
      EXECUTE FUNCTION %I.update_leads_on_column_rename_tenant();
  ', tenant_schema_name, tenant_schema_name);
  
  -- Add RLS policies to the tenant schema
  PERFORM public.add_rls_policies_to_tenant(tenant_schema_name);
  
  RETURN tenant_schema_name;
END;
$function$;
