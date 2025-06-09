
-- Inserir o motivo "Outros" na tabela loss_reasons se não existir
INSERT INTO public.loss_reasons (reason, is_fixed)
SELECT 'Outros', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.loss_reasons WHERE reason = 'Outros'
);
