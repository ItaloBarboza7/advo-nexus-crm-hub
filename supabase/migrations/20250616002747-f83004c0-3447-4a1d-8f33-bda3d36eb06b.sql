
-- ========================================================================
-- IMPLEMENTAÇÃO DE ESQUEMAS DINÂMICOS PARA ISOLAMENTO TOTAL POR ADMIN
-- (VERSÃO CORRIGIDA)
-- ========================================================================

-- 1. Criar função para obter o nome do esquema do tenant
CREATE OR REPLACE FUNCTION public.get_tenant_schema()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 'tenant_' || replace(public.get_tenant_id()::text, '-', '_');
$$;

-- 2. Função para criar esquema do tenant se não existir (CORRIGIDA)
CREATE OR REPLACE FUNCTION public.ensure_tenant_schema()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_schema_name text;
BEGIN
  tenant_schema_name := public.get_tenant_schema();
  
  -- Criar o esquema se não existir (corrigido para evitar ambiguidade)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schemata.schema_name = tenant_schema_name
  ) THEN
    EXECUTE format('CREATE SCHEMA %I', tenant_schema_name);
    
    -- Criar tabelas no novo esquema
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
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    ', tenant_schema_name);
    
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
    
    -- Inserir dados padrão das colunas Kanban
    EXECUTE format('
      INSERT INTO %I.kanban_columns (name, color, order_position, is_default) VALUES
      (''Novo'', ''bg-blue-100 text-blue-800'', 1, true),
      (''Proposta'', ''bg-yellow-100 text-yellow-800'', 2, true),
      (''Reunião'', ''bg-purple-100 text-purple-800'', 3, true),
      (''Contrato Fechado'', ''bg-green-100 text-green-800'', 4, true),
      (''Perdido'', ''bg-red-100 text-red-800'', 5, true),
      (''Finalizado'', ''bg-gray-100 text-gray-800'', 6, true);
    ', tenant_schema_name);
    
    -- Inserir grupos de ação padrão
    EXECUTE format('
      INSERT INTO %I.action_groups (name, description) VALUES
      (''Outros'', ''Grupo padrão para ações não categorizadas'');
    ', tenant_schema_name);
    
    -- Inserir motivos de perda padrão
    EXECUTE format('
      INSERT INTO %I.loss_reasons (reason) VALUES
      (''Preço alto''),
      (''Sem interesse''),
      (''Concorrência''),
      (''Timing inadequado''),
      (''Sem orçamento''),
      (''Outros'');
    ', tenant_schema_name);
    
    -- Inserir fontes de leads padrão
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
  END IF;
  
  RETURN tenant_schema_name;
END;
$$;

-- 3. Função para rastrear mudanças de status no esquema do tenant
CREATE OR REPLACE FUNCTION public.track_lead_status_changes_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  tenant_schema_name text;
BEGIN
  tenant_schema_name := public.get_tenant_schema();
  
  -- Se o status mudou, registrar no histórico
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    EXECUTE format('
      INSERT INTO %I.lead_status_history (lead_id, old_status, new_status)
      VALUES ($1, $2, $3)
    ', tenant_schema_name) USING NEW.id, OLD.status, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Migrar dados existentes para esquemas de tenant
DO $$
DECLARE
  tenant_record RECORD;
  tenant_schema_name text;
BEGIN
  -- Para cada tenant único nos leads
  FOR tenant_record IN 
    SELECT DISTINCT user_id FROM public.leads WHERE user_id IS NOT NULL
  LOOP
    -- Configurar o contexto do tenant
    PERFORM set_config('request.jwt.claims', json_build_object('sub', tenant_record.user_id)::text, true);
    
    -- Criar esquema do tenant
    tenant_schema_name := public.ensure_tenant_schema();
    
    -- Migrar leads
    EXECUTE format('
      INSERT INTO %I.leads (id, name, email, phone, description, source, state, status, action_group, action_type, loss_reason, value, created_at, updated_at)
      SELECT id, name, email, phone, description, source, state, status, action_group, action_type, loss_reason, value, created_at, updated_at
      FROM public.leads 
      WHERE user_id = $1
    ', tenant_schema_name) USING tenant_record.user_id;
    
    -- Migrar colunas kanban personalizadas
    EXECUTE format('
      INSERT INTO %I.kanban_columns (id, name, color, order_position, is_default, created_at, updated_at)
      SELECT id, name, color, order_position, is_default, created_at, updated_at
      FROM public.kanban_columns 
      WHERE user_id = $1
    ', tenant_schema_name) USING tenant_record.user_id;
    
    -- Migrar grupos de ação personalizados
    EXECUTE format('
      INSERT INTO %I.action_groups (id, name, description, created_at, updated_at)
      SELECT id, name, description, created_at, updated_at
      FROM public.action_groups 
      WHERE user_id = $1
    ', tenant_schema_name) USING tenant_record.user_id;
    
    -- Migrar tipos de ação personalizados
    EXECUTE format('
      INSERT INTO %I.action_types (id, name, action_group_id, created_at, updated_at)
      SELECT id, name, action_group_id, created_at, updated_at
      FROM public.action_types 
      WHERE user_id = $1
    ', tenant_schema_name) USING tenant_record.user_id;
    
    -- Migrar fontes de leads personalizadas
    EXECUTE format('
      INSERT INTO %I.lead_sources (id, name, label, created_at, updated_at)
      SELECT id, name, label, created_at, updated_at
      FROM public.lead_sources 
      WHERE user_id = $1
    ', tenant_schema_name) USING tenant_record.user_id;
    
    -- Migrar motivos de perda personalizados
    EXECUTE format('
      INSERT INTO %I.loss_reasons (id, reason, is_fixed, created_at, updated_at)
      SELECT id, reason, is_fixed, created_at, updated_at
      FROM public.loss_reasons 
      WHERE user_id = $1
    ', tenant_schema_name) USING tenant_record.user_id;
    
    -- Migrar histórico de status (apenas para leads do tenant)
    EXECUTE format('
      INSERT INTO %I.lead_status_history (id, lead_id, old_status, new_status, changed_at, created_at)
      SELECT lsh.id, lsh.lead_id, lsh.old_status, lsh.new_status, lsh.changed_at, lsh.created_at
      FROM public.lead_status_history lsh
      INNER JOIN public.leads l ON l.id = lsh.lead_id
      WHERE l.user_id = $1
    ', tenant_schema_name) USING tenant_record.user_id;
    
    -- Migrar informações da empresa
    EXECUTE format('
      INSERT INTO %I.company_info (id, company_name, cnpj, email, phone, address, created_at, updated_at)
      SELECT id, company_name, cnpj, email, phone, address, created_at, updated_at
      FROM public.company_info 
      WHERE user_id = $1
    ', tenant_schema_name) USING tenant_record.user_id;
  END LOOP;
END;
$$;

-- 5. Criar view para facilitar consultas de desenvolvimento
CREATE OR REPLACE VIEW public.tenant_schemas AS
SELECT 
  'tenant_' || replace(user_id::text, '-', '_') as schema_name,
  user_id as tenant_id,
  (SELECT schemata.schema_name FROM information_schema.schemata WHERE schemata.schema_name = 'tenant_' || replace(user_id::text, '-', '_')) as exists
FROM (
  SELECT DISTINCT user_id FROM public.leads WHERE user_id IS NOT NULL
  UNION
  SELECT DISTINCT user_id FROM public.kanban_columns WHERE user_id IS NOT NULL
  UNION  
  SELECT DISTINCT user_id FROM public.action_groups WHERE user_id IS NOT NULL
) tenants
WHERE user_id IS NOT NULL;
