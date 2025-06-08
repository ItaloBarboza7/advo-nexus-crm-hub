
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
  // Props para visualizações
  leadsViewMode?: 'weekly' | 'monthly';
  contractsViewMode?: 'weekly' | 'monthly';
  opportunitiesViewMode?: 'weekly' | 'monthly';
  // Props para controlar quando mostrar gráficos
  showLeadsChart?: boolean;
  showContractsChart?: boolean;
  showOpportunitiesChart?: boolean;
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
  leadsViewMode = 'weekly',
  contractsViewMode = 'weekly',
  opportunitiesViewMode = 'weekly',
  showLeadsChart = false,
  showContractsChart = false,
  showOpportunitiesChart = false
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

  console.log(`🎨 ChartsSection - selectedCategory: ${selectedCategory}`);
  console.log(`📊 ChartsSection - showLeadsChart: ${showLeadsChart}, showContractsChart: ${showContractsChart}, showOpportunitiesChart: ${showOpportunitiesChart}`);

  return (
    <>
      {/* Gráfico de Leads Gerais - só aparece na categoria "all" e quando showLeadsChart for true */}
      {selectedCategory === "all" && showLeadsChart && (
        <LeadsChart 
          leads={leads}
          title="Todos os Leads"
        />
      )}

      {/* Gráfico de Contratos - só aparece na categoria "contratos" e quando showContractsChart for true */}
      {selectedCategory === "contratos" && showContractsChart && (
        <LeadsChart 
          leads={leads}
          title="Novos Contratos"
          filterFunction={(lead) => lead.status === "Contrato Fechado"}
        />
      )}

      {/* Gráfico de Oportunidades - só aparece na categoria "oportunidades" e quando showOpportunitiesChart for true */}
      {selectedCategory === "oportunidades" && showOpportunitiesChart && (
        <LeadsChart 
          leads={leads}
          title="Oportunidades"
          filterFunction={isOpportunityLead}
        />
      )}

      {/* Gráficos de análise só aparecem quando NÃO há gráfico de leads sendo exibido */}
      {!showLeadsChart && !showContractsChart && !showOpportunitiesChart && (
        <>
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
      )}
    </>
  );
}
