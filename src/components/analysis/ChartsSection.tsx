
import { LossReasonsChart } from "@/components/LossReasonsChart";
import { ActionTypesChart } from "@/components/ActionTypesChart";
import { ActionGroupChart } from "@/components/ActionGroupChart";
import { StateStatsChart } from "@/components/StateStatsChart";
import { LeadsChart } from "@/components/analysis/LeadsChart";
import { Lead } from "@/types/lead";

interface ChartsSectionProps {
  leads: Lead[];
  selectedCategory: string;
  shouldShowChart: boolean;
  shouldShowLossReasonsChart: boolean;
  shouldShowActionTypesChart: boolean;
  shouldShowActionGroupChart: boolean;
  shouldShowStateChart: boolean;
  hasLeadPassedThroughStatus: (leadId: string, statuses: string[]) => boolean;
  // Nova prop para visualização de leads
  leadsViewMode?: 'weekly' | 'monthly';
}

export function ChartsSection({
  leads,
  selectedCategory,
  shouldShowChart,
  shouldShowLossReasonsChart,
  shouldShowActionTypesChart,
  shouldShowActionGroupChart,
  shouldShowStateChart,
  hasLeadPassedThroughStatus,
  leadsViewMode = 'weekly'
}: ChartsSectionProps) {
  if (!shouldShowChart) {
    return null;
  }

  // Função para verificar se um lead é uma oportunidade
  const isOpportunityLead = (lead: Lead): boolean => {
    if (lead.status === "Novo") return false;
    if (lead.status === "Perdido" || lead.status === "Contrato Fechado") return false;
    
    const hasPassedThroughTargetStatuses = hasLeadPassedThroughStatus(lead.id, ["Proposta", "Reunião"]);
    
    if (lead.status === "Proposta" || lead.status === "Reunião") return true;
    
    return hasPassedThroughTargetStatuses;
  };

  return (
    <>
      {/* Gráfico de Leads Gerais - só aparece na categoria "all" */}
      {selectedCategory === "all" && (
        <LeadsChart 
          leads={leads}
          title="Todos os Leads"
        />
      )}

      {/* Gráfico de Contratos - só aparece na categoria "contratos" */}
      {selectedCategory === "contratos" && (
        <LeadsChart 
          leads={leads}
          title="Novos Contratos"
          filterFunction={(lead) => lead.status === "Contrato Fechado"}
        />
      )}

      {/* Gráfico de Oportunidades - só aparece na categoria "oportunidades" */}
      {selectedCategory === "oportunidades" && (
        <LeadsChart 
          leads={leads}
          title="Oportunidades"
          filterFunction={isOpportunityLead}
        />
      )}

      {shouldShowLossReasonsChart && (
        <LossReasonsChart leads={leads} />
      )}
      
      {shouldShowActionTypesChart && (
        <ActionTypesChart 
          leads={leads} 
          selectedCategory={selectedCategory}
        />
      )}

      {shouldShowActionGroupChart && (
        <ActionGroupChart 
          leads={leads} 
          selectedCategory={selectedCategory}
        />
      )}

      {shouldShowStateChart && (
        <StateStatsChart 
          leads={leads} 
          selectedCategory={selectedCategory}
          hasLeadPassedThroughStatus={hasLeadPassedThroughStatus}
        />
      )}
    </>
  );
}
