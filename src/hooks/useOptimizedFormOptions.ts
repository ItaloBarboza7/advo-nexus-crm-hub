
import { useState, useEffect, useRef, useMemo } from "react";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { useLossReasonsGlobal } from "@/hooks/useLossReasonsGlobal";
import { useKanbanColumns } from "@/hooks/useKanbanColumns";

export interface OptimizedFormOptions {
  sourceOptions: Array<{ value: string; label: string }>;
  actionGroupOptions: Array<{ value: string; label: string }>;
  actionGroups: Array<{ id: string; name: string; description: string }>;
  lossReasons: Array<{ id: string; reason: string }>;
  kanbanColumns: Array<{ id: string; name: string; color: string; order_position: number; is_default: boolean }>;
  getActionTypeOptions: (actionGroup: string) => Array<{ value: string; label: string }>;
  refreshData: () => void;
  addLossReason: (reason: string) => Promise<boolean>;
}

export function useOptimizedFormOptions() {
  const [isReady, setIsReady] = useState(false);
  const initializationRef = useRef(false);
  
  // Get data from existing hooks
  const { 
    sourceOptions, 
    actionGroupOptions, 
    getActionTypeOptions,
    actionGroups,
    loading: filterOptionsLoading,
    refreshData: refreshFilterData
  } = useFilterOptions();
  
  const { lossReasons, addLossReason } = useLossReasonsGlobal();
  const { columns: kanbanColumns, isLoading: kanbanLoading } = useKanbanColumns();

  // Cache the data locally to prevent unnecessary re-renders
  const cachedOptions = useMemo(() => ({
    sourceOptions,
    actionGroupOptions,
    actionGroups,
    lossReasons,
    kanbanColumns,
    getActionTypeOptions,
    refreshData: refreshFilterData,
    addLossReason
  }), [
    sourceOptions,
    actionGroupOptions,
    actionGroups,
    lossReasons,
    kanbanColumns,
    getActionTypeOptions,
    refreshFilterData,
    addLossReason
  ]);

  // Only set ready state once when all data is loaded
  useEffect(() => {
    const allDataLoaded = !filterOptionsLoading && 
                          !kanbanLoading && 
                          sourceOptions.length > 0 && 
                          actionGroupOptions.length > 0 && 
                          lossReasons.length > 0 && 
                          kanbanColumns.length > 0;

    if (allDataLoaded && !initializationRef.current) {
      console.log("🚀 useOptimizedFormOptions - All data loaded, setting ready state");
      setIsReady(true);
      initializationRef.current = true;
    }
  }, [filterOptionsLoading, kanbanLoading, sourceOptions.length, actionGroupOptions.length, lossReasons.length, kanbanColumns.length]);

  return {
    isReady,
    ...cachedOptions
  };
}
