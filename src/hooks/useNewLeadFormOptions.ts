
import { useState, useEffect } from "react";
import { useFilterOptions } from "@/hooks/useFilterOptions";

export function useNewLeadFormOptions() {
  const [isReady, setIsReady] = useState(false);
  const { 
    sourceOptions, 
    actionGroupOptions, 
    getActionTypeOptions,
    loading,
    refreshData
  } = useFilterOptions();

  useEffect(() => {
    console.log("🔄 useNewLeadFormOptions - Estado de carregamento:", { 
      loading, 
      sourceOptionsLength: sourceOptions.length, 
      actionGroupOptionsLength: actionGroupOptions.length 
    });

    if (!loading) {
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
    addActionGroup: async (name: string, description: string) => {
      // Esta funcionalidade será removida pois não faz sentido adicionar 
      // dados nas tabelas públicas diretamente do formulário
      console.warn("Funcionalidade de adicionar grupos não está mais disponível");
      return false;
    },
    addActionType: async (name: string, actionGroupId: string) => {
      console.warn("Funcionalidade de adicionar tipos não está mais disponível");
      return false;
    },
    addLeadSource: async (name: string, label: string) => {
      console.warn("Funcionalidade de adicionar fontes não está mais disponível");
      return false;
    }
  };
}
