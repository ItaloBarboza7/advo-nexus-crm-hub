
-- Função para trazer todos os motivos de perda visualizáveis pelo tenant,
-- considerando ocultamento via hidden_default_items (para soft delete global)
CREATE OR REPLACE FUNCTION public.get_visible_loss_reasons_for_tenant()
RETURNS SETOF loss_reasons
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT lr.*
  FROM public.loss_reasons lr
  WHERE
    -- Motivos do tenant
    lr.user_id = public.get_tenant_id()
    OR
    (
      lr.user_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.hidden_default_items hdi
        WHERE hdi.item_id = lr.id
          AND hdi.user_id = public.get_tenant_id()
          AND hdi.item_type = 'loss_reason'
      )
    );
END;
$$;
