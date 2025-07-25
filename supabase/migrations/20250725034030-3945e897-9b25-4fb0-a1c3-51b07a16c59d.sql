
-- Create secure function to get tenant leads
CREATE OR REPLACE FUNCTION public.get_tenant_leads()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  description TEXT,
  source TEXT,
  state TEXT,
  status TEXT,
  action_group TEXT,
  action_type TEXT,
  loss_reason TEXT,
  value NUMERIC,
  user_id UUID,
  closed_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_schema_name text;
BEGIN
  -- Get the tenant schema name
  tenant_schema_name := public.get_tenant_schema();
  
  -- Return leads from the tenant schema
  RETURN QUERY EXECUTE format('
    SELECT l.id, l.name, l.email, l.phone, l.description, l.source, l.state, 
           l.status, l.action_group, l.action_type, l.loss_reason, l.value, 
           l.user_id, l.closed_by_user_id, l.created_at, l.updated_at
    FROM %I.leads l
    ORDER BY l.created_at DESC
  ', tenant_schema_name);
END;
$$;

-- Create secure function to create tenant lead
CREATE OR REPLACE FUNCTION public.create_tenant_lead(
  p_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT,
  p_description TEXT DEFAULT NULL,
  p_source TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_action_group TEXT DEFAULT NULL,
  p_action_type TEXT DEFAULT NULL,
  p_value NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_schema_name text;
  new_lead_id UUID;
BEGIN
  -- Get the tenant schema name
  tenant_schema_name := public.get_tenant_schema();
  
  -- Ensure tenant schema exists
  PERFORM public.ensure_tenant_schema();
  
  -- Insert the new lead and return the ID
  EXECUTE format('
    INSERT INTO %I.leads (name, email, phone, description, source, state, action_group, action_type, value, user_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
  ', tenant_schema_name) 
  USING p_name, p_email, p_phone, p_description, p_source, p_state, p_action_group, p_action_type, p_value, auth.uid()
  INTO new_lead_id;
  
  RETURN new_lead_id;
END;
$$;

-- Create secure function to update tenant lead
CREATE OR REPLACE FUNCTION public.update_tenant_lead(
  p_lead_id UUID,
  p_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT,
  p_state TEXT DEFAULT NULL,
  p_source TEXT DEFAULT NULL,
  p_status TEXT,
  p_action_group TEXT DEFAULT NULL,
  p_action_type TEXT DEFAULT NULL,
  p_value NUMERIC DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_loss_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_schema_name text;
  rows_affected INTEGER;
BEGIN
  -- Get the tenant schema name
  tenant_schema_name := public.get_tenant_schema();
  
  -- Update the lead
  EXECUTE format('
    UPDATE %I.leads 
    SET name = $2, email = $3, phone = $4, state = $5, source = $6, 
        status = $7, action_group = $8, action_type = $9, value = $10, 
        description = $11, loss_reason = $12, updated_at = now()
    WHERE id = $1
  ', tenant_schema_name)
  USING p_lead_id, p_name, p_email, p_phone, p_state, p_source, p_status, 
        p_action_group, p_action_type, p_value, p_description, p_loss_reason;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  RETURN rows_affected > 0;
END;
$$;

-- Create secure function to get tenant kanban columns
CREATE OR REPLACE FUNCTION public.get_tenant_kanban_columns()
RETURNS TABLE (
  id UUID,
  name TEXT,
  color TEXT,
  order_position INTEGER,
  is_default BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_schema_name text;
BEGIN
  -- Get the tenant schema name
  tenant_schema_name := public.get_tenant_schema();
  
  -- Ensure tenant schema exists
  PERFORM public.ensure_tenant_schema();
  
  -- Return kanban columns from the tenant schema
  RETURN QUERY EXECUTE format('
    SELECT k.id, k.name, k.color, k.order_position, k.is_default, k.created_at, k.updated_at
    FROM %I.kanban_columns k
    ORDER BY k.order_position
  ', tenant_schema_name);
END;
$$;
