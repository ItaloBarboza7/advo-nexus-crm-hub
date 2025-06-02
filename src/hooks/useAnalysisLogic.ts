
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
      // Filtrar leads que passaram por "Proposta" ou "Reunião" mas não retornaram para "Novo"
      categoryFilteredLeads = leads.filter(lead => {
        console.log(`🔍 Analisando lead ${lead.name} (${lead.id}) com status atual: ${lead.status}`);
        
        // Se o lead está atualmente em "Novo", verificar se ele NUNCA passou por "Proposta" ou "Reunião"
        // Se ele passou e retornou para "Novo", deve ser excluído
        if (lead.status === "Novo") {
          const hasPassedThroughTargetStatuses = hasLeadPassedThroughStatus(lead.id, ["Proposta", "Reunião"]);
          console.log(`📊 Lead ${lead.name} com status Novo - passou por Proposta/Reunião: ${hasPassedThroughTargetStatuses}`);
          
          if (hasPassedThroughTargetStatuses) {
            console.log(`❌ Lead ${lead.name} retornou para Novo após passar por Proposta/Reunião - EXCLUÍDO`);
            return false;
          } else {
            console.log(`✅ Lead ${lead.name} nunca passou por Proposta/Reunião - INCLUÍDO`);
            return true;
          }
        }
        
        // Para leads que não estão em "Novo", verificar se passaram por "Proposta" ou "Reunião"
        const hasPassedThroughTargetStatuses = hasLeadPassedThroughStatus(lead.id, ["Proposta", "Reunião"]);
        console.log(`📊 Lead ${lead.name} passou por Proposta/Reunião: ${hasPassedThroughTargetStatuses}`);
        
        if (!hasPassedThroughTargetStatuses) {
          console.log(`❌ Lead ${lead.name} não passou por Proposta/Reunião - EXCLUÍDO`);
          return false;
        }
        
        console.log(`✅ Lead ${lead.name} passou por Proposta/Reunião e não está em Novo - INCLUÍDO`);
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
           selectedCategory === "perdas-tipo-acao";
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
    shouldShowStateChart
  };
};
