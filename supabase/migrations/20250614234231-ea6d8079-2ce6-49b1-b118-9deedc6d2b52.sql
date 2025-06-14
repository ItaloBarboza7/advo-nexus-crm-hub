
-- Altera a relação entre 'action_groups' e 'action_types' para permitir exclusão em cascata.
-- Isso significa que ao deletar um 'action_group', todos os 'action_types' relacionados serão deletados também.

-- 1. Remove a restrição de chave estrangeira antiga, caso ela exista.
-- O nome 'action_types_action_group_id_fkey' é uma convenção padrão do Supabase.
ALTER TABLE public.action_types
DROP CONSTRAINT IF EXISTS action_types_action_group_id_fkey;

-- 2. Adiciona a nova restrição de chave estrangeira com 'ON DELETE CASCADE'.
ALTER TABLE public.action_types
ADD CONSTRAINT action_types_action_group_id_fkey
FOREIGN KEY (action_group_id)
REFERENCES public.action_groups(id)
ON DELETE CASCADE;
