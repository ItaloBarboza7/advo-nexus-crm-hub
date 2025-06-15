
-- Adiciona a coluna updated_at à tabela loss_reasons para controle de alterações de motivos de perda.
ALTER TABLE public.loss_reasons
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Cria trigger para atualizar o updated_at sempre que algum registro for alterado.
CREATE OR REPLACE FUNCTION public.update_updated_at_loss_reasons()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_loss_reasons_updated_at ON public.loss_reasons;
CREATE TRIGGER trg_update_loss_reasons_updated_at
BEFORE UPDATE ON public.loss_reasons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_loss_reasons();
