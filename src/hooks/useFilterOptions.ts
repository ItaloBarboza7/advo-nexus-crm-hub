import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeLossReasonUpdate } from "@/utils/lossReasonEvents";

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

interface LossReason {
  id: string;
  reason: string;
}

export const useFilterOptions = () => {
  const [actionGroups, setActionGroups] = useState<ActionGroup[]>([]);
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [lossReasons, setLossReasons] = useState<LossReason[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
    
    // Subscrever aos eventos de atualização de motivos de perda
    const unsubscribe = subscribeLossReasonUpdate(() => {
      console.log('📨 [useFilterOptions] Recebido evento de atualização de motivos de perda');
      refreshLossReasons();
    });

    return unsubscribe;
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      console.log('🔄 [useFilterOptions] Iniciando busca de todos os dados...');
      
      // Buscar grupos de ação
      console.log('📊 [useFilterOptions] Buscando grupos de ação...');
      const { data: groupsData, error: groupsError } = await supabase
        .from('action_groups')
        .select('*')
        .order('name');

      if (groupsError) {
        console.error('❌ [useFilterOptions] Erro ao buscar grupos de ação:', groupsError);
      } else {
        console.log('✅ [useFilterOptions] Grupos de ação carregados:', groupsData?.length || 0);
        setActionGroups(groupsData || []);
      }

      // Buscar tipos de ação
      console.log('📊 [useFilterOptions] Buscando tipos de ação...');
      const { data: typesData, error: typesError } = await supabase
        .from('action_types')
        .select('*')
        .order('name');

      if (typesError) {
        console.error('❌ [useFilterOptions] Erro ao buscar tipos de ação:', typesError);
      } else {
        console.log('✅ [useFilterOptions] Tipos de ação carregados:', typesData?.length || 0);
        setActionTypes(typesData || []);
      }

      // Buscar fontes de leads
      console.log('📊 [useFilterOptions] Buscando fontes de leads...');
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('lead_sources')
        .select('*')
        .order('label');

      if (sourcesError) {
        console.error('❌ [useFilterOptions] Erro ao buscar fontes de leads:', sourcesError);
      } else {
        console.log('✅ [useFilterOptions] Fontes de leads carregadas:', sourcesData?.length || 0);
        setLeadSources(sourcesData || []);
      }

      // Buscar motivos de perda
      await refreshLossReasons();
    } catch (error) {
      console.error('❌ [useFilterOptions] Erro inesperado ao buscar dados:', error);
    } finally {
      setLoading(false);
      console.log('🏁 [useFilterOptions] Busca de dados finalizada');
    }
  };

  const refreshData = async () => {
    console.log('🔄 [useFilterOptions] refreshData() chamado - forçando nova busca...');
    await fetchAllData();
  };

  // Função específica para atualizar motivos de perda
  const refreshLossReasons = async () => {
    try {
      console.log('🔄 [useFilterOptions] Atualizando apenas motivos de perda...');
      
      const { data: lossData, error: lossError } = await supabase
        .from('loss_reasons')
        .select('*')
        .order('reason');

      console.log('📋 [useFilterOptions] Nova busca de motivos de perda:');
      console.log('   - Data:', lossData);
      console.log('   - Error:', lossError);
      console.log('   - Quantidade de registros:', lossData?.length || 0);

      if (lossError) {
        console.error('❌ [useFilterOptions] Erro ao atualizar motivos de perda:', lossError);
      } else {
        console.log('✅ [useFilterOptions] Motivos de perda atualizados');
        setLossReasons(lossData || []);
      }
    } catch (error) {
      console.error('❌ [useFilterOptions] Erro inesperado ao atualizar motivos de perda:', error);
    }
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
    lossReasons,
    loading,
    refreshData,
    refreshLossReasons
  };
};
