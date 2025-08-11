
  -- 1) Permitir phone_number nulo
ALTER TABLE public.whatsapp_connections
  ALTER COLUMN phone_number DROP NOT NULL;

-- 2) Remover a unique constraint antiga (nome conforme o erro reportado)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'whatsapp_conecctions_phone_number_tenant_id_key'
      AND conrelid = 'public.whatsapp_connections'::regclass
  ) THEN
    ALTER TABLE public.whatsapp_connections
      DROP CONSTRAINT whatsapp_conecctions_phone_number_tenant_id_key;
  END IF;
END $$;

-- 3) Normalizar valores vazios para NULL
UPDATE public.whatsapp_connections
SET phone_number = NULL
WHERE phone_number = '';

-- 4) Criar índice único parcial (aplica-se só quando phone_number não é nulo)
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_connections_tenant_phone_unique
  ON public.whatsapp_connections (tenant_id, phone_number)
  WHERE phone_number IS NOT NULL;
  