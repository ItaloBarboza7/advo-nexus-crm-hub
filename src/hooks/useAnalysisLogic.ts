import { useMemo } from "react";
import { Lead } from "@/types/lead";

interface LeadStatusHistory {
  id: string;
  lead_id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
}

export const useAnalysisLogic = (
  leads: Lead[], 
  selectedCategory: string,
  statusHistory: LeadStatusHistory[],
  hasLeadPassedThroughStatus: (leadId: string, statuses: string[]) => boolean
) => {
  const getLeadsForChart = useMemo(() => {
    let categoryFilteredLeads = leads;
    
    // Extrair a categoria principal (antes do hífen se houver)
    const mainCategory = selectedCategory.split('-')[0];
    
    if (mainCategory === "perdas") {
      categoryFilteredLeads = leads.filter(lead => lead.status === "Perdido");
    } else if (mainCategory === "contratos") {
      categoryFilteredLeads = leads.filter(lead => lead.status === "Contrato Fechado");
    } else if (mainCategory === "oportunidades") {
      // REGRA CORRIGIDA: Oportunidades são leads que:
      // 1. NÃO estão em "Novo" (independente do histórico)
      // 2. NÃO estão em "Perdido" ou "Contrato Fechado"
      // 3. Estão em "Proposta", "Reunião" ou passaram por eles
      categoryFilteredLeads = leads.filter(lead => {
        console.log(`🔍 Analisando lead ${lead.name} (${lead.id}) com status atual: ${lead.status}`);
        
        // PRIMEIRO: Excluir completamente leads com status "Novo"
        if (lead.status === "Novo") {
          console.log(`❌ Lead ${lead.name} está em Novo - SEMPRE EXCLUÍDO de oportunidades`);
          return false;
        }
        
        // SEGUNDO: Excluir leads com status final (Perdido/Contrato Fechado)
        if (lead.status === "Perdido" || lead.status === "Contrato Fechado") {
          console.log(`❌ Lead ${lead.name} está em status final (${lead.status}) - EXCLUÍDO de oportunidades`);
          return false;
        }
        
        // TERCEIRO: Para leads em outros status, verificar se passaram por Proposta/Reunião
        const hasPassedThroughTargetStatuses = hasLeadPassedThroughStatus(lead.id, ["Proposta", "Reunião"]);
        console.log(`📊 Lead ${lead.name} (${lead.status}) passou por Proposta/Reunião: ${hasPassedThroughTargetStatuses}`);
        
        // Se está em Proposta ou Reunião atualmente, incluir automaticamente
        if (lead.status === "Proposta" || lead.status === "Reunião") {
          console.log(`✅ Lead ${lead.name} está atualmente em ${lead.status} - INCLUÍDO`);
          return true;
        }
        
        // Para outros status, deve ter passado por Proposta/Reunião
        if (!hasPassedThroughTargetStatuses) {
          console.log(`❌ Lead ${lead.name} não passou por Proposta/Reunião - EXCLUÍDO`);
          return false;
        }
        
        console.log(`✅ Lead ${lead.name} passou por Proposta/Reunião e está em ${lead.status} - INCLUÍDO`);
        return true;
      });
    } else if (selectedCategory === "estados") {
      categoryFilteredLeads = leads;
    }
    
    console.log(`🎯 Total de leads filtrados para ${selectedCategory}:`, categoryFilteredLeads.length);
    console.log(`📋 Leads incluídos:`, categoryFilteredLeads.map(l => `${l.name} (${l.status})`));
    
    return categoryFilteredLeads;
  }, [leads, selectedCategory, statusHistory, hasLeadPassedThroughStatus]);

  const shouldShowChart = () => selectedCategory !== "all";
  const shouldShowLossReasonsChart = () => {
    const mainCategory = selectedCategory.split('-')[0];
    return mainCategory === "perdas" && selectedCategory === "perdas";
  };
  const shouldShowActionTypesChart = () => {
    const mainCategory = selectedCategory.split('-')[0];
    return (mainCategory === "contratos" && selectedCategory === "contratos") || 
           (mainCategory === "oportunidades" && selectedCategory === "oportunidades") || 
           (mainCategory === "perdas" && selectedCategory === "perdas");
  };
  const shouldShowActionGroupChart = () => {
    return selectedCategory === "contratos-grupo-acao" || 
           selectedCategory === "oportunidades-grupo-acao" ||
           selectedCategory === "perdas-grupo-acao";
  };
  const shouldShowStateChart = () => {
    const mainCategory = selectedCategory.split('-')[0];
    return selectedCategory === "estados" || 
           selectedCategory === "contratos-estados" || 
           selectedCategory === "oportunidades-estados" || 
           selectedCategory === "perdas-estados";
  };

  return {
    getLeadsForChart,
    shouldShowChart,
    shouldShowLossReasonsChart,
    shouldShowActionTypesChart,
    shouldShowActionGroupChart,
    shouldShowStateChart
  };
};
