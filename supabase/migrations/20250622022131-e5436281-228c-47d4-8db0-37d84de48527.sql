
-- Adicionar coluna closed_by_user_id na tabela leads do esquema público
ALTER TABLE public.leads 
ADD COLUMN closed_by_user_id UUID;

-- Criar função para rastrear quem fechou o contrato
CREATE OR REPLACE FUNCTION public.track_contract_closure()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se o status mudou para "Contrato Fechado", registrar quem fez a mudança
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Contrato Fechado' THEN
    NEW.closed_by_user_id := public.get_tenant_id();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para capturar fechamento de contratos na tabela principal
CREATE TRIGGER track_contract_closure_trigger
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.track_contract_closure();

-- Função para aplicar mudanças nos esquemas de tenant
CREATE OR REPLACE FUNCTION public.add_closed_by_tracking_to_tenant(schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Adicionar coluna closed_by_user_id no esquema do tenant
  EXECUTE format('ALTER TABLE %I.leads ADD COLUMN IF NOT EXISTS closed_by_user_id UUID', schema_name);
  
  -- Criar função específica do tenant para rastrear fechamento
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.track_contract_closure_tenant()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $func$
    BEGIN
      -- Se o status mudou para "Contrato Fechado", registrar quem fez a mudança
      IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = ''Contrato Fechado'' THEN
        NEW.closed_by_user_id := public.get_tenant_id();
      END IF;
      
      RETURN NEW;
    END;
    $func$;
  ', schema_name);
  
  -- Criar trigger no esquema do tenant
  EXECUTE format('
    DROP TRIGGER IF EXISTS track_contract_closure_trigger ON %I.leads;
    CREATE TRIGGER track_contract_closure_trigger
      BEFORE UPDATE ON %I.leads
      FOR EACH ROW
      EXECUTE FUNCTION %I.track_contract_closure_tenant();
  ', schema_name, schema_name, schema_name);
END;
$$;

-- Atualizar a função ensure_tenant_schema para incluir o novo campo e trigger
CREATE OR REPLACE FUNCTION public.ensure_tenant_schema()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_schema_name text;
BEGIN
  tenant_schema_name := public.get_tenant_schema();
  
  -- Criar o esquema se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schemata.schema_name = tenant_schema_name
  ) THEN
    EXECUTE format('CREATE SCHEMA %I', tenant_schema_name);
    
    -- Criar tabelas no novo esquema (incluindo closed_by_user_id)
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
    
    -- ... keep existing code for other tables (kanban_columns, action_groups, etc)
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
    
    -- Inserir dados padrão
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
    
    -- Criar triggers para updated_at
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
    
    -- Criar trigger para histórico de status
    EXECUTE format('
      CREATE TRIGGER track_lead_status_changes_trigger
        AFTER UPDATE ON %I.leads
        FOR EACH ROW
        EXECUTE FUNCTION public.track_lead_status_changes_tenant();
    ', tenant_schema_name);
    
    -- Criar trigger para mover leads quando coluna for deletada
    EXECUTE format('
      CREATE TRIGGER move_leads_on_column_delete_trigger
        BEFORE DELETE ON %I.kanban_columns
        FOR EACH ROW
        EXECUTE FUNCTION public.move_leads_to_finalizado_on_tenant_column_delete();
    ', tenant_schema_name);
  END IF;
  
  -- Adicionar coluna closed_by_user_id se ainda não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = tenant_schema_name 
    AND table_name = 'leads' 
    AND column_name = 'closed_by_user_id'
  ) THEN
    EXECUTE format('ALTER TABLE %I.leads ADD COLUMN closed_by_user_id UUID', tenant_schema_name);
  END IF;
  
  -- Criar função específica do tenant para rastrear fechamento se não existir
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.track_contract_closure_tenant()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $func$
    BEGIN
      -- Se o status mudou para "Contrato Fechado", registrar quem fez a mudança
      IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = ''Contrato Fechado'' THEN
        NEW.closed_by_user_id := public.get_tenant_id();
      END IF;
      
      RETURN NEW;
    END;
    $func$;
  ', tenant_schema_name);
  
  -- Verificar se o trigger de rastreamento de fechamento já existe
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
  
  -- Verificar se o trigger de mover leads já existe
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
  
  RETURN tenant_schema_name;
END;
$$;

-- Aplicar as mudanças aos esquemas de tenant existentes
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  -- Buscar todos os esquemas de tenant existentes
  FOR tenant_record IN 
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'tenant_%'
  LOOP
    -- Aplicar as mudanças a cada esquema de tenant
    PERFORM public.add_closed_by_tracking_to_tenant(tenant_record.schema_name);
  END LOOP;
END;
$$;
