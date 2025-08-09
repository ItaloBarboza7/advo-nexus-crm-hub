
-- Atualizar a função exec_sql para incluir validação de tenant schema
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result jsonb;
  rec record;
  results jsonb := '[]'::jsonb;
  row_count integer := 0;
  trimmed_sql text;
  current_tenant_schema text;
  sql_lower text;
  tenant_pattern text := 'tenant_[a-f0-9_]+';
  found_schemas text[];
  schema_name text;
BEGIN
  RAISE LOG 'Executing SQL: %', sql;
  
  -- Obter o schema do tenant atual
  current_tenant_schema := public.get_tenant_schema();
  
  -- Trim whitespace and newlines
  trimmed_sql := trim(both E' \t\n\r' from sql);
  sql_lower := lower(trimmed_sql);
  
  -- 🔒 VALIDAÇÃO DE SEGURANÇA: Verificar se há referências a outros schemas tenant_
  -- Extrair todos os schemas tenant_ mencionados no SQL
  SELECT array_agg(DISTINCT match[1])
  INTO found_schemas
  FROM regexp_split_to_table(sql_lower, E'\\s+') AS word,
       regexp_matches(word, '(tenant_[a-f0-9_]+)', 'g') AS match;
  
  -- Se encontrou schemas e algum não é o atual, bloquear
  IF found_schemas IS NOT NULL THEN
    FOREACH schema_name IN ARRAY found_schemas
    LOOP
      IF schema_name != current_tenant_schema THEN
        RAISE EXCEPTION 'ACESSO NEGADO: Tentativa de acesso ao schema % detectada. Usuário só pode acessar schema %. Operação bloqueada por segurança.', 
                       schema_name, current_tenant_schema;
      END IF;
    END LOOP;
    
    RAISE LOG 'Validação de segurança passou: todas as referências são para o schema correto %', current_tenant_schema;
  END IF;
  
  -- Continuar com a execução normal se passou na validação
  IF upper(trimmed_sql) LIKE 'SELECT%' THEN
    FOR rec IN EXECUTE sql LOOP
      results := results || jsonb_build_array(to_jsonb(rec));
      row_count := row_count + 1;
    END LOOP;
    
    RAISE LOG 'Query returned % rows for tenant schema %', row_count, current_tenant_schema;
    RETURN results;
  ELSE
    -- Para outros statements (INSERT, UPDATE, DELETE), apenas executar
    EXECUTE sql;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    RAISE LOG 'Statement affected % rows in tenant schema %', row_count, current_tenant_schema;
    RETURN jsonb_build_object('affected_rows', row_count);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro detalhado com informações de segurança
    RAISE LOG 'SQL Error for tenant schema %: % - SQL: %', current_tenant_schema, SQLERRM, sql;
    RAISE EXCEPTION 'Erro ao executar SQL para tenant %: %', current_tenant_schema, SQLERRM;
END;
$function$
