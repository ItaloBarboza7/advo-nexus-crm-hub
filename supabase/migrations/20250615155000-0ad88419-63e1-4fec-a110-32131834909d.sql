
-- Atualiza todos os motivos de perda para ser deletáveis, exceto "Outros"
UPDATE public.loss_reasons
SET is_fixed = false
WHERE LOWER(TRIM(reason)) <> 'outros';

-- Garante que o motivo "Outros" fique como fixo (mesmo se já estiver)
UPDATE public.loss_reasons
SET is_fixed = true
WHERE LOWER(TRIM(reason)) = 'outros';
