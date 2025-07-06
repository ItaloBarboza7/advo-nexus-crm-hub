
-- Criar tabela para armazenar as metas da equipe
CREATE TABLE public.team_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  monthly_goal INTEGER NOT NULL DEFAULT 100,
  daily_goal INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.team_goals ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam suas próprias metas
CREATE POLICY "Users can view their own team goals" 
  ON public.team_goals 
  FOR SELECT 
  USING (user_id = get_tenant_id());

-- Política para permitir que usuários insiram suas próprias metas
CREATE POLICY "Users can insert their own team goals" 
  ON public.team_goals 
  FOR INSERT 
  WITH CHECK (user_id = get_tenant_id());

-- Política para permitir que usuários atualizem suas próprias metas
CREATE POLICY "Users can update their own team goals" 
  ON public.team_goals 
  FOR UPDATE 
  USING (user_id = get_tenant_id())
  WITH CHECK (user_id = get_tenant_id());

-- Política para permitir que usuários deletem suas próprias metas
CREATE POLICY "Users can delete their own team goals" 
  ON public.team_goals 
  FOR DELETE 
  USING (user_id = get_tenant_id());

-- Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_team_goals_updated_at
  BEFORE UPDATE ON public.team_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
