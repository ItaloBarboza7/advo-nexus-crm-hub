
import { useState, useEffect } from "react";
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
import { useLeadsData } from "@/hooks/useLeadsData";
import { useLeadDialogs } from "@/hooks/useLeadDialogs";
import { FilterOptions } from "@/components/AdvancedFilters";

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
  
  // Custom hooks
  const { leads, lossReasons, isLoading, fetchLeads } = useLeadsData();
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
  
  // CORREÇÃO: Não aplicar filtro de data adicional aqui, usar todos os leads
  // Os filtros de data serão aplicados pelos hooks específicos quando necessário
  const dateFilteredLeads = leads;

  const { filteredLeads } = useLeadFiltering(
    dateFilteredLeads,
    searchTerm,
    selectedCategory,
    advancedFilters,
    isOpportunityLead
  );

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    // Resetar estados dos gráficos quando mudar de categoria
    resetChartStates();
    // Limpar filtros avançados quando mudar de categoria
    setAdvancedFilters({
      status: [],
      source: [],
      actionType: [],
      state: [],
      lossReason: [],
      valueRange: { min: null, max: null }
    });
  };

  const handleDateRangeApply = (range: DateRange | undefined) => {
    console.log("📅 CasesContent - Período aplicado:", range);
    setAppliedDateRange(range);
  };

  // Use the original leads for analysis without date filtering
  const {
    getLeadsForChart: getAnalysisLeadsForChart,
    shouldShowChart: shouldShowAnalysisChart,
    shouldShowLossReasonsChart: shouldShowAnalysisLossReasonsChart,
    shouldShowActionTypesChart: shouldShowAnalysisActionTypesChart,
    shouldShowActionGroupChart: shouldShowAnalysisActionGroupChart,
    shouldShowStateChart: shouldShowAnalysisStateChart
  } = useAnalysisLogic(leads, selectedCategory, statusHistory, hasLeadPassedThroughStatus);

  console.log("📊 CasesContent - Dados:", {
    totalLeads: leads.length,
    filteredLeads: filteredLeads.length,
    appliedDateRange,
    selectedCategory
  });

  const getDisplayTitle = () => {
    if (appliedDateRange?.from && appliedDateRange?.to) {
      return `Análise detalhada - Período: ${appliedDateRange.from.toLocaleDateString('pt-BR')} a ${appliedDateRange.to.toLocaleDateString('pt-BR')}`;
    } else if (appliedDateRange?.from) {
      return `Análise detalhada - ${appliedDateRange.from.toLocaleDateString('pt-BR')}`;
    }
    return "Análise detalhada de leads e performance de vendas";
  };

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
        leads={leads} 
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
        leads={getAnalysisLeadsForChart}
        selectedCategory={selectedCategory}
        shouldShowChart={shouldShowAnalysisChart()}
        shouldShowLossReasonsChart={shouldShowAnalysisLossReasonsChart()}
        shouldShowActionTypesChart={shouldShowAnalysisActionTypesChart()}
        shouldShowActionGroupChart={shouldShowAnalysisActionGroupChart()}
        shouldShowStateChart={shouldShowAnalysisStateChart()}
        hasLeadPassedThroughStatus={hasLeadPassedThroughStatus}
        leadsViewMode={leadsViewMode}
        contractsViewMode={contractsViewMode}
        opportunitiesViewMode={opportunitiesViewMode}
        showLeadsChart={showLeadsChart}
        showContractsChart={showContractsChart}
        showOpportunitiesChart={showOpportunitiesChart}
      />

      <LeadsSection
        filteredLeads={filteredLeads}
        selectedCategory={selectedCategory}
        isLoading={isLoading}
        shouldShowStateChart={shouldShowAnalysisStateChart()}
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
        onLeadUpdated={fetchLeads}
      />
    </div>
  );
}
