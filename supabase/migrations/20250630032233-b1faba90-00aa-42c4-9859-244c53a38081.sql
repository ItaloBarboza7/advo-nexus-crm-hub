
-- Fix the ambiguous column reference error in the function
CREATE OR REPLACE FUNCTION public.update_tenant_closed_contracts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_record RECORD;
  tenant_schema_name text;
BEGIN
  -- Buscar todos os esquemas de tenant existentes
  FOR tenant_record IN 
    SELECT s.schema_name 
    FROM information_schema.schemata s
    WHERE s.schema_name LIKE 'tenant_%'
  LOOP
    tenant_schema_name := tenant_record.schema_name;
    
    -- Atualizar contratos fechados sem closed_by_user_id no esquema do tenant
    EXECUTE format('
      UPDATE %I.leads 
      SET closed_by_user_id = (
        SELECT get_tenant_id FROM (SELECT public.get_tenant_id()) AS t(get_tenant_id)
      )
      WHERE status = ''Contrato Fechado'' 
        AND closed_by_user_id IS NULL
    ', tenant_schema_name);
    
    RAISE LOG 'Updated closed contracts in schema: %', tenant_schema_name;
  END LOOP;
END;
$$;

-- Now run the rest of the fixes that didn't get applied:

-- 1. Corrigir a função de trigger para usar auth.uid() corretamente
CREATE OR REPLACE FUNCTION public.track_contract_closure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se o status mudou para "Contrato Fechado", registrar quem fez a mudança
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Contrato Fechado' THEN
    NEW.closed_by_user_id := auth.uid();
    RAISE LOG 'Contract closure tracked: lead_id=%, closed_by_user_id=%', NEW.id, NEW.closed_by_user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Atualizar contratos existentes que estão fechados mas sem closed_by_user_id
UPDATE public.leads 
SET closed_by_user_id = user_id 
WHERE status = 'Contrato Fechado' 
  AND closed_by_user_id IS NULL 
  AND user_id IS NOT NULL;

-- 3. Executar a atualização nos esquemas de tenant
SELECT public.update_tenant_closed_contracts();

-- 4. Melhorar a função exec_sql para debug
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  rec record;
  results jsonb := '[]'::jsonb;
  row_count integer := 0;
BEGIN
  RAISE LOG 'Executing SQL: %', sql;
  
  -- Para SELECT statements, precisamos capturar os resultados
  IF upper(trim(sql)) LIKE 'SELECT%' THEN
    FOR rec IN EXECUTE sql LOOP
      results := results || jsonb_build_array(to_jsonb(rec));
      row_count := row_count + 1;
    END LOOP;
    
    RAISE LOG 'Query returned % rows', row_count;
    RETURN results;
  ELSE
    -- Para outros statements (INSERT, UPDATE, DELETE), apenas executar
    EXECUTE sql;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    RAISE LOG 'Statement affected % rows', row_count;
    RETURN jsonb_build_object('affected_rows', row_count);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro detalhado
    RAISE LOG 'SQL Error: % - SQL: %', SQLERRM, sql;
    RAISE EXCEPTION 'Erro ao executar SQL: %', SQLERRM;
END;
$$;

-- 5. Verificar se os dados foram atualizados corretamente
SELECT 
  'public' as schema_name,
  COUNT(*) as total_closed_contracts,
  COUNT(closed_by_user_id) as contracts_with_closed_by,
  COUNT(*) - COUNT(closed_by_user_id) as contracts_without_closed_by
FROM public.leads 
WHERE status = 'Contrato Fechado';
