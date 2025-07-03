
-- Atualizar a função para limpar tanto action_group quanto action_type quando um grupo é excluído
CREATE OR REPLACE FUNCTION public.move_leads_to_outros_on_action_group_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    tenant_schema_name text;
BEGIN
    -- Buscar o nome do esquema do tenant
    tenant_schema_name := public.get_tenant_schema();
    
    -- Move leads daquele grupo para 'Outros' e limpa os tipos de ação na tabela global
    UPDATE public.leads
    SET 
        action_group = 'Outros',
        action_type = NULL
    WHERE 
        action_group = OLD.name AND user_id = OLD.user_id;

    -- Se existe esquema do tenant, também atualiza lá
    IF tenant_schema_name IS NOT NULL AND EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = tenant_schema_name
    ) THEN
        EXECUTE format('
            UPDATE %I.leads
            SET 
                action_group = ''Outros'',
                action_type = NULL
            WHERE 
                action_group = $1
        ', tenant_schema_name) USING OLD.name;
    END IF;

    RETURN OLD;
END;
$$;

-- Atualizar a função para quando um grupo é ocultado
CREATE OR REPLACE FUNCTION public.move_leads_to_outros_on_action_group_hide()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  grupo_nome text;
  grupo_user_id uuid;
  tenant_schema_name text;
BEGIN
  -- Só executa para grupos de ação
  IF NEW.item_type = 'action_group' THEN
    -- Busca o nome e user_id do grupo ocultado
    SELECT ag.name, ag.user_id INTO grupo_nome, grupo_user_id
    FROM public.action_groups ag
    WHERE ag.id = NEW.item_id;

    IF grupo_nome IS NOT NULL THEN
      -- Buscar o nome do esquema do tenant
      tenant_schema_name := public.get_tenant_schema();
      
      -- Atualizar na tabela global
      UPDATE public.leads
      SET 
        action_group = 'Outros',
        action_type = NULL
      WHERE 
        action_group = grupo_nome AND user_id = grupo_user_id;

      -- Se existe esquema do tenant, também atualiza lá
      IF tenant_schema_name IS NOT NULL AND EXISTS (
          SELECT 1 FROM information_schema.schemata 
          WHERE schema_name = tenant_schema_name
      ) THEN
          EXECUTE format('
              UPDATE %I.leads
              SET 
                  action_group = ''Outros'',
                  action_type = NULL
              WHERE 
                  action_group = $1
          ', tenant_schema_name) USING grupo_nome;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
