
-- Create the missing RPC functions for secure tenant data access

-- Function to get tenant leads securely
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
  -- Get the tenant schema name
  tenant_schema_name := public.get_tenant_schema();
  
  -- Check if tenant schema exists and has leads table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = tenant_schema_name AND table_name = 'leads'
  ) THEN
    -- Ensure tenant schema exists
    PERFORM public.ensure_tenant_schema();
  END IF;
  
  -- Return leads from tenant schema
  RETURN QUERY EXECUTE format('
    SELECT l.id, l.name, l.email, l.phone, l.description, l.source, l.state, 
           l.status, l.action_group, l.action_type, l.loss_reason, l.value,
           l.user_id, l.closed_by_user_id, l.created_at, l.updated_at
    FROM %I.leads l
    ORDER BY l.created_at DESC
  ', tenant_schema_name);
END;
$$;

-- Function to get tenant kanban columns securely
CREATE OR REPLACE FUNCTION public.get_tenant_kanban_columns()
RETURNS TABLE(
  id uuid,
  name text,
  color text,
  order_position integer,
  is_default boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_schema_name text;
BEGIN
  -- Get the tenant schema name
  tenant_schema_name := public.get_tenant_schema();
  
  -- Check if tenant schema exists and has kanban_columns table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = tenant_schema_name AND table_name = 'kanban_columns'
  ) THEN
    -- Ensure tenant schema exists
    PERFORM public.ensure_tenant_schema();
  END IF;
  
  -- Return kanban columns from tenant schema
  RETURN QUERY EXECUTE format('
    SELECT kc.id, kc.name, kc.color, kc.order_position, kc.is_default,
           kc.created_at, kc.updated_at
    FROM %I.kanban_columns kc
    ORDER BY kc.order_position
  ', tenant_schema_name);
END;
$$;

-- Function to create tenant lead securely
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
  new_lead_id uuid;
BEGIN
  -- Get the tenant schema name
  tenant_schema_name := public.get_tenant_schema();
  
  -- Ensure tenant schema exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = tenant_schema_name AND table_name = 'leads'
  ) THEN
    PERFORM public.ensure_tenant_schema();
  END IF;
  
  -- Insert new lead into tenant schema
  EXECUTE format('
    INSERT INTO %I.leads (name, email, phone, description, source, state, status, action_group, action_type, value, user_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id
  ', tenant_schema_name) 
  USING p_name, p_email, p_phone, p_description, p_source, p_state, 'Novo', 
        COALESCE(p_action_group, 'Outros'), p_action_type, p_value, auth.uid()
  INTO new_lead_id;
  
  RETURN new_lead_id;
END;
$$;

-- Function to update tenant lead securely
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
  rows_affected integer;
BEGIN
  -- Get the tenant schema name
  tenant_schema_name := public.get_tenant_schema();
  
  -- Update lead in tenant schema
  EXECUTE format('
    UPDATE %I.leads 
    SET name = $2, email = $3, phone = $4, state = $5, source = $6, 
        status = $7, action_group = $8, action_type = $9, value = $10,
        description = $11, loss_reason = $12, updated_at = now()
    WHERE id = $1
  ', tenant_schema_name)
  USING p_lead_id, p_name, p_email, p_phone, p_state, p_source, p_status,
        COALESCE(p_action_group, 'Outros'), p_action_type, p_value, p_description, p_loss_reason;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  RETURN rows_affected > 0;
END;
$$;
