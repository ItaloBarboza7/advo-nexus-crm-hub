
-- Altera o motivo de perda "Outros" para que não seja mais um item fixo do sistema.
UPDATE public.loss_reasons
SET is_fixed = false
WHERE LOWER(TRIM(reason)) = 'outros' AND user_id IS NULL;
