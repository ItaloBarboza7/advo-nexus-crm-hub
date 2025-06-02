
import { useMemo } from "react";
import { Lead } from "@/types/lead";
import { useLeadStatusHistory } from "@/hooks/useLeadStatusHistory";

export const useAnalysisLogic = (leads: Lead[], selectedCategory: string) => {
  const { statusHistory, hasLeadPassedThroughStatus } = useLeadStatusHistory();

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
        // Verificar se o lead passou por "Proposta" ou "Reunião"
        const hasPassedThroughTargetStatuses = hasLeadPassedThroughStatus(lead.id, ["Proposta", "Reunião"]);
        
        if (!hasPassedThroughTargetStatuses) {
          return false;
        }
        
        // Verificar se o lead não retornou para "Novo" após passar por "Proposta" ou "Reunião"
        const leadHistory = statusHistory
          .filter(history => history.lead_id === lead.id)
          .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
        
        // Encontrar quando o lead passou por "Proposta" ou "Reunião" pela primeira vez
        const firstTargetStatusIndex = leadHistory.findIndex(history => 
          ["Proposta", "Reunião"].includes(history.new_status)
        );
        
        if (firstTargetStatusIndex === -1) {
          return false;
        }
        
        // Verificar se após passar por "Proposta" ou "Reunião", o lead não retornou para "Novo"
        const subsequentHistory = leadHistory.slice(firstTargetStatusIndex + 1);
        const hasReturnedToNovo = subsequentHistory.some(history => history.new_status === "Novo");
        
        return !hasReturnedToNovo;
      });
    } else if (selectedCategory === "estados") {
      categoryFilteredLeads = leads;
    }
    
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
