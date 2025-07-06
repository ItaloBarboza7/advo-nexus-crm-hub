
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
  const [initializationAttempted, setInitializationAttempted] = useState(false);
  
  // Refs para controle de estado melhorado
  const isMountedRef = useRef(true);
  const initializationRef = useRef(false);
  const lastValidStateRef = useRef<{
    leads: any[];
    appliedDateRange: DateRange | undefined;
    timestamp: number;
  } | null>(null);
  
  const { 
    leads, 
    isLoading, 
    error, 
    currentUser, 
    fetchLeadsForDate,
    fetchLeadsForDateRange,
    schemaResolved,
    canFetchData,
    clearCache
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

  // Controle de montagem do componente melhorado
  useEffect(() => {
    isMountedRef.current = true;
    console.log('🚀 CasesContent - Componente montado');
    
    return () => {
      console.log('🔥 CasesContent - Componente desmontado');
      isMountedRef.current = false;
    };
  }, []);

  // Salvar estado válido para recuperação
  useEffect(() => {
    if (leads && leads.length > 0 && appliedDateRange) {
      lastValidStateRef.current = {
        leads: [...leads],
        appliedDateRange: { ...appliedDateRange },
        timestamp: Date.now()
      };
      console.log('💾 CasesContent - Estado válido salvo:', {
        leadsCount: leads.length,
        dateRange: appliedDateRange
      });
    }
  }, [leads, appliedDateRange]);

  // Função para recuperar estado válido anterior
  const recoverFromValidState = useCallback(() => {
    const validState = lastValidStateRef.current;
    if (validState && isMountedRef.current) {
      const ageMs = Date.now() - validState.timestamp;
      const maxAge = 5 * 60 * 1000; // 5 minutos
      
      if (ageMs < maxAge) {
        console.log('🔄 CasesContent - Recuperando estado válido anterior:', {
          age: Math.round(ageMs / 1000) + 's',
          leadsCount: validState.leads.length
        });
        
        // Restaurar dados sem aguardar
        setAppliedDateRange(validState.appliedDateRange);
        // Os leads serão recarregados pela função de fetch
        return true;
      }
    }
    return false;
  }, []);

  // Função para buscar dados do mês atual
  const fetchCurrentMonthData = useCallback(() => {
    if (!isMountedRef.current || !canFetchData) {
      console.log("🚫 CasesContent - Não é possível buscar dados do mês atual:", {
        isMounted: isMountedRef.current,
        canFetchData
      });
      return;
    }
    
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
  }, [fetchLeadsForDateRange, canFetchData]);

  // Inicialização controlada e melhorada
  useEffect(() => {
    if (!schemaResolved || initializationRef.current || initializationAttempted) {
      return;
    }

    console.log('🔍 CasesContent - Verificando condições de inicialização:', {
      schemaResolved,
      canFetchData,
      hasCurrentUser: !!currentUser,
      isMounted: isMountedRef.current
    });

    // Marcar que tentativa de inicialização foi feita
    setInitializationAttempted(true);

    // Aguardar que todas as dependências estejam prontas
    if (canFetchData && currentUser && isMountedRef.current) {
      console.log("🚀 CasesContent - Inicializando análises com schema resolvido");
      initializationRef.current = true;
      
      // Tentar recuperar estado válido primeiro
      if (!recoverFromValidState()) {
        fetchCurrentMonthData();
      }
      
      setIsInitialized(true);
    } else {
      console.log("⏳ CasesContent - Aguardando dependências...");
      
      // Se não conseguir inicializar, tentar recuperar estado válido
      setTimeout(() => {
        if (isMountedRef.current && !isInitialized) {
          console.log("🔄 CasesContent - Tentando recuperação após timeout...");
          recoverFromValidState();
        }
      }, 2000);
    }
  }, [schemaResolved, canFetchData, currentUser, fetchCurrentMonthData, initializationAttempted, recoverFromValidState, isInitialized]);

  // Reset quando componente for remontado
  useEffect(() => {
    return () => {
      // Limpar estado de inicialização quando componente for desmontado
      initializationRef.current = false;
      setIsInitialized(false);
      setInitializationAttempted(false);
    };
  }, []);

  const handleDateRangeApply = useCallback((range: DateRange | undefined) => {
    if (!isMountedRef.current || !canFetchData) {
      console.log("🚫 CasesContent - Não é possível aplicar filtro de período:", {
        isMounted: isMountedRef.current,
        canFetchData
      });
      return;
    }
    
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
  }, [fetchCurrentMonthData, fetchLeadsForDateRange, canFetchData]);

  const { filteredLeads } = useLeadFiltering(
    leads || [],
    searchTerm,
    selectedCategory,
    advancedFilters,
    isOpportunityLead
  );

  const handleCategoryChange = useCallback((category: string) => {
    if (!isMountedRef.current) return;
    
    console.log('🏷️ CasesContent - Mudança de categoria:', category);
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
    if (!isMountedRef.current) {
      console.log("🚫 CasesContent - Componente desmontado, ignorando refresh");
      return;
    }
    
    console.log("🔄 CasesContent - Forçando refresh dos dados...");
    
    // Limpar cache primeiro
    clearCache();
    
    if (!canFetchData) {
      console.log("🚫 CasesContent - Não é possível atualizar dados:", {
        isMounted: isMountedRef.current,
        canFetchData
      });
      
      // Tentar recuperar estado válido em caso de problemas
      recoverFromValidState();
      return;
    }
    
    if (appliedDateRange) {
      fetchLeadsForDateRange(appliedDateRange);
    } else {
      fetchCurrentMonthData();
    }
  }, [appliedDateRange, fetchLeadsForDateRange, fetchCurrentMonthData, canFetchData, clearCache, recoverFromValidState]);

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

  console.log("📊 CasesContent - Estado atual (melhorado):", {
    totalLeads: leads?.length || 0,
    filteredLeads: filteredLeads.length,
    appliedDateRange: appliedDateRange ? {
      from: appliedDateRange.from ? BrazilTimezone.formatDateForDisplay(appliedDateRange.from) : 'N/A',
      to: appliedDateRange.to ? BrazilTimezone.formatDateForDisplay(appliedDateRange.to) : 'N/A'
    } : 'Nenhum',
    selectedCategory,
    isInitialized,
    schemaResolved,
    canFetchData,
    isMounted: isMountedRef.current,
    hasValidState: !!lastValidStateRef.current
  });

  // Estado de carregamento melhorado
  if (!schemaResolved || (isLoading && !isInitialized)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {!schemaResolved ? 'Carregando configuração...' : 'Carregando dados das análises...'}
            </p>
            {lastValidStateRef.current && (
              <button 
                onClick={() => recoverFromValidState()}
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Recuperar dados anteriores
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Estado de erro do schema
  if (schemaResolved && !canFetchData && initializationAttempted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="text-red-600 mb-4">⚠️</div>
            <p className="text-gray-600 mb-4">Não foi possível carregar a configuração necessária</p>
            <div className="space-x-2">
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Tentar novamente
              </button>
              {lastValidStateRef.current && (
                <button 
                  onClick={() => recoverFromValidState()}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Recuperar dados anteriores
                </button>
              )}
            </div>
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
            <div className="mt-2 space-x-2">
              <button 
                onClick={handleRefresh}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Tentar novamente
              </button>
              {lastValidStateRef.current && (
                <button 
                  onClick={() => recoverFromValidState()}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Recuperar dados anteriores
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
