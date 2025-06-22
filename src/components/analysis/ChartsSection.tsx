
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

  // Função corrigida para verificar se um lead é uma oportunidade (NOVA REGRA)
  const isOpportunityLead = (lead: Lead): boolean => {
    console.log(`🔍 [ChartsSection] Verificando se ${lead.name} (${lead.status}) é oportunidade`);
    
    // NOVA REGRA: Oportunidades são leads que:
    // 1. NÃO estão em "Novo" (independente do histórico)
    // 2. Estão atualmente em "Proposta" ou "Reunião" OU passaram por eles (histórico)
    
    // PRIMEIRO: Excluir completamente leads com status "Novo"
    if (lead.status === "Novo") {
      console.log(`❌ [ChartsSection] Lead ${lead.name} está em Novo - SEMPRE EXCLUÍDO`);
      return false;
    }
    
    // SEGUNDO: Se está em Proposta ou Reunião atualmente, incluir automaticamente
    if (lead.status === "Proposta" || lead.status === "Reunião") {
      console.log(`✅ [ChartsSection] Lead ${lead.name} está atualmente em ${lead.status} - INCLUÍDO`);
      return true;
    }
    
    // TERCEIRO: Verificar se passou por Proposta/Reunião no histórico (incluindo finalizados)
    const hasPassedThroughTargetStatuses = hasLeadPassedThroughStatus(lead.id, ["Proposta", "Reunião"]);
    console.log(`📊 [ChartsSection] Lead ${lead.name} (${lead.status}) passou por Proposta/Reunião: ${hasPassedThroughTargetStatuses}`);
    
    if (hasPassedThroughTargetStatuses) {
      console.log(`✅ [ChartsSection] Lead ${lead.name} passou por Proposta/Reunião - INCLUÍDO mesmo estando em ${lead.status}`);
      return true;
    }
    
    console.log(`❌ [ChartsSection] Lead ${lead.name} não passou por Proposta/Reunião - EXCLUÍDO`);
    return false;
  };

  console.log(`🎨 ChartsSection - selectedCategory: ${selectedCategory}`);
  console.log(`📊 ChartsSection - showLeadsChart: ${showLeadsChart}, showContractsChart: ${showContractsChart}, showOpportunitiesChart: ${showOpportunitiesChart}`);
  console.log(`📅 ChartsSection - viewModes:`, { leadsViewMode, contractsViewMode, opportunitiesViewMode });

  // CORREÇÃO: Usar startsWith em vez de igualdade exata para permitir subcategorias
  const isAllCategory = selectedCategory === "all";
  const isContractsCategory = selectedCategory.startsWith("contratos");
  const isOpportunitiesCategory = selectedCategory.startsWith("oportunidades");

  console.log(`🔍 [ChartsSection] Categorias detectadas:`, {
    isAllCategory,
    isContractsCategory,
    isOpportunitiesCategory,
    selectedCategory
  });

  return (
    <>
      {/* Gráfico de Leads Gerais - só aparece na categoria "all" e quando showLeadsChart for true */}
      {isAllCategory && showLeadsChart && (
        <LeadsChart 
          leads={leads}
          title="Todos os Leads"
          viewMode={leadsViewMode}
        />
      )}

      {/* Gráfico de Contratos - CORRIGIDO: aparece em qualquer categoria que comece com "contratos" */}
      {isContractsCategory && showContractsChart && (
        <LeadsChart 
          leads={leads}
          title="Novos Contratos"
          filterFunction={(lead) => lead.status === "Contrato Fechado"}
          viewMode={contractsViewMode}
        />
      )}

      {/* Gráfico de Oportunidades - CORRIGIDO: aparece em qualquer categoria que comece com "oportunidades" */}
      {isOpportunitiesCategory && showOpportunitiesChart && (
        <LeadsChart 
          leads={leads}
          title="Oportunidades"
          filterFunction={isOpportunityLead}
          viewMode={opportunitiesViewMode}
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
