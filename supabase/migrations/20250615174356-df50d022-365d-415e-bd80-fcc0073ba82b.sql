
-- Adiciona os grupos de ação padrão "Penal" e "Previdenciários"
insert into public.action_groups (name, description, user_id)
values
  ('penal', 'Penal', null),
  ('previdenciarios', 'Previdenciários', null)
on conflict (name, user_id) do nothing;
