
-- Cria/atualiza função para mover leads a "Novo" quando coluna é deletada
CREATE OR REPLACE FUNCTION public.move_leads_to_novo_on_column_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Move todos os leads da coluna excluída para "Novo"
  UPDATE public.leads
  SET status = 'Novo',
      updated_at = now()
  WHERE status = OLD.name;
  
  RETURN OLD;
END;
$function$;

-- Remove triggers antigos, se existirem
DROP TRIGGER IF EXISTS move_leads_to_finalizado_on_column_delete ON public.kanban_columns;

-- Cria trigger para usar a nova função ao deletar coluna
CREATE TRIGGER move_leads_to_novo_on_column_delete
BEFORE DELETE ON public.kanban_columns
FOR EACH ROW
EXECUTE FUNCTION public.move_leads_to_novo_on_column_delete();
