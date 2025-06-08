
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { AdvancedFilters, FilterOptions } from "@/components/AdvancedFilters";
import { ViewToggleDropdown } from "./ViewToggleDropdown";

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
  onLossReasonUpdate
}: SearchAndFiltersProps) {
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
        <AdvancedFilters
          onFiltersChange={setAdvancedFilters}
          activeFilters={advancedFilters}
          selectedCategory={selectedCategory}
          lossReasons={lossReasons}
          onLossReasonUpdate={onLossReasonUpdate}
        />
        
        <ViewToggleDropdown
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
          leadsViewMode={leadsViewMode}
          onLeadsViewChange={onLeadsViewChange}
          contractsViewMode={contractsViewMode}
          onContractsViewChange={onContractsViewChange}
          opportunitiesViewMode={opportunitiesViewMode}
          onOpportunitiesViewChange={onOpportunitiesViewChange}
        />
      </div>
    </div>
  );
}
