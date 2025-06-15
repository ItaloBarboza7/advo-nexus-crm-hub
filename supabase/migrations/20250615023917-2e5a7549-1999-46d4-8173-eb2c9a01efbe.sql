
-- Este script corrige a função `get_tenant_id` para garantir que a identidade do usuário seja
-- sempre resolvida corretamente, consertando a funcionalidade de "ocultar" itens padrão.

-- 1. Corrige a função get_tenant_id para usar SECURITY DEFINER.
-- Isso garante que auth.uid() seja resolvido corretamente, mesmo quando
-- a função é chamada por outras funções com SECURITY INVOKER.
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $function$
  -- Define um search_path seguro para a função
  SET search_path = public;
  
  SELECT COALESCE(
    -- Tenta obter o ID do admin (parent_user_id) se o usuário for um membro da equipe
    (SELECT parent_user_id FROM public.user_profiles WHERE user_id = auth.uid()),
    -- Caso contrário, usa o próprio ID do usuário (o admin é seu próprio "pai")
    auth.uid()
  );
$function$;

-- 2. Atualiza a função do gatilho para incluir um log de depuração.
-- Isso nos ajudará a confirmar que o tenant_id correto está sendo capturado.
CREATE OR REPLACE FUNCTION public.set_hidden_item_tenant_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY INVOKER
AS $function$
DECLARE
  tenant_uuid uuid;
BEGIN
  tenant_uuid := public.get_tenant_id();
  RAISE NOTICE 'DEBUG: set_hidden_item_tenant_id está definindo user_id para % no item %', tenant_uuid, NEW.item_id;
  NEW.user_id := tenant_uuid;
  RETURN NEW;
END;
$function$;
