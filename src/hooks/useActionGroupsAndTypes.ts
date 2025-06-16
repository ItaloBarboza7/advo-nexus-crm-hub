
import { useTenantFilterOptions } from "@/hooks/useTenantFilterOptions";

// Este hook centraliza o fornecimento dos nomes válidos de actionGroups e actionTypes
export function useActionGroupsAndTypes() {
  const { actionGroups, actionTypes, loading } = useTenantFilterOptions();

  // Extraímos só os nomes atuais (não deletados)
  const validActionGroupNames = actionGroups.map(ag => ag.name);
  const validActionTypeNames = actionTypes.map(at => at.name);

  return {
    validActionGroupNames,
    validActionTypeNames,
    actionGroups,
    actionTypes,
    loadingActionOptions: loading
  };
}
