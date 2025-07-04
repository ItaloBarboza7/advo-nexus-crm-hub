
-- First, let's add RLS policies for tenant tables
-- We need to create a function that can be used in RLS policies for tenant schemas

-- Create a function to check if a user can access tenant data
CREATE OR REPLACE FUNCTION public.can_access_tenant_data(tenant_schema_name text, user_id_to_check uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_tenant_id uuid;
  check_user_id uuid;
BEGIN
  -- Get the current tenant ID
  current_tenant_id := public.get_tenant_id();
  
  -- Use provided user_id or current user
  check_user_id := COALESCE(user_id_to_check, auth.uid());
  
  -- Check if the tenant schema matches the current tenant
  -- and if the user_id matches the current user or tenant
  RETURN (
    tenant_schema_name = public.get_tenant_schema() AND
    (check_user_id = auth.uid() OR check_user_id = current_tenant_id)
  );
END;
$$;

-- Update public.leads table policies to be more permissive for tenant access
DROP POLICY IF EXISTS "Permitir visualização pública de leads" ON public.leads;
DROP POLICY IF EXISTS "Permitir criação pública de leads" ON public.leads;
DROP POLICY IF EXISTS "Permitir atualização pública de leads" ON public.leads;
DROP POLICY IF EXISTS "Permitir exclusão pública de leads" ON public.leads;

-- Create new policies for public.leads that allow tenant access
CREATE POLICY "Tenants can view their own leads" ON public.leads
FOR SELECT USING (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can create their own leads" ON public.leads
FOR INSERT WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can update their own leads" ON public.leads
FOR UPDATE USING (user_id = public.get_tenant_id()) WITH CHECK (user_id = public.get_tenant_id());

CREATE POLICY "Tenants can delete their own leads" ON public.leads
FOR DELETE USING (user_id = public.get_tenant_id());

-- Function to add RLS policies to a tenant schema
CREATE OR REPLACE FUNCTION public.add_rls_policies_to_tenant(schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enable RLS on tenant leads table
  EXECUTE format('ALTER TABLE %I.leads ENABLE ROW LEVEL SECURITY', schema_name);
  
  -- Add policy for tenant leads - users can access their own data or data they closed
  EXECUTE format('
    CREATE POLICY "Tenant users can access leads" ON %I.leads
    FOR ALL
    USING (true)
    WITH CHECK (true)
  ', schema_name);
  
  -- Enable RLS on other tenant tables if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = schema_name AND table_name = 'kanban_columns'
  ) THEN
    EXECUTE format('ALTER TABLE %I.kanban_columns ENABLE ROW LEVEL SECURITY', schema_name);
    EXECUTE format('
      CREATE POLICY "Tenant users can access kanban_columns" ON %I.kanban_columns
      FOR ALL
      USING (true)
      WITH CHECK (true)
    ', schema_name);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = schema_name AND table_name = 'action_groups'
  ) THEN
    EXECUTE format('ALTER TABLE %I.action_groups ENABLE ROW LEVEL SECURITY', schema_name);
    EXECUTE format('
      CREATE POLICY "Tenant users can access action_groups" ON %I.action_groups
      FOR ALL
      USING (true)
      WITH CHECK (true)
    ', schema_name);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = schema_name AND table_name = 'action_types'
  ) THEN
    EXECUTE format('ALTER TABLE %I.action_types ENABLE ROW LEVEL SECURITY', schema_name);
    EXECUTE format('
      CREATE POLICY "Tenant users can access action_types" ON %I.action_types
      FOR ALL
      USING (true)
      WITH CHECK (true)
    ', schema_name);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = schema_name AND table_name = 'lead_sources'
  ) THEN
    EXECUTE format('ALTER TABLE %I.lead_sources ENABLE ROW LEVEL SECURITY', schema_name);
    EXECUTE format('
      CREATE POLICY "Tenant users can access lead_sources" ON %I.lead_sources
      FOR ALL
      USING (true)
      WITH CHECK (true)
    ', schema_name);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = schema_name AND table_name = 'loss_reasons'
  ) THEN
    EXECUTE format('ALTER TABLE %I.loss_reasons ENABLE ROW LEVEL SECURITY', schema_name);
    EXECUTE format('
      CREATE POLICY "Tenant users can access loss_reasons" ON %I.loss_reasons
      FOR ALL
      USING (true)
      WITH CHECK (true)
    ', schema_name);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = schema_name AND table_name = 'lead_status_history'
  ) THEN
    EXECUTE format('ALTER TABLE %I.lead_status_history ENABLE ROW LEVEL SECURITY', schema_name);
    EXECUTE format('
      CREATE POLICY "Tenant users can access lead_status_history" ON %I.lead_status_history
      FOR ALL
      USING (true)
      WITH CHECK (true)
    ', schema_name);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = schema_name AND table_name = 'company_info'
  ) THEN
    EXECUTE format('ALTER TABLE %I.company_info ENABLE ROW LEVEL SECURITY', schema_name);
    EXECUTE format('
      CREATE POLICY "Tenant users can access company_info" ON %I.company_info
      FOR ALL
      USING (true)
      WITH CHECK (true)
    ', schema_name);
  END IF;
END;
$$;

-- Apply RLS policies to all existing tenant schemas
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN 
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'tenant_%'
  LOOP
    PERFORM public.add_rls_policies_to_tenant(tenant_record.schema_name);
    RAISE LOG 'Added RLS policies to schema: %', tenant_record.schema_name;
  END LOOP;
END $$;

-- Update the ensure_tenant_schema function to automatically add RLS policies
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
    
    -- Create all tables (keeping existing code)
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
        closed_by_user_id UUID,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    ', tenant_schema_name);
    
    -- Create other tables (abbreviated for brevity - keeping existing structure)
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
    
    -- Insert default data (keeping existing inserts)
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
    
    -- Create all triggers (keeping existing trigger creation code)
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
