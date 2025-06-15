
-- Atualiza a função para garantir que:
-- - O tenant veja suas próprias lead_sources (user_id = get_tenant_id())
-- - Veja também as defaults (user_id IS NULL) NÃO ocultadas pelo usuário
-- - Ocultamento já leva em conta o registro na tabela hidden_default_items

CREATE OR REPLACE FUNCTION public.get_visible_lead_sources()
RETURNS SETOF lead_sources
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT * FROM public.lead_sources ls
  WHERE 
    -- Mostra fontes do próprio tenant:
    ls.user_id = public.get_tenant_id()
    OR
    (
      ls.user_id IS NULL 
      AND NOT EXISTS (
        SELECT 1 FROM public.hidden_default_items h
        WHERE h.item_id = ls.id
          AND h.user_id = public.get_tenant_id()
          AND h.item_type = 'lead_source'
      )
    );
END;
$function$;
