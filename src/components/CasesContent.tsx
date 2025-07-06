
import { useState, useEffect, useCallback, useRef } from "react";
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
  
  // Refs para controle de estado
  const isMountedRef = useRef(true);
  const initializationRef = useRef(false);
  
  const { 
    leads, 
    isLoading, 
    error, 
    currentUser, 
    fetchLeadsForDate,
    fetchLeadsForDateRange 
  } = useLeadsForDate();

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
  
  const {
    getLeadsForChart,
    shouldShowChart,
    shouldShowLossReasonsChart,
    shouldShowActionTypesChart,
    shouldShowActionGroupChart,
    shouldShowStateChart
  } = useAnalysisLogic(leads, selectedCategory, statusHistory, hasLeadPassedThroughStatus);

  // Controle de montagem do componente
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Função para buscar dados do mês atual
  const fetchCurrentMonthData = useCallback(() => {
    if (!isMountedRef.current) return;
    
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
    
    if (isMountedRef.current) {
      setAppliedDateRange(currentMonthRange);
      fetchLeadsForDateRange(currentMonthRange);
    }
  }, [fetchLeadsForDateRange]);

  // Inicialização controlada - APENAS uma vez por montagem
  useEffect(() => {
    if (!initializationRef.current && currentUser && isMountedRef.current) {
      console.log("🚀 CasesContent - Inicializando análises pela primeira vez");
      initializationRef.current = true;
      fetchCurrentMonthData();
      setIsInitialized(true);
    }
  }, [currentUser, fetchCurrentMonthData]);

  // Reset quando componente for remontado
  useEffect(() => {
    return () => {
      // Limpar estado de inicialização quando componente for desmontado
      initializationRef.current = false;
      setIsInitialized(false);
    };
  }, []);

  const handleDateRangeApply = useCallback((range: DateRange | undefined) => {
    if (!isMountedRef.current) return;
    
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

    if (isMountedRef.current) {
      setAppliedDateRange(rangeToApply);
      fetchLeadsForDateRange(rangeToApply);
    }
  }, [fetchCurrentMonthData, fetchLeadsForDateRange]);

  const { filteredLeads } = useLeadFiltering(
    leads || [],
    searchTerm,
    selectedCategory,
    advancedFilters,
    isOpportunityLead
  );

  const handleCategoryChange = useCallback((category: string) => {
    if (!isMountedRef.current) return;
    
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
  }, [resetChartStates]);

  const handleRefresh = useCallback(() => {
    if (!isMountedRef.current) return;
    
    if (appliedDateRange) {
      fetchLeadsForDateRange(appliedDateRange);
    } else {
      fetchCurrentMonthData();
    }
  }, [appliedDateRange, fetchLeadsForDateRange, fetchCurrentMonthData]);

  const getDisplayTitle = useCallback(() => {
    if (appliedDateRange?.from) {
      if (appliedDateRange?.to) {
        return `Análise detalhada - Período: ${BrazilTimezone.formatDateForDisplay(appliedDateRange.from)} a ${BrazilTimezone.formatDateForDisplay(appliedDateRange.to)}`;
      } else {
        return `Análise detalhada - Data: ${BrazilTimezone.formatDateForDisplay(appliedDateRange.from)}`;
      }
    }
    return "Análise detalhada de leads e performance de vendas";
  }, [appliedDateRange]);

  console.log("📊 CasesContent - Estado atual:", {
    totalLeads: leads?.length || 0,
    filteredLeads: filteredLeads.length,
    appliedDateRange: appliedDateRange ? {
      from: appliedDateRange.from ? BrazilTimezone.formatDateForDisplay(appliedDateRange.from) : 'N/A',
      to: appliedDateRange.to ? BrazilTimezone.formatDateForDisplay(appliedDateRange.to) : 'N/A'
    } : 'Nenhum',
    selectedCategory,
    isInitialized,
    isMounted: isMountedRef.current
  });

  // Estado de carregamento melhorado
  if (isLoading && !isInitialized) {
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

      <AnalysisStats 
        leads={leads || []} 
        onCategoryChange={handleCategoryChange}
        statusHistory={statusHistory}
        hasLeadPassedThroughStatus={hasLeadPassedThroughStatus}
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
        appliedDateRange={appliedDateRange}
      />

      <LeadsSection
        filteredLeads={filteredLeads}
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800">
            <p className="font-medium">Erro ao carregar dados:</p>
            <p className="text-sm mt-1">{error}</p>
            <button 
              onClick={handleRefresh}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
