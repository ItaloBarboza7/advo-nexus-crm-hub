
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
  
  // Filter leads by date range
  const dateFilteredLeads = appliedDateRange?.from && appliedDateRange?.to
    ? leads.filter(lead => {
        const leadDate = new Date(lead.created_at);
        return leadDate >= appliedDateRange.from! && leadDate <= appliedDateRange.to!;
      })
    : leads;

  const { filteredLeads } = useLeadFiltering(
    dateFilteredLeads, // Use date-filtered leads instead of all leads
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

  // Update analysis logic to use date-filtered leads
  const {
    getLeadsForChart: getDateFilteredLeadsForChart,
    shouldShowChart: shouldShowChartForFiltered,
    shouldShowLossReasonsChart: shouldShowLossReasonsChartForFiltered,
    shouldShowActionTypesChart: shouldShowActionTypesChartForFiltered,
    shouldShowActionGroupChart: shouldShowActionGroupChartForFiltered,
    shouldShowStateChart: shouldShowStateChartForFiltered
  } = useAnalysisLogic(dateFilteredLeads, selectedCategory, statusHistory, hasLeadPassedThroughStatus);

  console.log("📊 CasesContent - Dados filtrados:", {
    totalLeads: leads.length,
    dateFilteredLeads: dateFilteredLeads.length,
    filteredLeads: filteredLeads.length,
    appliedDateRange,
    selectedCategory
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Análises</h1>
          <p className="text-gray-600">
            {appliedDateRange?.from && appliedDateRange?.to
              ? `Análise detalhada - Período: ${appliedDateRange.from.toLocaleDateString('pt-BR')} a ${appliedDateRange.to.toLocaleDateString('pt-BR')}`
              : "Análise detalhada de leads e performance de vendas"
            }
          </p>
        </div>
        <DateFilter 
          date={dateRange} 
          setDate={setDateRange}
          onApply={handleDateRangeApply}
        />
      </div>

      <AnalysisStats 
        leads={dateFilteredLeads} 
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
        leads={getDateFilteredLeadsForChart}
        selectedCategory={selectedCategory}
        shouldShowChart={shouldShowChartForFiltered()}
        shouldShowLossReasonsChart={shouldShowLossReasonsChartForFiltered()}
        shouldShowActionTypesChart={shouldShowActionTypesChartForFiltered()}
        shouldShowActionGroupChart={shouldShowActionGroupChartForFiltered()}
        shouldShowStateChart={shouldShowStateChartForFiltered()}
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
        shouldShowStateChart={shouldShowStateChartForFiltered()}
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
