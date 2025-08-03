import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useKanbanColumns } from "@/hooks/useKanbanColumns";

interface ActionGroup {
  id: string;
  name: string;
  description: string;
  user_id?: string | null;
}

interface ActionType {
  id: string;
  name: string;
  action_group_id: string | null;
  user_id?: string | null;
}

interface LeadSource {
  id: string;
  name: string;
  label: string;
  user_id?: string | null;
}

export const useFilterOptions = () => {
  const [actionGroups, setActionGroups] = useState<ActionGroup[]>([]);
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastFetchTimeRef = useRef(0);
  
  // Get Kanban columns for dynamic status options
  const { columns: kanbanColumns, isLoading: columnsLoading } = useKanbanColumns();

  // Debounce mechanism to prevent rapid successive calls
  const FETCH_DEBOUNCE_MS = 1000;

  const fetchAllData = useCallback(async () => {
    const now = Date.now();
    if (fetchingRef.current || (now - lastFetchTimeRef.current) < FETCH_DEBOUNCE_MS) {
      console.log("🚫 useFilterOptions - Fetch skipped (debounce or already fetching)");
      return;
    }
    
    try {
      fetchingRef.current = true;
      lastFetchTimeRef.current = now;
      setLoading(true);

      const [groupsResult, typesResult, sourcesResult] = await Promise.all([
        supabase.rpc('get_visible_action_groups').order('name'),
        supabase.rpc('get_visible_action_types').order('name'),
        supabase.rpc('get_visible_lead_sources').order('label', { ascending: true })
      ]);

      if (mountedRef.current) {
        if (groupsResult.error) {
          console.error('[useFilterOptions] Erro ao buscar grupos de ação:', groupsResult.error);
        } else {
          const newGroups = groupsResult.data || [];
          setActionGroups(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(newGroups)) {
              console.log('✅ useFilterOptions - Action groups updated:', newGroups.length);
              return newGroups;
            }
            return prev;
          });
        }

        if (typesResult.error) {
          console.error('[useFilterOptions] Erro ao buscar tipos de ação:', typesResult.error);
        } else {
          const newTypes = typesResult.data || [];
          setActionTypes(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(newTypes)) {
              console.log('✅ useFilterOptions - Action types updated:', newTypes.length);
              return newTypes;
            }
            return prev;
          });
        }

        if (sourcesResult.error) {
          console.error('[useFilterOptions] Erro ao buscar fontes de leads:', sourcesResult.error);
        } else {
          const newSources = sourcesResult.data || [];
          setLeadSources(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(newSources)) {
              console.log('✅ useFilterOptions - Lead sources updated:', newSources.length);
              return newSources;
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error('[useFilterOptions] Erro inesperado ao buscar dados:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, []);

  // Force refresh data function
  const refreshData = useCallback(() => {
    console.log('🔄 useFilterOptions - Force refreshing data...');
    lastFetchTimeRef.current = 0; // Reset debounce timer
    fetchingRef.current = false; // Reset fetching flag
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    console.log('🚀 useFilterOptions - Initial data fetch');
    if (!fetchingRef.current) {
      fetchAllData();
    }
  }, [fetchAllData]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Dynamic status options from Kanban columns
  const statusOptions = useMemo(() => 
    kanbanColumns.map(column => ({
      value: column.name,
      label: column.name
    })), [kanbanColumns]);

  const stateOptions = useMemo(() => [
    { value: "Acre", label: "Acre" },
    { value: "Alagoas", label: "Alagoas" },
    { value: "Amapá", label: "Amapá" },
    { value: "Amazonas", label: "Amazonas" },
    { value: "Bahia", label: "Bahia" },
    { value: "Ceará", label: "Ceará" },
    { value: "Distrito Federal", label: "Distrito Federal" },
    { value: "Espírito Santo", label: "Espírito Santo" },
    { value: "Goiás", label: "Goiás" },
    { value: "Maranhão", label: "Maranhão" },
    { value: "Mato Grosso", label: "Mato Grosso" },
    { value: "Mato Grosso do Sul", label: "Mato Grosso do Sul" },
    { value: "Minas Gerais", label: "Minas Gerais" },
    { value: "Pará", label: "Pará" },
    { value: "Paraíba", label: "Paraíba" },
    { value: "Paraná", label: "Paraná" },
    { value: "Pernambuco", label: "Pernambuco" },
    { value: "Piauí", label: "Piauí" },
    { value: "Rio de Janeiro", label: "Rio de Janeiro" },
    { value: "Rio Grande do Norte", label: "Rio Grande do Norte" },
    { value: "Rio Grande do Sul", label: "Rio Grande do Sul" },
    { value: "Rondônia", label: "Rondônia" },
    { value: "Roraima", label: "Roraima" },
    { value: "Santa Catarina", label: "Santa Catarina" },
    { value: "São Paulo", label: "São Paulo" },
    { value: "Sergipe", label: "Sergipe" },
    { value: "Tocantins", label: "Tocantins" }
  ], []);

  // Memoize computed options to prevent recreation
  const sourceOptions = useMemo(() => 
    leadSources.map(source => ({
      value: source.name,
      label: source.label
    })), [leadSources]);

  const actionGroupOptions = useMemo(() => 
    actionGroups.map(group => ({
      value: group.name,
      label: group.description || group.name
    })), [actionGroups]);

  // Enhanced action type options with better formatting
  const getAllActionTypeOptions = useMemo(() => {
    return () => {
      return actionTypes.map(type => ({
        value: type.name,
        label: formatActionTypeName(type.name)
      }));
    };
  }, [actionTypes]);

  const getActionTypeOptions = useMemo(() => {
    return (actionGroupName: string) => {
      const actionGroup = actionGroups.find(group => group.name === actionGroupName);
      if (!actionGroup) return [];

      return actionTypes
        .filter(type => type.action_group_id === actionGroup.id)
        .map(type => ({
          value: type.name,
          label: formatActionTypeName(type.name)
        }));
    };
  }, [actionGroups, actionTypes]);

  // Helper function to format action type names for better display
  const formatActionTypeName = (name: string) => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Memoize the return object to prevent recreation
  return useMemo(() => ({
    statusOptions,
    sourceOptions,
    actionGroupOptions,
    getActionTypeOptions,
    getAllActionTypeOptions,
    stateOptions,
    actionGroups,
    actionTypes,
    leadSources,
    loading: loading || columnsLoading,
    refreshData
  }), [
    statusOptions,
    sourceOptions,
    actionGroupOptions,
    getActionTypeOptions,
    getAllActionTypeOptions,
    stateOptions,
    actionGroups,
    actionTypes,
    leadSources,
    loading,
    columnsLoading,
    refreshData
  ]);
};
