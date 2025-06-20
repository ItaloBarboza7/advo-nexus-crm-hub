
-- Criar função para mover leads para "Finalizado" quando uma coluna for deletada no esquema do tenant
CREATE OR REPLACE FUNCTION public.move_leads_to_finalizado_on_tenant_column_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  tenant_schema_name text;
BEGIN
  -- Obter o nome do esquema do tenant
  tenant_schema_name := public.get_tenant_schema();
  
  -- Mover todos os leads da coluna excluída para "Finalizado" no esquema do tenant
  EXECUTE format('
    UPDATE %I.leads 
    SET status = ''Finalizado'', 
        updated_at = now() 
    WHERE status = $1
  ', tenant_schema_name) USING OLD.name;
  
  RETURN OLD;
END;
$function$;

-- Função para criar trigger automaticamente quando um esquema de tenant for criado
CREATE OR REPLACE FUNCTION public.add_column_delete_trigger_to_tenant(schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Criar trigger para mover leads para "Finalizado" quando coluna for deletada
  EXECUTE format('
    CREATE TRIGGER move_leads_on_column_delete_trigger
      BEFORE DELETE ON %I.kanban_columns
      FOR EACH ROW
      EXECUTE FUNCTION public.move_leads_to_finalizado_on_tenant_column_delete();
  ', schema_name);
END;
$function$;

-- Atualizar a função ensure_tenant_schema para incluir o trigger automaticamente
CREATE OR REPLACE FUNCTION public.ensure_tenant_schema()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    
    -- NOVO: Criar trigger para mover leads quando coluna for deletada
    EXECUTE format('
      CREATE TRIGGER move_leads_on_column_delete_trigger
        BEFORE DELETE ON %I.kanban_columns
        FOR EACH ROW
        EXECUTE FUNCTION public.move_leads_to_finalizado_on_tenant_column_delete();
    ', tenant_schema_name);
  END IF;
  
  -- Verificar se o trigger já existe nos esquemas existentes e criar se necessário
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
$function$;
