
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, X } from "lucide-react";
import { AdvancedFilters, FilterOptions } from "@/components/AdvancedFilters";
import { ActionToggleDropdown } from "@/components/analysis/ActionToggleDropdown";
import { ViewToggleDropdown } from "@/components/analysis/ViewToggleDropdown";
import { Button } from "@/components/ui/button";

interface SearchAndFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  advancedFilters: FilterOptions;
  setAdvancedFilters: (filters: FilterOptions) => void;
  lossReasons: Array<{ id: string; reason: string; }>;
  onCategoryChange: (category: string) => void;
  // Props para visualizações
  leadsViewMode?: 'weekly' | 'monthly';
  onLeadsViewChange?: (view: 'weekly' | 'monthly') => void;
  contractsViewMode?: 'weekly' | 'monthly';
  onContractsViewChange?: (view: 'weekly' | 'monthly') => void;
  opportunitiesViewMode?: 'weekly' | 'monthly';
  onOpportunitiesViewChange?: (view: 'weekly' | 'monthly') => void;
  // Props para controlar quando mostrar gráficos
  showLeadsChart?: boolean;
  showContractsChart?: boolean;
  showOpportunitiesChart?: boolean;
  onCloseCharts?: () => void;
}

export function SearchAndFilters({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  advancedFilters,
  setAdvancedFilters,
  lossReasons,
  onCategoryChange,
  leadsViewMode = 'weekly',
  onLeadsViewChange,
  contractsViewMode = 'weekly',
  onContractsViewChange,
  opportunitiesViewMode = 'weekly',
  onOpportunitiesViewChange,
  showLeadsChart = false,
  showContractsChart = false,
  showOpportunitiesChart = false,
  onCloseCharts
}: SearchAndFiltersProps) {

  console.log(`🔍 SearchAndFilters - selectedCategory: ${selectedCategory}`);
  console.log(`📊 SearchAndFilters - handlers:`, {
    onLeadsViewChange: !!onLeadsViewChange,
    onContractsViewChange: !!onContractsViewChange,
    onOpportunitiesViewChange: !!onOpportunitiesViewChange
  });

  const mainCategory = selectedCategory.split('-')[0];
  const shouldShowViewToggle = (category: string) => {
    return category === "all" || 
           (category === "contratos" && (selectedCategory === "contratos" || selectedCategory.startsWith("contratos-"))) ||
           (category === "oportunidades" && (selectedCategory === "oportunidades" || selectedCategory.startsWith("oportunidades-")));
  };

  const anyChartVisible = showLeadsChart || showContractsChart || showOpportunitiesChart;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {selectedCategory !== "estados" && (
            <AdvancedFilters 
              onFiltersChange={setAdvancedFilters}
              activeFilters={advancedFilters}
              selectedCategory={selectedCategory}
              lossReasons={lossReasons}
            />
          )}
          
          {/* Dropdown para visualização de leads quando categoria for "all" */}
          {shouldShowViewToggle("all") && selectedCategory === "all" && onLeadsViewChange && (
            <ViewToggleDropdown
              currentView={leadsViewMode}
              onViewChange={(view) => {
                console.log(`🎯 ViewToggleDropdown (all) - view: ${view}`);
                onLeadsViewChange(view);
              }}
              label="Leads"
            />
          )}

          {/* Dropdown para visualização de contratos - SEMPRE mostrar quando categoria for "contratos" ou subcategorias */}
          {shouldShowViewToggle("contratos") && mainCategory === "contratos" && onContractsViewChange && (
            <ViewToggleDropdown
              currentView={contractsViewMode}
              onViewChange={(view) => {
                console.log(`🎯 ViewToggleDropdown (contratos) - view: ${view}`);
                onContractsViewChange(view);
              }}
              label="Contratos"
            />
          )}

          {/* Dropdown para visualização de oportunidades - SEMPRE mostrar quando categoria for "oportunidades" ou subcategorias */}
          {shouldShowViewToggle("oportunidades") && mainCategory === "oportunidades" && onOpportunitiesViewChange && (
            <ViewToggleDropdown
              currentView={opportunitiesViewMode}
              onViewChange={(view) => {
                console.log(`🎯 ViewToggleDropdown (oportunidades) - view: ${view}`);
                onOpportunitiesViewChange(view);
              }}
              label="Oportunidades"
            />
          )}
          
          <ActionToggleDropdown
            selectedCategory={selectedCategory}
            onCategoryChange={onCategoryChange}
          />

          {/* Botão para fechar gráficos */}
          {anyChartVisible && onCloseCharts && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCloseCharts}
              className="h-8 gap-2"
            >
              <X className="h-4 w-4" />
              Fechar Gráfico
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
