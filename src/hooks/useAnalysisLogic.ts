
import { useMemo } from "react";
import { Lead } from "@/types/lead";

export const useAnalysisLogic = (leads: Lead[], selectedCategory: string) => {
  const getLeadsForChart = useMemo(() => {
    let categoryFilteredLeads = leads;
    
    // Extrair a categoria principal (antes do hífen se houver)
    const mainCategory = selectedCategory.split('-')[0];
    
    if (mainCategory === "perdas") {
      categoryFilteredLeads = leads.filter(lead => lead.status === "Perdido");
    } else if (mainCategory === "contratos") {
      categoryFilteredLeads = leads.filter(lead => lead.status === "Contrato Fechado");
    } else if (mainCategory === "oportunidades") {
      categoryFilteredLeads = leads.filter(lead => ["Novo", "Proposta", "Reunião"].includes(lead.status));
    } else if (selectedCategory === "estados") {
      categoryFilteredLeads = leads;
    }
    
    return categoryFilteredLeads;
  }, [leads, selectedCategory]);

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
