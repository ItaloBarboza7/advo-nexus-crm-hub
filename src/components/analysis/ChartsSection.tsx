
import { LossReasonsChart } from "@/components/LossReasonsChart";
import { ActionTypesChart } from "@/components/ActionTypesChart";
import { ActionGroupChart } from "@/components/ActionGroupChart";
import { StateStatsChart } from "@/components/StateStatsChart";
import { LeadsChart } from "@/components/analysis/LeadsChart";
import { Lead } from "@/types/lead";
import { DateRange } from "react-day-picker";

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
  // Corrigido: usar DateRange em vez de tipo customizado
  appliedDateRange?: DateRange | undefined;
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
  showOpportunitiesChart = false,
  appliedDateRange
}: ChartsSectionProps) {
  
  // LOGS MOVIDOS PARA DENTRO DO COMPONENTE
  console.log(`🎨 [ChartsSection] === INÍCIO DO RENDER ===`);
  console.log(`🎨 [ChartsSection] Props recebidos:`, {
    selectedCategory,
    leadsCount: leads?.length || 0,
    shouldShowChart,
    appliedDateRange: appliedDateRange ? {
      from: appliedDateRange.from ? appliedDateRange.from.toISOString() : 'N/A',
      to: appliedDateRange.to ? appliedDateRange.to.toISOString() : 'N/A'
    } : 'Nenhum',
    viewModes: { leadsViewMode, contractsViewMode, opportunitiesViewMode }
  });

  if (!shouldShowChart) {
    console.log(`🎨 [ChartsSection] Não deve mostrar gráficos - shouldShowChart: false`);
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

  // SIMPLIFICADO: Usar startsWith em vez de igualdade exata para permitir subcategorias
  const isAllCategory = selectedCategory === "all";
  const isContractsCategory = selectedCategory.startsWith("contratos");
  const isOpportunitiesCategory = selectedCategory.startsWith("oportunidades");
  const isEstadosView = selectedCategory === "estados" || selectedCategory.endsWith("-estados");

  console.log(`🔍 [ChartsSection] Categorias detectadas:`, {
    isAllCategory,
    isContractsCategory,
    isOpportunitiesCategory,
    isEstadosView,
    selectedCategory
  });

  // RENDERIZAÇÃO SIMPLIFICADA: Usar try-catch para capturar erros
  try {
    return (
      <>
        {/* RENDERIZAÇÃO SIMPLIFICADA: Só mostrar gráficos se NÃO estivermos em visualização de Estados */}
        {!isEstadosView && (
          <>
            {/* Gráfico de Leads Gerais - categoria "all" */}
            {isAllCategory && (
              <>
                {console.log(`✅ [ChartsSection] Preparando para renderizar gráfico de Leads Gerais`)}
                <LeadsChart 
                  leads={leads}
                  title="Todos os Leads"
                  viewMode={leadsViewMode}
                  appliedDateRange={appliedDateRange}
                />
              </>
            )}

            {/* Gráfico de Contratos - categoria "contratos" */}
            {isContractsCategory && (
              <>
                {console.log(`✅ [ChartsSection] Preparando para renderizar gráfico de Contratos`)}
                <LeadsChart 
                  leads={leads}
                  title="Novos Contratos"
                  filterFunction={(lead) => lead.status === "Contrato Fechado"}
                  viewMode={contractsViewMode}
                  appliedDateRange={appliedDateRange}
                />
              </>
            )}

            {/* Gráfico de Oportunidades - categoria "oportunidades" */}
            {isOpportunitiesCategory && (
              <>
                {console.log(`✅ [ChartsSection] Preparando para renderizar gráfico de Oportunidades`)}
                <LeadsChart 
                  leads={leads}
                  title="Oportunidades"
                  filterFunction={isOpportunityLead}
                  viewMode={opportunitiesViewMode}
                  appliedDateRange={appliedDateRange}
                />
              </>
            )}
          </>
        )}

        {/* Gráfico de Estados - aparece quando estamos em visualização de Estados */}
        {isEstadosView && shouldShowStateChart && (
          <>
            {console.log(`✅ [ChartsSection] Preparando para renderizar gráfico de Estados`)}
            <StateStatsChart 
              leads={leads} 
              selectedCategory={selectedCategory}
              hasLeadPassedThroughStatus={hasLeadPassedThroughStatus}
            />
          </>
        )}

        {/* Gráficos de análise só aparecem em outras categorias */}
        {!isAllCategory && !isContractsCategory && !isOpportunitiesCategory && !isEstadosView && (
          <>
            {console.log(`✅ [ChartsSection] Preparando para renderizar gráficos de análise para categoria: ${selectedCategory}`)}
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
          </>
        )}
      </>
    );
  } catch (error) {
    console.error(`❌ [ChartsSection] Erro durante renderização:`, error);
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">
          <p className="font-medium">Erro ao renderizar gráficos:</p>
          <p className="text-sm mt-1">{error instanceof Error ? error.message : 'Erro desconhecido'}</p>
        </div>
      </div>
    );
  }
}
