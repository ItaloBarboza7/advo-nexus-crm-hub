
-- Tabela para rastrear itens padrão (do sistema) que um usuário "excluiu" (ocultou).
CREATE TABLE public.hidden_default_items (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    item_id uuid NOT NULL,
    item_type text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, item_id, item_type)
);
COMMENT ON TABLE public.hidden_default_items IS 'Rastreia quais itens padrão (do sistema) um usuário "excluiu" (ocultou) de sua visualização.';
COMMENT ON COLUMN public.hidden_default_items.user_id IS 'O ID do tenant do usuário.';
COMMENT ON COLUMN public.hidden_default_items.item_id IS 'O ID do item padrão que foi oculto (e.g., de action_groups, action_types).';
COMMENT ON COLUMN public.hidden_default_items.item_type IS 'O tipo do item oculto (ex: ''action_group'', ''action_type'', ''lead_source'').';

-- Habilita RLS para segurança.
ALTER TABLE public.hidden_default_items ENABLE ROW LEVEL SECURITY;

-- Permite que usuários gerenciem apenas suas próprias entradas de itens ocultos.
CREATE POLICY "Tenants can manage their own hidden items"
ON public.hidden_default_items
FOR ALL
USING (user_id = public.get_tenant_id())
WITH CHECK (user_id = public.get_tenant_id());

-- Função de Trigger para definir o user_id automaticamente ao inserir.
-- O cliente só precisa informar o item a ser ocultado, o banco de dados cuida do resto.
CREATE OR REPLACE FUNCTION public.set_hidden_item_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := public.get_tenant_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que aciona a função acima antes de cada inserção.
CREATE TRIGGER set_tenant_on_hidden_item_insert
BEFORE INSERT ON public.hidden_default_items
FOR EACH ROW EXECUTE FUNCTION public.set_hidden_item_tenant_id();

-- Função para buscar GRUPOS DE AÇÃO visíveis para o usuário.
-- Retorna os grupos do usuário + os grupos padrão que não foram ocultos.
CREATE OR REPLACE FUNCTION get_visible_action_groups()
RETURNS SETOF public.action_groups
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.action_groups ag
  WHERE ag.user_id = public.get_tenant_id()
  UNION ALL
  SELECT * FROM public.action_groups ag
  WHERE ag.user_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.hidden_default_items h
      WHERE h.item_id = ag.id
        AND h.user_id = public.get_tenant_id()
        AND h.item_type = 'action_group'
    );
END;
$$;

-- Função para buscar TIPOS DE AÇÃO visíveis para o usuário.
CREATE OR REPLACE FUNCTION get_visible_action_types()
RETURNS SETOF public.action_types
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.action_types at
  WHERE at.user_id = public.get_tenant_id()
  UNION ALL
  SELECT * FROM public.action_types at
  WHERE at.user_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.hidden_default_items h
      WHERE h.item_id = at.id
        AND h.user_id = public.get_tenant_id()
        AND h.item_type = 'action_type'
    );
END;
$$;

-- Função para buscar FONTES DE LEADS visíveis para o usuário.
-- Como fontes de leads são sempre padrão, apenas removemos as que o usuário ocultou.
CREATE OR REPLACE FUNCTION get_visible_lead_sources()
RETURNS SETOF public.lead_sources
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.lead_sources ls
  WHERE NOT EXISTS (
      SELECT 1 FROM public.hidden_default_items h
      WHERE h.item_id = ls.id
        AND h.user_id = public.get_tenant_id()
        AND h.item_type = 'lead_source'
    );
END;
$$;
