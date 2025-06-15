
-- Migration to fix action group deletion and uniqueness issues.

-- =================================================================
-- Tabela: action_groups
-- =================================================================

-- Step 1: Remove old global unique constraint on 'name' if it exists.
ALTER TABLE public.action_groups DROP CONSTRAINT IF EXISTS action_groups_name_key;

-- Step 2: Remove the tenant-specific unique constraint if it exists, to recreate it safely.
ALTER TABLE public.action_groups DROP CONSTRAINT IF EXISTS action_groups_name_user_id_key;

-- Step 3: Add tenant-specific unique constraint on 'name' and 'user_id'.
ALTER TABLE public.action_groups ADD CONSTRAINT action_groups_name_user_id_key UNIQUE (name, user_id);

-- =================================================================
-- Tabela: action_types
-- =================================================================

-- Step 4: Remove old global unique constraint on 'name' if it exists.
ALTER TABLE public.action_types DROP CONSTRAINT IF EXISTS action_types_name_key;

-- Step 5: Remove the group-specific unique constraint if it exists, to recreate it safely.
-- This is the constraint that caused the previous migration to fail.
ALTER TABLE public.action_types DROP CONSTRAINT IF EXISTS action_types_name_action_group_id_key;

-- Step 6: Add group-specific unique constraint on 'name' and 'action_group_id'.
ALTER TABLE public.action_types ADD CONSTRAINT action_types_name_action_group_id_key UNIQUE (name, action_group_id);

-- =================================================================
-- Trigger Function
-- =================================================================

-- Step 7: Update the trigger function to run as SECURITY DEFINER.
-- This fixes the deletion issue by allowing the function to update leads
-- without being blocked by the user's RLS policies.
-- It is also scoped to the correct tenant.
CREATE OR REPLACE FUNCTION public.move_leads_to_outros_on_action_group_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Update leads belonging to the same tenant as the deleted action group.
    UPDATE public.leads
    SET 
        action_group = 'Outros', -- Move to default 'Outros' group
        action_type = NULL      -- Clear specific action type
    WHERE 
        action_group = OLD.name AND user_id = OLD.user_id;

    RETURN OLD;
END;
$function$;
