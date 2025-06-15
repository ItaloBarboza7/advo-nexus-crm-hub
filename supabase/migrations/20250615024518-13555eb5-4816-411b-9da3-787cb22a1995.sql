
-- Este script corrige dois problemas:
-- 1. Um erro de compilação que impedia a atualização da aplicação. Isso é resolvido
--    tornando a coluna user_id na tabela hidden_default_items opcional,
--    já que um gatilho no banco de dados já garante que ela seja preenchida.
-- 2. O desaparecimento das opções nos campos de seleção, como "Grupo de Ação", que foi causado por
--    uma alteração de permissões. Isso é resolvido revertendo as funções de busca
--    de dados para seu estado anterior (SECURITY DEFINER), que é mais seguro neste contexto.

-- 1. Torna a coluna user_id opcional em hidden_default_items para corrigir erro de compilação.
ALTER TABLE public.hidden_default_items ALTER COLUMN user_id DROP NOT NULL;

-- 2. Reverte get_visible_action_groups para SECURITY DEFINER para corrigir o problema de permissões.
CREATE OR REPLACE FUNCTION public.get_visible_action_groups()
 RETURNS SETOF action_groups
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
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

-- 3. Reverte get_visible_action_types para SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.get_visible_action_types()
 RETURNS SETOF action_types
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
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

-- 4. Reverte get_visible_lead_sources para SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.get_visible_lead_sources()
 RETURNS SETOF lead_sources
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
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
