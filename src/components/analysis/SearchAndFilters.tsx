
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
import { AdvancedFilters, FilterOptions } from "@/components/AdvancedFilters";

interface SearchAndFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  advancedFilters: FilterOptions;
  setAdvancedFilters: (filters: FilterOptions) => void;
  lossReasons: Array<{ id: string; reason: string; }>;
}

export function SearchAndFilters({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  advancedFilters,
  setAdvancedFilters,
  lossReasons
}: SearchAndFiltersProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {selectedCategory !== "estados" && (
          <AdvancedFilters 
            onFiltersChange={setAdvancedFilters}
            activeFilters={advancedFilters}
            selectedCategory={selectedCategory}
            lossReasons={lossReasons}
          />
        )}
      </div>
    </Card>
  );
}
