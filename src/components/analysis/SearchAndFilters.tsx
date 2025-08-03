
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
import { AdvancedFilters, FilterOptions } from "@/components/AdvancedFilters";
import { ActionToggleDropdown } from "@/components/analysis/ActionToggleDropdown";
import { ViewToggleDropdown } from "@/components/analysis/ViewToggleDropdown";

interface SearchAndFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  advancedFilters: FilterOptions;
  setAdvancedFilters: (filters: FilterOptions) => void;
  lossReasons: Array<{ id: string; reason: string; is_fixed: boolean; }>;
  onCategoryChange: (category: string) => void;
  // Props para visualizações
  leadsViewMode?: 'weekly' | 'monthly';
  onLeadsViewChange?: (view: 'weekly' | 'monthly') => void;
  contractsViewMode?: 'weekly' | 'monthly';
  onContractsViewChange?: (view: 'weekly' | 'monthly') => void;
  opportunitiesViewMode?: 'weekly' | 'monthly';
  onOpportunitiesViewChange?: (view: 'weekly' | 'monthly') => void;
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
  onOpportunitiesViewChange
}: SearchAndFiltersProps) {

  console.log(`🔍 SearchAndFilters - selectedCategory: ${selectedCategory}`);
  console.log(`📊 SearchAndFilters - handlers:`, {
    onLeadsViewChange: !!onLeadsViewChange,
    onContractsViewChange: !!onContractsViewChange,
    onOpportunitiesViewChange: !!onOpportunitiesViewChange
  });

  const mainCategory = selectedCategory.split('-')[0];
  
  // CORREÇÃO: Verificar se estamos na visualização de Estados
  const isEstadosView = selectedCategory === "estados" || selectedCategory.endsWith("-estados");
  
  // CORREÇÃO: Função revisada para mostrar botões de visualização corretamente
  const shouldShowViewToggle = (category: string) => {
    // NÃO mostrar se estivermos em visualização de Estados
    if (isEstadosView) {
      return false;
    }
    
    // Sempre mostrar para "all" e suas variações (all-tipo-acao, all-grupo-acao)
    if (category === "all") {
      return mainCategory === "all";
    }
    
    // Para contratos: mostrar quando categoria é "contratos" ou suas subcategorias
    if (category === "contratos") {
      return selectedCategory === "contratos" || selectedCategory.startsWith("contratos-");
    }
    
    // Para oportunidades: mostrar quando categoria é "oportunidades" ou suas subcategorias  
    if (category === "oportunidades") {
      return selectedCategory === "oportunidades" || selectedCategory.startsWith("oportunidades-");
    }
    
    return false;
  };

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
          {/* CORREÇÃO: NÃO mostrar filtros avançados quando estivermos em visualização de Estados */}
          {!isEstadosView && (
            <AdvancedFilters 
              onFiltersChange={setAdvancedFilters}
              activeFilters={advancedFilters}
              selectedCategory={selectedCategory}
              lossReasons={lossReasons}
            />
          )}
          
          {/* Dropdown para visualização de leads quando categoria for "all" - NÃO mostrar para Estados */}
          {shouldShowViewToggle("all") && onLeadsViewChange && (
            <ViewToggleDropdown
              currentView={leadsViewMode}
              onViewChange={(view) => {
                console.log(`🎯 ViewToggleDropdown (all) - view: ${view}`);
                onLeadsViewChange(view);
              }}
              label="Leads"
            />
          )}

          {/* Dropdown para visualização de contratos */}
          {shouldShowViewToggle("contratos") && onContractsViewChange && (
            <ViewToggleDropdown
              currentView={contractsViewMode}
              onViewChange={(view) => {
                console.log(`🎯 ViewToggleDropdown (contratos) - view: ${view}`);
                onContractsViewChange(view);
              }}
              label="Contratos"
            />
          )}

          {/* Dropdown para visualização de oportunidades */}
          {shouldShowViewToggle("oportunidades") && onOpportunitiesViewChange && (
            <ViewToggleDropdown
              currentView={opportunitiesViewMode}
              onViewChange={(view) => {
                console.log(`🎯 ViewToggleDropdown (oportunidades) - view: ${view}`);
                onOpportunitiesViewChange(view);
              }}
              label="Oportunidades"
            />
          )}
          
          {/* CORREÇÃO: NÃO mostrar ActionToggleDropdown quando estivermos em visualização de Estados */}
          {!isEstadosView && (
            <ActionToggleDropdown
              selectedCategory={selectedCategory}
              onCategoryChange={onCategoryChange}
            />
          )}
        </div>
      </div>
    </Card>
  );
}
