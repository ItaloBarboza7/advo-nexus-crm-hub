
-- Torna a criação de políticas RLS idempotente para evitar erro de "policy already exists"
CREATE OR REPLACE FUNCTION public.add_rls_policies_to_tenant(schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Leads
  EXECUTE format('ALTER TABLE %I.leads ENABLE ROW LEVEL SECURITY', schema_name);
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = schema_name 
      AND tablename = 'leads' 
      AND policyname = 'Tenant users can access leads'
  ) THEN
    EXECUTE format('
      CREATE POLICY "Tenant users can access leads" ON %I.leads
      FOR ALL
      USING (true)
      WITH CHECK (true)
    ', schema_name);
  END IF;

  -- Kanban columns
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = schema_name AND table_name = 'kanban_columns'
  ) THEN
    EXECUTE format('ALTER TABLE %I.kanban_columns ENABLE ROW LEVEL SECURITY', schema_name);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = schema_name 
        AND tablename = 'kanban_columns' 
        AND policyname = 'Tenant users can access kanban_columns'
    ) THEN
      EXECUTE format('
        CREATE POLICY "Tenant users can access kanban_columns" ON %I.kanban_columns
        FOR ALL
        USING (true)
        WITH CHECK (true)
      ', schema_name);
    END IF;
  END IF;

  -- Action groups
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = schema_name AND table_name = 'action_groups'
  ) THEN
    EXECUTE format('ALTER TABLE %I.action_groups ENABLE ROW LEVEL SECURITY', schema_name);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = schema_name 
        AND tablename = 'action_groups' 
        AND policyname = 'Tenant users can access action_groups'
    ) THEN
      EXECUTE format('
        CREATE POLICY "Tenant users can access action_groups" ON %I.action_groups
        FOR ALL
        USING (true)
        WITH CHECK (true)
      ', schema_name);
    END IF;
  END IF;

  -- Action types
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = schema_name AND table_name = 'action_types'
  ) THEN
    EXECUTE format('ALTER TABLE %I.action_types ENABLE ROW LEVEL SECURITY', schema_name);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = schema_name 
        AND tablename = 'action_types' 
        AND policyname = 'Tenant users can access action_types'
    ) THEN
      EXECUTE format('
        CREATE POLICY "Tenant users can access action_types" ON %I.action_types
        FOR ALL
        USING (true)
        WITH CHECK (true)
      ', schema_name);
    END IF;
  END IF;

  -- Lead sources
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = schema_name AND table_name = 'lead_sources'
  ) THEN
    EXECUTE format('ALTER TABLE %I.lead_sources ENABLE ROW LEVEL SECURITY', schema_name);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = schema_name 
        AND tablename = 'lead_sources' 
        AND policyname = 'Tenant users can access lead_sources'
    ) THEN
      EXECUTE format('
        CREATE POLICY "Tenant users can access lead_sources" ON %I.lead_sources
        FOR ALL
        USING (true)
        WITH CHECK (true)
      ', schema_name);
    END IF;
  END IF;

  -- Loss reasons
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = schema_name AND table_name = 'loss_reasons'
  ) THEN
    EXECUTE format('ALTER TABLE %I.loss_reasons ENABLE ROW LEVEL SECURITY', schema_name);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = schema_name 
        AND tablename = 'loss_reasons' 
        AND policyname = 'Tenant users can access loss_reasons'
    ) THEN
      EXECUTE format('
        CREATE POLICY "Tenant users can access loss_reasons" ON %I.loss_reasons
        FOR ALL
        USING (true)
        WITH CHECK (true)
      ', schema_name);
    END IF;
  END IF;

  -- Lead status history
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = schema_name AND table_name = 'lead_status_history'
  ) THEN
    EXECUTE format('ALTER TABLE %I.lead_status_history ENABLE ROW LEVEL SECURITY', schema_name);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = schema_name 
        AND tablename = 'lead_status_history' 
        AND policyname = 'Tenant users can access lead_status_history'
    ) THEN
      EXECUTE format('
        CREATE POLICY "Tenant users can access lead_status_history" ON %I.lead_status_history
        FOR ALL
        USING (true)
        WITH CHECK (true)
      ', schema_name);
    END IF;
  END IF;

  -- Company info
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = schema_name AND table_name = 'company_info'
  ) THEN
    EXECUTE format('ALTER TABLE %I.company_info ENABLE ROW LEVEL SECURITY', schema_name);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = schema_name 
        AND tablename = 'company_info' 
        AND policyname = 'Tenant users can access company_info'
    ) THEN
      EXECUTE format('
        CREATE POLICY "Tenant users can access company_info" ON %I.company_info
        FOR ALL
        USING (true)
        WITH CHECK (true)
      ', schema_name);
    END IF;
  END IF;
END;
$function$;
