
-- 1. Remove the old DELETE policy so there's no conflict
DROP POLICY IF EXISTS "Tenants can delete their own non-fixed loss reasons" ON public.loss_reasons;

-- 2. Add new policy that allows tenant users to delete:
--   - their own non-fixed reasons (user_id = get_tenant_id() AND is_fixed = false)
--   - system reasons that are not fixed (user_id IS NULL AND is_fixed = false)
CREATE POLICY "Allow delete for own and deletable system loss reasons" ON public.loss_reasons
  FOR DELETE
  USING (
    (user_id = public.get_tenant_id() AND is_fixed = false)
    OR
    (user_id IS NULL AND is_fixed = false)
  );
