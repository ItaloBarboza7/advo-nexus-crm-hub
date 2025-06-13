
-- Criar tabela para armazenar dados temporários de compra
CREATE TABLE public.pending_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  customer_data JSONB NOT NULL,
  plan_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours')
);

-- Habilitar RLS
ALTER TABLE public.pending_purchases ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção (será usado pela edge function)
CREATE POLICY "Allow insert pending purchases" ON public.pending_purchases
  FOR INSERT WITH CHECK (true);

-- Política para permitir leitura (será usado pela edge function)
CREATE POLICY "Allow read pending purchases" ON public.pending_purchases
  FOR SELECT USING (true);

-- Política para permitir exclusão (para limpeza)
CREATE POLICY "Allow delete pending purchases" ON public.pending_purchases
  FOR DELETE USING (true);
