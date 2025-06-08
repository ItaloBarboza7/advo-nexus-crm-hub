
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      
      // Buscar grupos de ação
      const { data: groupsData, error: groupsError } = await supabase
        .from('action_groups')
        .select('*')
        .order('name');

      if (groupsError) {
        console.error('Erro ao buscar grupos de ação:', groupsError);
      } else {
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

      // Buscar motivos de perda
      const { data: lossData, error: lossError } = await supabase
        .from('loss_reasons')
        .select('*')
        .order('reason');

      if (lossError) {
        console.error('Erro ao buscar motivos de perda:', lossError);
      } else {
        setLossReasons(lossData || []);
      }
    } catch (error) {
      console.error('Erro inesperado ao buscar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    fetchAllData();
  };

  const deleteLeadSource = async (sourceId: string) => {
    try {
      const { error } = await supabase
        .from('lead_sources')
        .delete()
        .eq('id', sourceId);

      if (error) {
        console.error('Erro ao excluir fonte:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir a fonte de lead.",
          variant: "destructive"
        });
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Fonte de lead excluída com sucesso.",
      });

      await fetchAllData();
    } catch (error) {
      throw error;
    }
  };

  const deleteActionGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('action_groups')
        .delete()
        .eq('id', groupId);

      if (error) {
        console.error('Erro ao excluir grupo:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o grupo de ação.",
          variant: "destructive"
        });
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Grupo de ação excluído com sucesso.",
      });

      await fetchAllData();
    } catch (error) {
      throw error;
    }
  };

  const deleteActionType = async (typeId: string) => {
    try {
      const { error } = await supabase
        .from('action_types')
        .delete()
        .eq('id', typeId);

      if (error) {
        console.error('Erro ao excluir tipo:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o tipo de ação.",
          variant: "destructive"
        });
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Tipo de ação excluído com sucesso.",
      });

      await fetchAllData();
    } catch (error) {
      throw error;
    }
  };

  const deleteLossReason = async (reasonId: string) => {
    try {
      const { error } = await supabase
        .from('loss_reasons')
        .delete()
        .eq('id', reasonId);

      if (error) {
        console.error('Erro ao excluir motivo:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o motivo de perda.",
          variant: "destructive"
        });
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Motivo de perda excluído com sucesso.",
      });

      await fetchAllData();
    } catch (error) {
      throw error;
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
    isLoading,
    refreshData,
    deleteLeadSource,
    deleteActionGroup,
    deleteActionType,
    deleteLossReason
  };
};
