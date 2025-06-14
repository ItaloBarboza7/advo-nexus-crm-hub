
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Este script procura por gatilhos (triggers) do tipo "BEFORE DELETE"
    -- na tabela "action_groups" e os remove, junto com suas funções associadas.
    -- Isso é necessário para permitir que a exclusão em cascata (ON DELETE CASCADE) funcione corretamente.

    FOR rec IN
        SELECT
            tg.tgname AS trigger_name,
            p.proname AS function_name,
            n.nspname AS function_schema
        FROM
            pg_trigger tg
            JOIN pg_class c ON tg.tgrelid = c.oid
            JOIN pg_namespace ns ON c.relnamespace = ns.oid
            JOIN pg_proc p ON tg.tgfoid = p.oid
            JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE
            c.relname = 'action_groups'
            AND ns.nspname = 'public'
            AND (tg.tgtype & 2) <> 0 -- Confirma que é um gatilho 'BEFORE'
            AND (tg.tgtype & 8) <> 0 -- Confirma que é um gatilho 'DELETE'
    LOOP
        RAISE NOTICE 'Removendo gatilho obsoleto: %', rec.trigger_name;
        EXECUTE 'DROP TRIGGER ' || quote_ident(rec.trigger_name) || ' ON public.action_groups;';

        RAISE NOTICE 'Removendo função obsoleta associada: %.%', quote_ident(rec.function_schema), quote_ident(rec.function_name);
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(rec.function_schema) || '.' || quote_ident(rec.function_name) || '();';
    END LOOP;
END;
$$;
