
-- Phase 1: Critical Database Security Fixes

-- 1. Add search_path hardening to all database functions
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT parent_user_id FROM public.user_profiles WHERE user_id = auth.uid()),
    auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_tenant_schema()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 'tenant_' || replace(public.get_tenant_id()::text, '-', '_');
$function$;

CREATE OR REPLACE FUNCTION public.is_strict_rls_enabled()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT true;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.can_access_tenant_data(tenant_schema_name text, user_id_to_check uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_tenant_id uuid;
  check_user_id uuid;
BEGIN
  current_tenant_id := public.get_tenant_id();
  check_user_id := COALESCE(user_id_to_check, auth.uid());
  
  RETURN (
    tenant_schema_name = public.get_tenant_schema() AND
    (check_user_id = auth.uid() OR check_user_id = current_tenant_id)
  );
END;
$function$;

-- 2. Consolidate RLS policies - Remove redundant policies and keep only strict ones
-- Drop redundant "Tenant users can access X" policies that always return true

-- For leads table
DROP POLICY IF EXISTS "Tenant users can access leads" ON public.leads;

-- For action_groups table  
DROP POLICY IF EXISTS "Tenant users can access action_groups" ON public.action_groups;

-- For action_types table
DROP POLICY IF EXISTS "Tenant users can access action_types" ON public.action_types;

-- For kanban_columns table
DROP POLICY IF EXISTS "Tenant users can access kanban_columns" ON public.kanban_columns;

-- For lead_sources table  
DROP POLICY IF EXISTS "Tenant users can access lead_sources" ON public.lead_sources;

-- For loss_reasons table
DROP POLICY IF EXISTS "Tenant users can access loss_reasons" ON public.loss_reasons;

-- For lead_status_history table
DROP POLICY IF EXISTS "Tenant users can access lead_status_history" ON public.lead_status_history;

-- For company_info table
DROP POLICY IF EXISTS "Tenant users can access company_info" ON public.company_info;

-- 3. Ensure RLS is enabled on all tenant-related tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loss_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_default_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_purchases ENABLE ROW LEVEL SECURITY;

-- 4. Create enhanced security logging function
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, details jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RAISE LOG 'SECURITY EVENT [%]: User %, Tenant %, Details: %', 
    event_type, 
    COALESCE(auth.uid()::text, 'anonymous'), 
    COALESCE(public.get_tenant_id()::text, 'none'), 
    details;
END;
$function$;

-- 5. Create security validation function for tenant operations
CREATE OR REPLACE FUNCTION public.validate_tenant_operation(operation_name text, target_tenant_schema text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_tenant_schema text;
BEGIN
  current_tenant_schema := public.get_tenant_schema();
  
  -- If target schema is specified, validate it matches current tenant
  IF target_tenant_schema IS NOT NULL AND target_tenant_schema != current_tenant_schema THEN
    PERFORM public.log_security_event('CROSS_TENANT_OPERATION_BLOCKED', 
      jsonb_build_object(
        'operation', operation_name,
        'attempted_schema', target_tenant_schema,
        'current_schema', current_tenant_schema
      )
    );
    RETURN false;
  END IF;
  
  -- Log successful validation
  PERFORM public.log_security_event('TENANT_OPERATION_VALIDATED', 
    jsonb_build_object(
      'operation', operation_name,
      'tenant_schema', current_tenant_schema
    )
  );
  
  RETURN true;
END;
$function$;
