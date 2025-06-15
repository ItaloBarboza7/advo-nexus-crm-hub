
-- 1. Cria o gatilho (trigger) para a tabela `hidden_default_items`.
-- Este gatilho garante que o `user_id` do tenant seja definido automaticamente
-- ao ocultar um item padrão, corrigindo a falha na funcionalidade de "ocultar".
CREATE TRIGGER on_hidden_item_insert_set_user_id
BEFORE INSERT ON public.hidden_default_items
FOR EACH ROW
EXECUTE FUNCTION public.set_hidden_item_tenant_id();

-- 2. Habilita a Segurança em Nível de Linha (RLS) para `hidden_default_items`.
-- Isso garante que as políticas de acesso a dados que vamos criar sejam aplicadas.
ALTER TABLE public.hidden_default_items ENABLE ROW LEVEL SECURITY;

-- 3. Cria as políticas de segurança (RLS) para `hidden_default_items`.
-- Essas políticas garantem que os tenants só possam ver e gerenciar seus próprios itens ocultos,
-- isolando os dados de cada conta.

-- Política para permitir que tenants vejam seus próprios itens ocultos.
CREATE POLICY "Tenants can view their own hidden items"
ON public.hidden_default_items
FOR SELECT
USING (user_id = public.get_tenant_id());

-- Política para permitir que tenants insiram (ocultem) seus próprios itens.
CREATE POLICY "Tenants can insert their own hidden items"
ON public.hidden_default_items
FOR INSERT
WITH CHECK (user_id = public.get_tenant_id());

-- Política para permitir que tenants atualizem seus próprios itens ocultos (caso necessário no futuro).
CREATE POLICY "Tenants can update their own hidden items"
ON public.hidden_default_items
FOR UPDATE
USING (user_id = public.get_tenant_id());

-- Política para permitir que tenants excluam (re-exibam) seus próprios itens ocultos.
CREATE POLICY "Tenants can delete their own hidden items"
ON public.hidden_default_items
FOR DELETE
USING (user_id = public.get_tenant_id());
