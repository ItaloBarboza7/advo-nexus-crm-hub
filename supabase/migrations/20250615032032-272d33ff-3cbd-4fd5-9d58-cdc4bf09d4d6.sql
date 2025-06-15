
-- Atualiza o user_id de company_info para refletir o tenant (multi-tenant)
UPDATE public.company_info ci
SET user_id = COALESCE(
  (SELECT up.parent_user_id FROM public.user_profiles up WHERE up.user_id = ci.user_id),
  ci.user_id
)
WHERE EXISTS (
  SELECT 1 FROM public.user_profiles up
  WHERE up.user_id = ci.user_id
    AND (up.parent_user_id IS NOT NULL OR ci.user_id IS NOT NULL)
);
