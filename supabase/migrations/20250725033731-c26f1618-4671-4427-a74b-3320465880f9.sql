
-- Phase 1: Fix SQL Injection by removing exec_sql function and securing database access
-- Phase 2: Enable RLS on all tables that have policies but RLS disabled

-- First, let's enable RLS on all tables that have policies but RLS is currently disabled
ALTER TABLE public.action_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loss_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;

-- Remove the dangerous exec_sql function that allows arbitrary SQL execution
DROP FUNCTION IF EXISTS public.exec_sql(text);

-- Create secure parameterized functions for tenant operations
CREATE OR REPLACE FUNCTION public.get_tenant_leads()
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  phone text,
  description text,
  source text,
  state text,
  status text,
  action_group text,
  action_type text,
  loss_reason text,
  value numeric,
  user_id uuid,
  closed_by_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_schema_name text;
BEGIN
  tenant_schema_name := public.get_tenant_schema();
  
  RETURN QUERY EXECUTE format('
    SELECT l.id, l.name, l.email, l.phone, l.description, l.source, l.state, 
           l.status, l.action_group, l.action_type, l.loss_reason, l.value,
           l.user_id, l.closed_by_user_id, l.created_at, l.updated_at
    FROM %I.leads l
    ORDER BY l.created_at DESC
  ', tenant_schema_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_tenant_lead(
  p_name text,
  p_email text DEFAULT NULL,
  p_phone text,
  p_description text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_action_group text DEFAULT NULL,
  p_action_type text DEFAULT NULL,
  p_value numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_schema_name text;
  lead_id uuid;
  current_user_id uuid;
BEGIN
  -- Verify user is authenticated
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  tenant_schema_name := public.get_tenant_schema();
  
  EXECUTE format('
    INSERT INTO %I.leads (name, email, phone, description, source, state, action_group, action_type, value, user_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
  ', tenant_schema_name) 
  USING p_name, p_email, p_phone, p_description, p_source, p_state, p_action_group, p_action_type, p_value, current_user_id
  INTO lead_id;
  
  RETURN lead_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_tenant_lead(
  p_lead_id uuid,
  p_name text,
  p_email text DEFAULT NULL,
  p_phone text,
  p_state text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_status text,
  p_action_group text DEFAULT NULL,
  p_action_type text DEFAULT NULL,
  p_value numeric DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_loss_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_schema_name text;
  current_user_id uuid;
  old_status text;
  tenant_id uuid;
BEGIN
  -- Verify user is authenticated
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  tenant_schema_name := public.get_tenant_schema();
  tenant_id := public.get_tenant_id();
  
  -- Get current status for history tracking
  EXECUTE format('SELECT status FROM %I.leads WHERE id = $1', tenant_schema_name) 
  USING p_lead_id INTO old_status;
  
  -- Update the lead
  EXECUTE format('
    UPDATE %I.leads 
    SET name = $1, email = $2, phone = $3, state = $4, source = $5, status = $6,
        action_group = $7, action_type = $8, value = $9, description = $10,
        loss_reason = $11, updated_at = now(),
        closed_by_user_id = CASE WHEN $6 = ''Contrato Fechado'' THEN $12 ELSE closed_by_user_id END
    WHERE id = $13
  ', tenant_schema_name) 
  USING p_name, p_email, p_phone, p_state, p_source, p_status, p_action_group, p_action_type, p_value, p_description, p_loss_reason, current_user_id, p_lead_id;
  
  -- Record status change in history if status changed
  IF old_status IS DISTINCT FROM p_status THEN
    EXECUTE format('
      INSERT INTO %I.lead_status_history (lead_id, old_status, new_status, changed_at)
      VALUES ($1, $2, $3, now())
    ', tenant_schema_name) 
    USING p_lead_id, old_status, p_status;
    
    -- Record contract closure globally if applicable
    IF p_status = 'Contrato Fechado' THEN
      INSERT INTO public.contract_closures (lead_id, closed_by_user_id, tenant_id, closed_at)
      VALUES (p_lead_id, current_user_id, tenant_id, now())
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_kanban_columns()
RETURNS TABLE(
  id uuid,
  name text,
  color text,
  order_position integer,
  is_default boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_schema_name text;
BEGIN
  tenant_schema_name := public.get_tenant_schema();
  
  RETURN QUERY EXECUTE format('
    SELECT kc.id, kc.name, kc.color, kc.order_position, kc.is_default
    FROM %I.kanban_columns kc
    ORDER BY kc.order_position ASC
  ', tenant_schema_name);
END;
$$;

-- Fix search_path security issues in existing functions
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT parent_user_id FROM public.user_profiles WHERE user_id = auth.uid()),
    auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_schema()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'tenant_' || replace(public.get_tenant_id()::text, '-', '_');
$$;

-- Update other security definer functions to have proper search_path
CREATE OR REPLACE FUNCTION public.ensure_tenant_schema()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
        user_id UUID NOT NULL,
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
    
    -- Insert default data with proper security
    EXECUTE format('
      INSERT INTO %I.kanban_columns (name, color, order_position, is_default) VALUES
      (''Novo'', ''bg-blue-100 text-blue-800'', 1, true),
      (''Proposta'', ''bg-yellow-100 text-yellow-800'', 2, true),
      (''Reunião'', ''bg-purple-100 text-purple-800'', 3, true),
      (''Contrato Fechado'', ''bg-green-100 text-green-800'', 4, true),
      (''Perdido'', ''bg-red-100 text-red-800'', 5, true),
      (''Finalizado'', ''bg-gray-100 text-gray-800'', 6, true);
    ', tenant_schema_name);
    
    -- Add RLS policies to the tenant schema
    PERFORM public.add_rls_policies_to_tenant(tenant_schema_name);
  END IF;
  
  RETURN tenant_schema_name;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_tenant_leads() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tenant_lead(text, text, text, text, text, text, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_tenant_lead(uuid, text, text, text, text, text, text, text, text, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_kanban_columns() TO authenticated;
