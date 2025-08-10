
-- Criar tabela para tarefas da agenda
CREATE TABLE public.agenda_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  assigned_to_user_id UUID NOT NULL,
  created_by_user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.agenda_tasks ENABLE ROW LEVEL SECURITY;

-- Política para visualizar tarefas do tenant
CREATE POLICY "Tenant users can view agenda tasks" ON public.agenda_tasks
  FOR SELECT 
  USING (tenant_id = get_tenant_id());

-- Política para criar tarefas
CREATE POLICY "Tenant users can create agenda tasks" ON public.agenda_tasks
  FOR INSERT 
  WITH CHECK (tenant_id = get_tenant_id() AND created_by_user_id = auth.uid());

-- Política para atualizar tarefas (apenas o criador ou o assignado)
CREATE POLICY "Users can update assigned or created tasks" ON public.agenda_tasks
  FOR UPDATE 
  USING (tenant_id = get_tenant_id() AND (created_by_user_id = auth.uid() OR assigned_to_user_id = auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id());

-- Política para deletar tarefas (apenas o criador)
CREATE POLICY "Users can delete created tasks" ON public.agenda_tasks
  FOR DELETE 
  USING (tenant_id = get_tenant_id() AND created_by_user_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_agenda_tasks_updated_at
  BEFORE UPDATE ON public.agenda_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela para conexões WhatsApp
CREATE TABLE public.whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'pending')),
  qr_code TEXT,
  webhook_url TEXT,
  tenant_id UUID NOT NULL,
  created_by_user_id UUID NOT NULL,
  last_connected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(phone_number, tenant_id)
);

-- Habilitar RLS
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- Política para visualizar conexões do tenant
CREATE POLICY "Tenant users can view whatsapp connections" ON public.whatsapp_connections
  FOR SELECT 
  USING (tenant_id = get_tenant_id());

-- Política para criar conexões
CREATE POLICY "Tenant users can create whatsapp connections" ON public.whatsapp_connections
  FOR INSERT 
  WITH CHECK (tenant_id = get_tenant_id() AND created_by_user_id = auth.uid());

-- Política para atualizar conexões
CREATE POLICY "Tenant users can update whatsapp connections" ON public.whatsapp_connections
  FOR UPDATE 
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

-- Política para deletar conexões
CREATE POLICY "Tenant users can delete whatsapp connections" ON public.whatsapp_connections
  FOR DELETE 
  USING (tenant_id = get_tenant_id());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_whatsapp_connections_updated_at
  BEFORE UPDATE ON public.whatsapp_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para definir tenant_id automaticamente nas agenda_tasks
CREATE OR REPLACE FUNCTION public.set_agenda_task_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_tenant_id();
  END IF;
  IF NEW.created_by_user_id IS NULL THEN
    NEW.created_by_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

-- Trigger para agenda_tasks
CREATE TRIGGER set_agenda_task_tenant_id_trigger
  BEFORE INSERT ON public.agenda_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_agenda_task_tenant_id();

-- Função para definir tenant_id automaticamente nas whatsapp_connections
CREATE OR REPLACE FUNCTION public.set_whatsapp_connection_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_tenant_id();
  END IF;
  IF NEW.created_by_user_id IS NULL THEN
    NEW.created_by_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

-- Trigger para whatsapp_connections
CREATE TRIGGER set_whatsapp_connection_tenant_id_trigger
  BEFORE INSERT ON public.whatsapp_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_whatsapp_connection_tenant_id();
