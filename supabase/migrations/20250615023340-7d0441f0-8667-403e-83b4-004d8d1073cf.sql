
-- Este script corrige as permissões de funções do banco de dados para
-- garantir que a identidade do usuário seja corretamente reconhecida,
-- consertando a funcionalidade de "ocultar" itens padrão.

-- 1. Atualiza a função get_visible_action_groups para usar SECURITY INVOKER.
-- Isso garante que a função seja executada com as permissões do usuário que a chama.
CREATE OR REPLACE FUNCTION public.get_visible_action_groups()
 RETURNS SETOF action_groups
 LANGUAGE plpgsql
 STABLE SECURITY INVOKER
AS $function$
BEGIN
  RETURN QUERY
  SELECT * FROM public.action_groups ag
  WHERE ag.user_id = public.get_tenant_id()
  UNION ALL
  SELECT * FROM public.action_groups ag
  WHERE ag.user_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.hidden_default_items h
      WHERE h.item_id = ag.id
        AND h.user_id = public.get_tenant_id()
        AND h.item_type = 'action_group'
    );
END;
$function$;

-- 2. Atualiza a função get_visible_action_types para usar SECURITY INVOKER.
CREATE OR REPLACE FUNCTION public.get_visible_action_types()
 RETURNS SETOF action_types
 LANGUAGE plpgsql
 STABLE SECURITY INVOKER
AS $function$
BEGIN
  RETURN QUERY
  SELECT * FROM public.action_types at
  WHERE at.user_id = public.get_tenant_id()
  UNION ALL
  SELECT * FROM public.action_types at
  WHERE at.user_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.hidden_default_items h
      WHERE h.item_id = at.id
        AND h.user_id = public.get_tenant_id()
        AND h.item_type = 'action_type'
    );
END;
$function$;

-- 3. Atualiza a função get_visible_lead_sources para usar SECURITY INVOKER.
CREATE OR REPLACE FUNCTION public.get_visible_lead_sources()
 RETURNS SETOF lead_sources
 LANGUAGE plpgsql
 STABLE SECURITY INVOKER
AS $function$
BEGIN
  RETURN QUERY
  SELECT * FROM public.lead_sources ls
  WHERE NOT EXISTS (
      SELECT 1 FROM public.hidden_default_items h
      WHERE h.item_id = ls.id
        AND h.user_id = public.get_tenant_id()
        AND h.item_type = 'lead_source'
    );
END;
$function$;

-- 4. Atualiza a função do gatilho set_hidden_item_tenant_id para usar SECURITY INVOKER.
-- Isso é crucial para que o ID do usuário seja inserido corretamente na tabela hidden_default_items.
CREATE OR REPLACE FUNCTION public.set_hidden_item_tenant_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY INVOKER
AS $function$
BEGIN
  NEW.user_id := public.get_tenant_id();
  RETURN NEW;
END;
$function$;

