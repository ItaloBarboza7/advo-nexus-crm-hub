
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { AdvancedFilters, FilterOptions } from "@/components/AdvancedFilters";
import { ViewToggleDropdown } from "./ViewToggleDropdown";
import { ActionToggleDropdown } from "./ActionToggleDropdown";

interface SearchAndFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  advancedFilters: FilterOptions;
  setAdvancedFilters: (filters: FilterOptions) => void;
  lossReasons: Array<{ id: string; reason: string }>;
  onCategoryChange: (category: string) => void;
  leadsViewMode: string;
  onLeadsViewChange: (mode: string) => void;
  contractsViewMode: string;
  onContractsViewChange: (mode: string) => void;
  opportunitiesViewMode: string;
  onOpportunitiesViewChange: (mode: string) => void;
  onLossReasonUpdate?: () => void;
  onDeleteLossReason?: (lossReasonId: string, lossReasonName: string) => Promise<boolean>;
  onAddLossReason?: (reason: string) => Promise<boolean>;
}

export function SearchAndFilters({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  advancedFilters,
  setAdvancedFilters,
  lossReasons,
  onCategoryChange,
  leadsViewMode,
  onLeadsViewChange,
  contractsViewMode,
  onContractsViewChange,
  opportunitiesViewMode,
  onOpportunitiesViewChange,
  onLossReasonUpdate,
  onDeleteLossReason,
  onAddLossReason
}: SearchAndFiltersProps) {

  // Função para determinar qual viewMode usar baseado na categoria
  const getCurrentViewMode = (): 'weekly' | 'monthly' => {
    switch (selectedCategory) {
      case 'contratos':
        return contractsViewMode as 'weekly' | 'monthly';
      case 'oportunidades':
        return opportunitiesViewMode as 'weekly' | 'monthly';
      default:
        return leadsViewMode as 'weekly' | 'monthly';
    }
  };

  // Função para lidar com mudança de visualização
  const handleViewChange = (view: 'weekly' | 'monthly') => {
    console.log(`📊 [SearchAndFilters] Mudança de visualização para categoria ${selectedCategory}: ${view}`);
    
    switch (selectedCategory) {
      case 'contratos':
        onContractsViewChange(view);
        break;
      case 'oportunidades':
        onOpportunitiesViewChange(view);
        break;
      default:
        onLeadsViewChange(view);
        break;
    }
  };

  // Mostrar dropdown apenas para categorias que têm gráficos de leads
  const shouldShowViewToggle = ['all', 'contratos', 'oportunidades'].includes(selectedCategory);

  // Mostrar dropdown de ação apenas para categorias de contratos e oportunidades
  const shouldShowActionToggle = ['contratos', 'oportunidades', 'perdas'].includes(selectedCategory.split('-')[0]);

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar leads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="flex flex-wrap gap-2 items-center">
        {shouldShowViewToggle && (
          <ViewToggleDropdown 
            currentView={getCurrentViewMode()}
            onViewChange={handleViewChange}
          />
        )}
        
        {shouldShowActionToggle && (
          <ActionToggleDropdown 
            selectedCategory={selectedCategory}
            onCategoryChange={onCategoryChange}
          />
        )}
        
        <AdvancedFilters
          onFiltersChange={setAdvancedFilters}
          activeFilters={advancedFilters}
          selectedCategory={selectedCategory}
          lossReasons={lossReasons}
          onLossReasonUpdate={onLossReasonUpdate}
          onDeleteLossReason={onDeleteLossReason}
          onAddLossReason={onAddLossReason}
        />
      </div>
    </div>
  );
}
