
-- Permite SELECT (leitura) para todos usuários logados
CREATE POLICY "Allow select for all users"
  ON public.kanban_columns
  FOR SELECT
  USING (true);

-- Permite UPDATE (edição) para todos usuários logados
CREATE POLICY "Allow update for all users"
  ON public.kanban_columns
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Permite DELETE para todos usuários logados (opcional, se precisa deletar colunas por código)
CREATE POLICY "Allow delete for all users"
  ON public.kanban_columns
  FOR DELETE
  USING (true);

ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
