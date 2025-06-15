
-- Atualiza função que move os leads para "Outros" quando o grupo de ação é deletado
CREATE OR REPLACE FUNCTION public.move_leads_to_outros_on_action_group_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Move leads daquele grupo para 'Outros'
    UPDATE public.leads
    SET 
        action_group = 'Outros',
        action_type = NULL
    WHERE 
        action_group = OLD.name AND user_id = OLD.user_id;

    RETURN OLD;
END;
$function$;

-- Remove trigger antiga, se houver
DROP TRIGGER IF EXISTS trg_move_leads_to_outros_on_action_group_delete ON public.action_groups;

-- Cria trigger para acionar essa função ao deletar grupo de ação
CREATE TRIGGER trg_move_leads_to_outros_on_action_group_delete
AFTER DELETE ON public.action_groups
FOR EACH ROW
EXECUTE FUNCTION public.move_leads_to_outros_on_action_group_delete();

-- FUNÇÃO E TRIGGER PARA MOVER LEADS CUJO GRUPO FOI "OCULTADO" PARA 'Outros'
-- Quando um registro default é "ocultado" para o usuário, mantém a lógica padronizada usando a tabela hidden_default_items

-- Cria função para mover leads ao inserir um registro na hidden_default_items (ocultando um grupo de ação default)
CREATE OR REPLACE FUNCTION public.move_leads_to_outros_on_action_group_hide()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  grupo_nome text;
  grupo_user_id uuid;
BEGIN
  -- Só executa para grupos de ação
  IF NEW.item_type = 'action_group' THEN
    -- Busca o nome/nome e user_id do grupo ocultado
    SELECT ag.name, ag.user_id INTO grupo_nome, grupo_user_id
    FROM public.action_groups ag
    WHERE ag.id = NEW.item_id;

    IF grupo_nome IS NOT NULL THEN
      UPDATE public.leads
      SET 
        action_group = 'Outros',
        action_type = NULL
      WHERE 
        action_group = grupo_nome AND user_id = grupo_user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Remove trigger antiga relacionada, se houver
DROP TRIGGER IF EXISTS trg_move_leads_to_outros_on_action_group_hide ON public.hidden_default_items;

-- Cria trigger após inserir ocultação de grupo default
CREATE TRIGGER trg_move_leads_to_outros_on_action_group_hide
AFTER INSERT ON public.hidden_default_items
FOR EACH ROW
EXECUTE FUNCTION public.move_leads_to_outros_on_action_group_hide();

-- ENFORÇA QUE TODOS LEADS COM GRUPO NULO OU EM BRANCO VÃO PARA 'Outros'
-- Pode ser feito via uma função trigger no UPDATE/INSERT

CREATE OR REPLACE FUNCTION public.ensure_lead_action_group()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.action_group IS NULL OR trim(NEW.action_group) = '' THEN
    NEW.action_group := 'Outros';
    NEW.action_type := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

-- Remove triggers antigas se existirem
DROP TRIGGER IF EXISTS trg_ensure_lead_action_group_insert ON public.leads;
DROP TRIGGER IF EXISTS trg_ensure_lead_action_group_update ON public.leads;

-- Cria triggers para corrigir o grupo em cada INSERT e UPDATE
CREATE TRIGGER trg_ensure_lead_action_group_insert
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.ensure_lead_action_group();

CREATE TRIGGER trg_ensure_lead_action_group_update
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.ensure_lead_action_group();

