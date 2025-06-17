
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

  // CORREÇÃO: Melhorar a lógica de quando o formulário está pronto
  useEffect(() => {
    console.log("🔄 useNewLeadFormOptions - Estado de carregamento:", { 
      loading, 
      sourceOptionsLength: sourceOptions.length, 
      actionGroupOptionsLength: actionGroupOptions.length 
    });

    if (!loading) {
      // Considera pronto quando não está mais carregando, independente se há dados ou não
      // Isso permite que o formulário funcione mesmo se não houver dados iniciais
      setIsReady(true);
    } else {
      setIsReady(false);
    }
  }, [loading, sourceOptions.length, actionGroupOptions.length]);

  console.log("📋 useNewLeadFormOptions - Estado final:", { isReady, loading });

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
