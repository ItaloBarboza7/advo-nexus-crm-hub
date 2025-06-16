
import { useState, useEffect } from "react";
import { useTenantFilterOptions } from "@/hooks/useTenantFilterOptions";

export function useNewLeadFormOptions() {
  const [isReady, setIsReady] = useState(false);
  const { 
    sourceOptions, 
    actionGroupOptions, 
    getActionTypeOptions,
    loading,
    addActionGroup,
    addActionType,
    addLeadSource
  } = useTenantFilterOptions();

  // Só marca como pronto quando os dados básicos estão carregados e temos pelo menos os dados mínimos
  useEffect(() => {
    if (!loading && sourceOptions.length > 0 && actionGroupOptions.length > 0) {
      setIsReady(true);
    } else if (!loading && sourceOptions.length === 0 && actionGroupOptions.length === 0) {
      // Mesmo sem dados, marca como pronto para evitar loading infinito
      setIsReady(true);
    }
  }, [loading, sourceOptions.length, actionGroupOptions.length]);

  return {
    isReady,
    loading,
    sourceOptions,
    actionGroupOptions,
    getActionTypeOptions,
    addActionGroup,
    addActionType,
    addLeadSource
  };
}
