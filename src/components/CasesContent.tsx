
import { useState, useEffect, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { DateFilter } from "@/components/DateFilter";
import { AnalysisStats } from "@/components/analysis/AnalysisStats";
import { CategoryButtons } from "@/components/analysis/CategoryButtons";
import { SearchAndFilters } from "@/components/analysis/SearchAndFilters";
import { ChartsSection } from "@/components/analysis/ChartsSection";
import { LeadsSection } from "@/components/analysis/LeadsSection";
import { LeadDialogs } from "@/components/analysis/LeadDialogs";
import { useLeadStatusHistory } from "@/hooks/useLeadStatusHistory";
import { useAnalysisLogic } from "@/hooks/useAnalysisLogic";
import { useOpportunityLogic } from "@/hooks/useOpportunityLogic";
import { useLeadFiltering } from "@/components/analysis/useLeadFiltering";
import { useChartStates } from "@/hooks/useChartStates";
import { useLeadDialogs } from "@/hooks/useLeadDialogs";
import { useLeadsForDate } from "@/hooks/useLeadsForDate";
import { useLeadsForYear } from "@/hooks/useLeadsForYear";
import { useLossReasonsGlobal } from "@/hooks/useLossReasonsGlobal";
import { FilterOptions } from "@/components/AdvancedFilters";
import { BrazilTimezone } from "@/lib/timezone";

export function CasesContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [advancedFilters, setAdvancedFilters] = useState<FilterOptions>({
    status: [],
    source: [],
    actionType: [],
    state: [],
    lossReason: [],
    valueRange: { min: null, max: null }
  });
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Usar hooks com filtro de data que agora retorna Lead[] completo
  const { 
    leads: filteredLeads, 
    isLoading, 
    error, 
    currentUser, 
    fetchLeadsForDate,
    fetchLeadsForDateRange 
  } = useLeadsForDate();

  // Hook para dados anuais (para visualizações mensais dos cards)
  const {
    leads: yearlyLeads,
    isLoading: yearlyLoading
  } = useLeadsForYear();

  const { lossReasons } = useLossReasonsGlobal();
  const { statusHistory, hasLeadPassedThroughStatus } = useLeadStatusHistory();
  const { isOpportunityLead } = useOpportunityLogic(hasLeadPassedThroughStatus);
  
  const {
    leadsViewMode,
    contractsViewMode,
    opportunitiesViewMode,
    showLeadsChart,
    showContractsChart,
    showOpportunitiesChart,
    handleLeadsViewChange,
    handleContractsViewChange,
    handleOpportunitiesViewChange,
    resetChartStates
  } = useChartStates();
  
  const {
    selectedLead,
    isDetailsDialogOpen,
    setIsDetailsDialogOpen,
    isEditFormOpen,
    setIsEditFormOpen,
    handleViewDetails,
    handleEditLead
  } = useLeadDialogs();
  
  // Função para selecionar quais leads usar baseado na visualização
  const getLeadsForAnalysis = useCallback((viewType: 'weekly' | 'monthly') => {
    if (viewType === 'monthly') {
      console.log("📊 CasesContent - Usando dados anuais para análise mensal");
      return yearlyLeads || [];
    } else {
      console.log("📊 CasesContent - Usando dados filtrados para análise semanal");
      return filteredLeads || [];
    }
  }, [yearlyLeads, filteredLeads]);

  const {
    getLeadsForChart,
    shouldShowChart,
    shouldShowLossReasonsChart,
    shouldShowActionTypesChart,
    shouldShowActionGroupChart,
    shouldShowStateChart
  } = useAnalysisLogic(filteredLeads || [], selectedCategory, statusHistory, hasLeadPassedThroughStatus);

  // Função memoizada para buscar dados do mês atual
  const fetchCurrentMonthData = useCallback(() => {
    const now = BrazilTimezone.now();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const currentMonthRange = {
      from: startOfMonth,
      to: endOfMonth
    };
    
    console.log("📅 CasesContent - Carregando dados do mês atual:", {
      from: BrazilTimezone.formatDateForDisplay(startOfMonth),
      to: BrazilTimezone.formatDateForDisplay(endOfMonth)
    });
    
    setAppliedDateRange(currentMonthRange);
    fetchLeadsForDateRange(currentMonthRange);
  }, [fetchLeadsForDateRange]);

  // Inicialização única sem dependência circular
  useEffect(() => {
    if (!isInitialized && currentUser) {
      console.log("🚀 CasesContent - Inicializando análises pela primeira vez");
      fetchCurrentMonthData();
      setIsInitialized(true);
    }
  }, [isInitialized, currentUser, fetchCurrentMonthData]);

  // Função para aplicar filtro de data sem recursão
  const handleDateRangeApply = useCallback((range: DateRange | undefined) => {
    console.log("📅 CasesContent - Aplicando filtro de período:", range);
    
    if (!range?.from) {
      console.log("📅 CasesContent - Sem filtro aplicado, carregando mês atual");
      fetchCurrentMonthData();
      return;
    }

    const rangeToApply = {
      from: range.from,
      to: range.to || range.from
    };

    console.log("📅 CasesContent - Aplicando período:", {
      from: BrazilTimezone.formatDateForDisplay(rangeToApply.from),
      to: BrazilTimezone.formatDateForDisplay(rangeToApply.to)
    });

    setAppliedDateRange(rangeToApply);
    fetchLeadsForDateRange(rangeToApply);
  }, [fetchCurrentMonthData, fetchLeadsForDateRange]);

  const { filteredLeads: searchFilteredLeads } = useLeadFiltering(
    filteredLeads || [],
    searchTerm,
    selectedCategory,
    advancedFilters,
    isOpportunityLead
  );

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    resetChartStates();
    setAdvancedFilters({
      status: [],
      source: [],
      actionType: [],
      state: [],
      lossReason: [],
      valueRange: { min: null, max: null }
    });
  };

  const handleRefresh = () => {
    if (appliedDateRange) {
      fetchLeadsForDateRange(appliedDateRange);
    } else {
      fetchCurrentMonthData();
    }
  };

  console.log("📊 CasesContent - Dados:", {
    totalFilteredLeads: filteredLeads?.length || 0,
    totalYearlyLeads: yearlyLeads?.length || 0,
    searchFilteredLeads: searchFilteredLeads.length,
    appliedDateRange: appliedDateRange ? {
      from: appliedDateRange.from ? BrazilTimezone.formatDateForDisplay(appliedDateRange.from) : 'N/A',
      to: appliedDateRange.to ? BrazilTimezone.formatDateForDisplay(appliedDateRange.to) : 'N/A'
    } : 'Nenhum',
    selectedCategory,
    isInitialized,
    viewModes: {
      leads: leadsViewMode,
      contracts: contractsViewMode,
      opportunities: opportunitiesViewMode
    }
  });

  // Melhorar getDisplayTitle para lidar com casos onde to pode ser undefined
  const getDisplayTitle = () => {
    if (appliedDateRange?.from) {
      if (appliedDateRange?.to) {
        return `Análise detalhada - Período: ${BrazilTimezone.formatDateForDisplay(appliedDateRange.from)} a ${BrazilTimezone.formatDateForDisplay(appliedDateRange.to)}`;
      } else {
        return `Análise detalhada - Data: ${BrazilTimezone.formatDateForDisplay(appliedDateRange.from)}`;
      }
    }
    return "Análise detalhada de leads e performance de vendas";
  };

  // Estado de carregamento melhorado
  if ((isLoading || yearlyLoading) || !isInitialized) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados das análises...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Análises</h1>
          <p className="text-gray-600">
            {getDisplayTitle()}
          </p>
        </div>
        <DateFilter 
          date={dateRange} 
          setDate={setDateRange}
          onApply={handleDateRangeApply}
        />
      </div>

      {/* Usar dados filtrados por data para as estatísticas dos cards */}
      <AnalysisStats 
        leads={filteredLeads || []} 
        yearlyLeads={yearlyLeads || []}
        onCategoryChange={handleCategoryChange}
        statusHistory={statusHistory}
        hasLeadPassedThroughStatus={hasLeadPassedThroughStatus}
        leadsViewMode={leadsViewMode}
        contractsViewMode={contractsViewMode}
        opportunitiesViewMode={opportunitiesViewMode}
        showLeadsChart={showLeadsChart}
        showContractsChart={showContractsChart}
        showOpportunitiesChart={showOpportunitiesChart}
      />

      <CategoryButtons 
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />

      <SearchAndFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        advancedFilters={advancedFilters}
        setAdvancedFilters={setAdvancedFilters}
        lossReasons={lossReasons}
        onCategoryChange={handleCategoryChange}
        leadsViewMode={leadsViewMode}
        onLeadsViewChange={handleLeadsViewChange}
        contractsViewMode={contractsViewMode}
        onContractsViewChange={handleContractsViewChange}
        opportunitiesViewMode={opportunitiesViewMode}
        onOpportunitiesViewChange={handleOpportunitiesViewChange}
      />

      <ChartsSection
        leads={getLeadsForChart}
        yearlyLeads={yearlyLeads || []}
        selectedCategory={selectedCategory}
        shouldShowChart={shouldShowChart()}
        shouldShowLossReasonsChart={shouldShowLossReasonsChart()}
        shouldShowActionTypesChart={shouldShowActionTypesChart()}
        shouldShowActionGroupChart={shouldShowActionGroupChart()}
        shouldShowStateChart={shouldShowStateChart()}
        hasLeadPassedThroughStatus={hasLeadPassedThroughStatus}
        leadsViewMode={leadsViewMode}
        contractsViewMode={contractsViewMode}
        opportunitiesViewMode={opportunitiesViewMode}
        showLeadsChart={showLeadsChart}
        showContractsChart={showContractsChart}
        showOpportunitiesChart={showOpportunitiesChart}
      />

      <LeadsSection
        filteredLeads={searchFilteredLeads}
        selectedCategory={selectedCategory}
        isLoading={isLoading}
        shouldShowStateChart={shouldShowStateChart()}
        onViewDetails={handleViewDetails}
        onEditLead={handleEditLead}
      />

      <LeadDialogs
        selectedLead={selectedLead}
        isDetailsDialogOpen={isDetailsDialogOpen}
        setIsDetailsDialogOpen={setIsDetailsDialogOpen}
        isEditFormOpen={isEditFormOpen}
        setIsEditFormOpen={setIsEditFormOpen}
        onEditLead={handleEditLead}
        onLeadUpdated={handleRefresh}
      />

      {/* Error States */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800">
            <p className="font-medium">Erro ao carregar dados:</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium mb-2">Debug Info:</h3>
        <div className="text-sm text-gray-600">
          <p>Status inicialização: {isInitialized ? 'Concluída' : 'Pendente'}</p>
          <p>Leads filtrados: {filteredLeads?.length || 0}</p>
          <p>Leads do ano: {yearlyLeads?.length || 0}</p>
          <p>View modes: Leads={leadsViewMode}, Contratos={contractsViewMode}, Oportunidades={opportunitiesViewMode}</p>
          <p>Gráficos ativos: Leads={showLeadsChart ? 'Sim' : 'Não'}, Contratos={showContractsChart ? 'Sim' : 'Não'}, Oportunidades={showOpportunitiesChart ? 'Sim' : 'Não'}</p>
          <p>Período aplicado: {appliedDateRange ? 
            `${appliedDateRange.from ? BrazilTimezone.formatDateForDisplay(appliedDateRange.from) : 'N/A'} - ${appliedDateRange.to ? BrazilTimezone.formatDateForDisplay(appliedDateRange.to) : 'N/A'}` 
            : 'Nenhum'}</p>
          <p>Usuário: {currentUser?.name || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}
