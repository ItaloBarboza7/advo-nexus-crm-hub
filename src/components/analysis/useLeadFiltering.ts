
import { Lead } from "@/types/lead";
import { FilterOptions } from "@/components/AdvancedFilters";

export const useLeadFiltering = (
  leads: Lead[],
  searchTerm: string,
  selectedCategory: string,
  advancedFilters: FilterOptions,
  isOpportunityLead: (lead: Lead) => boolean
) => {
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Extrair categoria principal para filtros
    const mainCategory = selectedCategory.split('-')[0];
    
    // LÓGICA CORRIGIDA: usar a mesma regra do useAnalysisLogic
    const matchesCategory = selectedCategory === "all" || 
      (mainCategory === "contratos" && lead.status === "Contrato Fechado") ||
      (mainCategory === "oportunidades" && isOpportunityLead(lead)) ||
      (mainCategory === "perdas" && lead.status === "Perdido") ||
      (selectedCategory === "estados" || selectedCategory.endsWith("-estados"));

    // Aplicar filtros avançados para todas as categorias exceto "estados"
    const matchesAdvancedFilters = selectedCategory === "estados" || selectedCategory.endsWith("-estados") || (
      (advancedFilters.status.length === 0 || advancedFilters.status.includes(lead.status)) &&
      (advancedFilters.source.length === 0 || !lead.source || advancedFilters.source.includes(lead.source)) &&
      (advancedFilters.actionType.length === 0 || !lead.action_type || advancedFilters.actionType.includes(lead.action_type)) &&
      (advancedFilters.state.length === 0 || !lead.state || advancedFilters.state.includes(lead.state)) &&
      (advancedFilters.lossReason.length === 0 || !lead.loss_reason || advancedFilters.lossReason.includes(lead.loss_reason))
    );
    
    return matchesSearch && matchesCategory && matchesAdvancedFilters;
  });

  return { filteredLeads };
};
