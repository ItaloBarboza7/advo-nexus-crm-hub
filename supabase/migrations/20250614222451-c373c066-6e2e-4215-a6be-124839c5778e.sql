
-- Remove entradas duplicadas de company_info para o mesmo usuário, mantendo a mais atualizada.
WITH latest_info AS (
  SELECT id, ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY updated_at DESC) as rn
  FROM public.company_info
)
DELETE FROM public.company_info
WHERE id IN (
  SELECT id FROM latest_info WHERE rn > 1
);

-- Adiciona uma restrição de unicidade para garantir que haja apenas um registro de company_info por usuário.
ALTER TABLE public.company_info
ADD CONSTRAINT company_info_user_id_key UNIQUE (user_id);
