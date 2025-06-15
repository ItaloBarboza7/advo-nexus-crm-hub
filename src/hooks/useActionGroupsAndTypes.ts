
import { useFilterOptions } from "@/hooks/useFilterOptions";

// Este hook centraliza o fornecimento dos nomes válidos de actionGroups e actionTypes
export function useActionGroupsAndTypes() {
  const { actionGroups, actionTypes, loading } = useFilterOptions();

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
