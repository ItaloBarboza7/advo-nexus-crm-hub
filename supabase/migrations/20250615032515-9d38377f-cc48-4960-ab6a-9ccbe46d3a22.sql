
-- Cria uma função trigger que deleta tipos de ação vinculados ao grupo
CREATE OR REPLACE FUNCTION public.delete_action_types_on_group_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.action_types WHERE action_group_id = OLD.id;
  RETURN OLD;
END;
$$;

-- Adiciona a trigger para deletar tipos de ação ao deletar um grupo
DROP TRIGGER IF EXISTS trg_delete_action_types_on_group_delete ON public.action_groups;

CREATE TRIGGER trg_delete_action_types_on_group_delete
AFTER DELETE ON public.action_groups
FOR EACH ROW
EXECUTE FUNCTION public.delete_action_types_on_group_delete();
