
-- Create the secure tenant functions that are missing

-- Function to get tenant leads
CREATE OR REPLACE FUNCTION public.get_tenant_leads()
RETURNS TABLE(
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
  tenant_schema_name := public.get_tenant_schema();
  
  -- Ensure tenant schema exists
  PERFORM public.ensure_tenant_schema();
  
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

-- Function to create tenant lead
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
  tenant_schema_name := public.get_tenant_schema();
  
  -- Ensure tenant schema exists
  PERFORM public.ensure_tenant_schema();
  
  -- Create lead in tenant schema
  EXECUTE format('
    INSERT INTO %I.leads (name, email, phone, description, source, state, action_group, action_type, value, user_id)
    VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, ''Outros''), $8, $9, $10)
    RETURNING id
  ', tenant_schema_name) 
  USING p_name, p_email, p_phone, p_description, p_source, p_state, p_action_group, p_action_type, p_value, public.get_tenant_id()
  INTO new_lead_id;
  
  RETURN new_lead_id;
END;
$$;

-- Function to update tenant lead
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
  tenant_schema_name := public.get_tenant_schema();
  
  -- Ensure tenant schema exists
  PERFORM public.ensure_tenant_schema();
  
  -- Update lead in tenant schema
  EXECUTE format('
    UPDATE %I.leads 
    SET name = $1, email = $2, phone = $3, state = $4, source = $5, 
        status = $6, action_group = COALESCE($7, ''Outros''), action_type = $8, 
        value = $9, description = $10, loss_reason = $11, updated_at = now()
    WHERE id = $12
  ', tenant_schema_name) 
  USING p_name, p_email, p_phone, p_state, p_source, p_status, p_action_group, p_action_type, p_value, p_description, p_loss_reason, p_lead_id;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  RETURN rows_affected > 0;
END;
$$;

-- Function to get tenant kanban columns
CREATE OR REPLACE FUNCTION public.get_tenant_kanban_columns()
RETURNS TABLE(
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
  tenant_schema_name := public.get_tenant_schema();
  
  -- Ensure tenant schema exists
  PERFORM public.ensure_tenant_schema();
  
  -- Return kanban columns from tenant schema
  RETURN QUERY EXECUTE format('
    SELECT kc.id, kc.name, kc.color, kc.order_position, kc.is_default, kc.created_at, kc.updated_at
    FROM %I.kanban_columns kc
    ORDER BY kc.order_position
  ', tenant_schema_name);
END;
$$;
