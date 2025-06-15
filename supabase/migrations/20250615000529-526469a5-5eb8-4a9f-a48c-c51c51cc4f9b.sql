
-- 1. Cria ou substitui a função que será executada pelo gatilho.
CREATE OR REPLACE FUNCTION public.move_leads_to_outros_on_action_group_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Esta função é acionada ANTES da exclusão de um registro na tabela 'action_groups'.
    -- Ela atualiza a tabela 'leads' para mover os leads associados ao grupo
    -- que está sendo excluído para o grupo 'Outros'.
    -- O campo 'action_type' também é definido como NULL, pois os tipos de ação
    -- pertencentes ao grupo excluído são removidos em cascata.
    
    UPDATE public.leads
    SET 
        action_group = 'Outros', -- Move para o grupo padrão 'Outros'
        action_type = NULL      -- Limpa o tipo de ação específico
    WHERE 
        action_group = OLD.name; -- 'OLD.name' é o nome do grupo que está sendo excluído.

    -- Retorna OLD para permitir que a operação de exclusão original continue.
    RETURN OLD;
END;
$$;

-- 2. Remove o gatilho antigo, se existir, para garantir que estamos usando a versão mais recente.
DROP TRIGGER IF EXISTS trigger_move_leads_before_action_group_delete ON public.action_groups;

-- 3. Cria o gatilho que executa a função acima antes de cada exclusão na tabela 'action_groups'.
CREATE TRIGGER trigger_move_leads_before_action_group_delete
BEFORE DELETE ON public.action_groups
FOR EACH ROW
EXECUTE FUNCTION public.move_leads_to_outros_on_action_group_delete();
