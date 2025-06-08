
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
  lossReasons: Array<{ id: string; reason: string; }>;
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
          {selectedCategory === "all" && onLeadsViewChange && (
            <ViewToggleDropdown
              currentView={leadsViewMode}
              onViewChange={onLeadsViewChange}
              label="Leads"
            />
          )}

          {/* Dropdown para visualização de contratos quando categoria for "contratos" */}
          {selectedCategory === "contratos" && onContractsViewChange && (
            <ViewToggleDropdown
              currentView={contractsViewMode}
              onViewChange={onContractsViewChange}
              label="Contratos"
            />
          )}

          {/* Dropdown para visualização de oportunidades quando categoria for "oportunidades" */}
          {selectedCategory === "oportunidades" && onOpportunitiesViewChange && (
            <ViewToggleDropdown
              currentView={opportunitiesViewMode}
              onViewChange={onOpportunitiesViewChange}
              label="Oportunidades"
            />
          )}
          
          <ActionToggleDropdown
            selectedCategory={selectedCategory}
            onCategoryChange={onCategoryChange}
          />
        </div>
      </div>
    </Card>
  );
}
