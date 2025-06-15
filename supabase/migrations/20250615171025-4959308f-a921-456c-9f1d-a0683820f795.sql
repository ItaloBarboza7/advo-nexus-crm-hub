
-- 1. Garanta a tabela hidden_default_items aceita o novo tipo de item (isso só precisa ser feito se ela ainda não aceita)
-- [Já está apta, pois aceita 'item_type' como texto]

-- 2. Recomende usar o mesmo padrão de trigger de tenant para inserção
CREATE OR REPLACE FUNCTION public.set_hidden_item_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  tenant_uuid uuid;
BEGIN
  tenant_uuid := public.get_tenant_id();
  NEW.user_id := tenant_uuid;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_hidden_item_tenant_id ON public.hidden_default_items;
CREATE TRIGGER trigger_set_hidden_item_tenant_id
BEFORE INSERT ON public.hidden_default_items
FOR EACH ROW EXECUTE FUNCTION public.set_hidden_item_tenant_id();

-- 3. Políticas: garantir que o tenant só veja/oculte seus próprios itens ocultos
ALTER TABLE public.hidden_default_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenants can manage their hidden items" ON public.hidden_default_items;

CREATE POLICY "Tenants can manage their hidden items"
  ON public.hidden_default_items
  USING (user_id = public.get_tenant_id())
  WITH CHECK (user_id = public.get_tenant_id());

-- 4. [Importante!] Adapte a visualização dos motivos de perda para ignorar os ocultos pelo tenant
-- A consulta deve ser:
--  Mostrar:
--    - Motivos com user_id = tenant
--    - Motivos com user_id IS NULL E NÃO estiverem ocultos na hidden_default_items por este tenant

-- Exemplo de SELECT (use como base para adaptar queries no código):
-- SELECT * FROM public.loss_reasons lr
-- WHERE lr.user_id = public.get_tenant_id()
--    OR (
--         lr.user_id IS NULL
--         AND NOT EXISTS (
--           SELECT 1 FROM public.hidden_default_items hdi
--           WHERE hdi.item_id = lr.id
--             AND hdi.user_id = public.get_tenant_id()
--             AND hdi.item_type = 'loss_reason'
--         )
--       );

-- 5. Opcional: Índice (se ainda não existir)
CREATE INDEX IF NOT EXISTS idx_hidden_default_items_loss_reason ON public.hidden_default_items(item_id, user_id, item_type);

