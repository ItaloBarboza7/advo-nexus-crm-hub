
-- 1. Cria uma constraint única para garantir nomes únicos de fontes de lead dentro do mesmo usuário (incluindo global)
ALTER TABLE public.lead_sources ADD CONSTRAINT lead_sources_name_user_unique UNIQUE (name, user_id);

-- 2. Atualiza a fonte global "site4" para "site"
UPDATE public.lead_sources
SET name = 'site', label = 'site'
WHERE name = 'site4' AND user_id IS NULL;

-- 3. Adiciona a nova fonte global "Indicação"
INSERT INTO public.lead_sources (name, label, user_id)
VALUES ('indicacao', 'Indicação', null)
ON CONFLICT (name, user_id) DO NOTHING;
