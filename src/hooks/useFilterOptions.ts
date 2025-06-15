import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ActionGroup {
  id: string;
  name: string;
  description: string;
}

interface ActionType {
  id: string;
  name: string;
  action_group_id: string;
}

interface LeadSource {
  id: string;
  name: string;
  label: string;
}

export const useFilterOptions = () => {
  const [actionGroups, setActionGroups] = useState<ActionGroup[]>([]);
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Buscar grupos de ação
      const { data: groupsData, error: groupsError } = await supabase
        .from('action_groups')
        .select('*')
        .order('name');

      if (groupsError) {
        console.error('Erro ao buscar grupos de ação:', groupsError);
      } else {
        console.log('Fetched Action Groups from useFilterOptions:', groupsData);
        setActionGroups(groupsData || []);
      }

      // Buscar tipos de ação
      const { data: typesData, error: typesError } = await supabase
        .from('action_types')
        .select('*')
        .order('name');

      if (typesError) {
        console.error('Erro ao buscar tipos de ação:', typesError);
      } else {
        console.log('Fetched Action Types from useFilterOptions:', typesData);
        setActionTypes(typesData || []);
      }

      // Buscar fontes de leads
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('lead_sources')
        .select('*')
        .order('label');

      if (sourcesError) {
        console.error('Erro ao buscar fontes de leads:', sourcesError);
      } else {
        setLeadSources(sourcesData || []);
      }
    } catch (error) {
      console.error('Erro inesperado ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    fetchAllData();
  };

  // Converter para formato compatível com os selects existentes
  const statusOptions = [
    { value: "Novo", label: "Novo" },
    { value: "Reunião", label: "Reunião" },
    { value: "Proposta", label: "Proposta" },
    { value: "Contrato Fechado", label: "Contrato Fechado" },
    { value: "Perdido", label: "Perdido" }
  ];

  const sourceOptions = leadSources.map(source => ({
    value: source.name,
    label: source.label
  }));

  const actionGroupOptions = actionGroups.map(group => ({
    value: group.name,
    label: group.description || group.name
  }));

  // Função para obter todos os tipos de ação para filtros
  const getAllActionTypeOptions = () => {
    return actionTypes.map(type => ({
      value: type.name,
      label: type.name.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    }));
  };

  const getActionTypeOptions = (actionGroupName: string) => {
    const actionGroup = actionGroups.find(group => group.name === actionGroupName);
    if (!actionGroup) return [];

    return actionTypes
      .filter(type => type.action_group_id === actionGroup.id)
      .map(type => ({
        value: type.name,
        label: type.name.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
      }));
  };

  const stateOptions = [
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
  ];

  return {
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
    refreshData
  };
};
