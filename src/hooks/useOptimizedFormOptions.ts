
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
  isReady: boolean;
  // Additional properties for compatibility
  sources: Array<{ name: string; label: string }>;
  actionTypes: Array<{ id: string; name: string; action_group_id: string | null }>;
  states: Array<{ value: string; label: string }>;
  isLoading: boolean;
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
    actionTypes,
    stateOptions,
    loading: filterOptionsLoading,
    refreshData: refreshFilterData
  } = useFilterOptions();
  
  const { lossReasons, addLossReason } = useLossReasonsGlobal();
  const { columns: kanbanColumns, isLoading: kanbanLoading } = useKanbanColumns();

  // Map sourceOptions to sources format for compatibility
  const sources = useMemo(() => 
    sourceOptions.map(option => ({
      name: option.value,
      label: option.label
    })), [sourceOptions]);

  // Cache the data locally to prevent unnecessary re-renders
  const cachedOptions = useMemo(() => ({
    sourceOptions,
    actionGroupOptions,
    actionGroups,
    lossReasons,
    kanbanColumns,
    getActionTypeOptions,
    refreshData: refreshFilterData,
    addLossReason,
    isReady,
    // Additional compatibility properties
    sources,
    actionTypes,
    states: stateOptions,
    isLoading: filterOptionsLoading || kanbanLoading
  }), [
    sourceOptions,
    actionGroupOptions,
    actionGroups,
    lossReasons,
    kanbanColumns,
    getActionTypeOptions,
    refreshFilterData,
    addLossReason,
    isReady,
    sources,
    actionTypes,
    stateOptions,
    filterOptionsLoading,
    kanbanLoading
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

  return cachedOptions;
}
