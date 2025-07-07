
-- Inserir tipos de ação padrão para o grupo "Penal"
INSERT INTO public.action_types (name, action_group_id, user_id)
SELECT 
  unnest(ARRAY[
    'consulta-inicial',
    'audiencia-instrucao',
    'alegacoes-finais',
    'recurso',
    'execucao-pena',
    'habeas-corpus',
    'revisao-criminal',
    'acordo-colaboracao'
  ]) as name,
  ag.id as action_group_id,
  null as user_id
FROM public.action_groups ag 
WHERE ag.name = 'penal' AND ag.user_id IS NULL
ON CONFLICT DO NOTHING;

-- Inserir tipos de ação padrão para o grupo "Previdenciários"  
INSERT INTO public.action_types (name, action_group_id, user_id)
SELECT 
  unnest(ARRAY[
    'aposentadoria-tempo-contribuicao',
    'aposentadoria-idade',
    'aposentadoria-invalidez',
    'auxilio-doenca',
    'auxilio-acidente',
    'pensao-morte',
    'salario-maternidade',
    'bpc-loas',
    'revisao-beneficio',
    'recurso-administrativo'
  ]) as name,
  ag.id as action_group_id,
  null as user_id
FROM public.action_groups ag 
WHERE ag.name = 'previdenciarios' AND ag.user_id IS NULL
ON CONFLICT DO NOTHING;
