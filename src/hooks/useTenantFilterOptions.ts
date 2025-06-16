
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSchema } from "@/hooks/useTenantSchema";

interface ActionGroup {
  id: string;
  name: string;
  description: string;
}

interface ActionType {
  id: string;
  name: string;
  action_group_id: string | null;
}

interface LeadSource {
  id: string;
  name: string;
  label: string;
}

export const useTenantFilterOptions = () => {
  const [actionGroups, setActionGroups] = useState<ActionGroup[]>([]);
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      console.log("📊 useTenantFilterOptions - Buscando dados do esquema do tenant...");
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return;
      }

      // Buscar grupos de ação
      const { data: groupsData, error: groupsError } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT * FROM ${schema}.action_groups ORDER BY name`
      });

      if (groupsError) {
        console.error('❌ Erro ao buscar grupos de ação:', groupsError);
      } else {
        const groups = Array.isArray(groupsData) ? groupsData : [];
        console.log(`✅ useTenantFilterOptions - ${groups.length} grupos de ação carregados`);
        setActionGroups(groups);
      }

      // Buscar tipos de ação
      const { data: typesData, error: typesError } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT * FROM ${schema}.action_types ORDER BY name`
      });

      if (typesError) {
        console.error('❌ Erro ao buscar tipos de ação:', typesError);
      } else {
        const types = Array.isArray(typesData) ? typesData : [];
        console.log(`✅ useTenantFilterOptions - ${types.length} tipos de ação carregados`);
        setActionTypes(types);
      }

      // Buscar fontes de leads
      const { data: sourcesData, error: sourcesError } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT * FROM ${schema}.lead_sources ORDER BY label`
      });

      if (sourcesError) {
        console.error('❌ Erro ao buscar fontes de leads:', sourcesError);
      } else {
        const sources = Array.isArray(sourcesData) ? sourcesData : [];
        console.log(`✅ useTenantFilterOptions - ${sources.length} fontes de leads carregadas`);
        setLeadSources(sources);
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar dados do tenant:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantSchema, ensureTenantSchema]);

  useEffect(() => {
    if (tenantSchema) {
      fetchAllData();
    }
  }, [tenantSchema, fetchAllData]);

  const refreshData = () => fetchAllData();

  // Funções para adicionar novos itens
  const addActionGroup = async (name: string, description: string) => {
    try {
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) return false;

      const { error } = await supabase.rpc('exec_sql' as any, {
        sql: `INSERT INTO ${schema}.action_groups (name, description) VALUES ('${name}', '${description}')`
      });

      if (error) {
        console.error('❌ Erro ao adicionar grupo de ação:', error);
        return false;
      }

      await refreshData();
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao adicionar grupo:', error);
      return false;
    }
  };

  const addActionType = async (name: string, actionGroupId: string) => {
    try {
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) return false;

      const { error } = await supabase.rpc('exec_sql' as any, {
        sql: `INSERT INTO ${schema}.action_types (name, action_group_id) VALUES ('${name}', '${actionGroupId}')`
      });

      if (error) {
        console.error('❌ Erro ao adicionar tipo de ação:', error);
        return false;
      }

      await refreshData();
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao adicionar tipo:', error);
      return false;
    }
  };

  const addLeadSource = async (name: string, label: string) => {
    try {
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) return false;

      const { error } = await supabase.rpc('exec_sql' as any, {
        sql: `INSERT INTO ${schema}.lead_sources (name, label) VALUES ('${name}', '${label}')`
      });

      if (error) {
        console.error('❌ Erro ao adicionar fonte de lead:', error);
        return false;
      }

      await refreshData();
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao adicionar fonte:', error);
      return false;
    }
  };

  // Converter para formato compatível com os selects existentes
  const statusOptions = [
    { value: "Novo", label: "Novo" },
    { value: "Reunião", label: "Reunião" },
    { value: "Proposta", label: "Proposta" },
    { value: "Contrato Fechado", label: "Contrato Fechado" },
    { value: "Perdido", label: "Perdido" },
    { value: "Finalizado", label: "Finalizado" }
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
    refreshData,
    addActionGroup,
    addActionType,
    addLeadSource
  };
};
