
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
import { AdvancedFilters, FilterOptions } from "@/components/AdvancedFilters";
import { ActionToggleDropdown } from "@/components/analysis/ActionToggleDropdown";

interface SearchAndFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  advancedFilters: FilterOptions;
  setAdvancedFilters: (filters: FilterOptions) => void;
  lossReasons: Array<{ id: string; reason: string; }>;
  onCategoryChange: (category: string) => void;
}

export function SearchAndFilters({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  advancedFilters,
  setAdvancedFilters,
  lossReasons,
  onCategoryChange
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
          
          <ActionToggleDropdown
            selectedCategory={selectedCategory}
            onCategoryChange={onCategoryChange}
          />
        </div>
      </div>
    </Card>
  );
}
