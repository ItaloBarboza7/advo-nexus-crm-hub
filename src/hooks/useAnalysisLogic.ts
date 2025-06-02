
import { useMemo } from "react";
import { Lead } from "@/types/lead";

export const useAnalysisLogic = (leads: Lead[], selectedCategory: string) => {
  const getLeadsForChart = useMemo(() => {
    let categoryFilteredLeads = leads;
    
    if (selectedCategory === "perdas") {
      categoryFilteredLeads = leads.filter(lead => lead.status === "Perdido");
    } else if (selectedCategory === "contratos") {
      categoryFilteredLeads = leads.filter(lead => lead.status === "Contrato Fechado");
    } else if (selectedCategory === "oportunidades") {
      categoryFilteredLeads = leads.filter(lead => ["Novo", "Proposta", "Reunião"].includes(lead.status));
    } else if (selectedCategory === "estados") {
      categoryFilteredLeads = leads;
    } else if (selectedCategory === "tipo-acao") {
      categoryFilteredLeads = leads.filter(lead => lead.status === "Perdido");
    }
    
    return categoryFilteredLeads;
  }, [leads, selectedCategory]);

  const shouldShowChart = () => selectedCategory !== "all";
  const shouldShowLossReasonsChart = () => selectedCategory === "perdas";
  const shouldShowActionTypesChart = () => selectedCategory === "contratos" || selectedCategory === "oportunidades" || selectedCategory === "tipo-acao";
  const shouldShowStateChart = () => selectedCategory === "estados";

  return {
    getLeadsForChart,
    shouldShowChart,
    shouldShowLossReasonsChart,
    shouldShowActionTypesChart,
    shouldShowStateChart
  };
};
