
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Users, FileText } from "lucide-react";
import { AdvancedFilters, FilterOptions } from "@/components/AdvancedFilters";

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
  const mainCategory = selectedCategory.split('-')[0];
  
  const getActionButtonConfig = () => {
    if (mainCategory === "contratos") {
      return {
        show: true,
        currentCategory: selectedCategory === "contratos-grupo-acao" ? "contratos-grupo-acao" : "contratos",
        toggleCategory: selectedCategory === "contratos-grupo-acao" ? "contratos" : "contratos-grupo-acao",
        currentText: selectedCategory === "contratos-grupo-acao" ? "Grupo de Ação" : "Tipo de Ação",
        icon: selectedCategory === "contratos-grupo-acao" ? Users : FileText
      };
    }
    
    if (mainCategory === "oportunidades") {
      return {
        show: true,
        currentCategory: selectedCategory === "oportunidades-grupo-acao" ? "oportunidades-grupo-acao" : "oportunidades",
        toggleCategory: selectedCategory === "oportunidades-grupo-acao" ? "oportunidades" : "oportunidades-grupo-acao",
        currentText: selectedCategory === "oportunidades-grupo-acao" ? "Grupo de Ação" : "Tipo de Ação",
        icon: selectedCategory === "oportunidades-grupo-acao" ? Users : FileText
      };
    }
    
    if (mainCategory === "perdas") {
      return {
        show: true,
        currentCategory: selectedCategory === "perdas-grupo-acao" ? "perdas-grupo-acao" : "perdas",
        toggleCategory: selectedCategory === "perdas-grupo-acao" ? "perdas" : "perdas-grupo-acao",
        currentText: selectedCategory === "perdas-grupo-acao" ? "Grupo de Ação" : "Tipo de Ação",
        icon: selectedCategory === "perdas-grupo-acao" ? Users : FileText
      };
    }
    
    return { show: false };
  };

  const actionButtonConfig = getActionButtonConfig();

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
        
        <div className="flex gap-2">
          {actionButtonConfig.show && (
            <Button
              variant="outline"
              onClick={() => onCategoryChange(actionButtonConfig.toggleCategory)}
            >
              <actionButtonConfig.icon className="h-4 w-4 mr-2" />
              {actionButtonConfig.currentText}
            </Button>
          )}
          
          {selectedCategory !== "estados" && (
            <AdvancedFilters 
              onFiltersChange={setAdvancedFilters}
              activeFilters={advancedFilters}
              selectedCategory={selectedCategory}
              lossReasons={lossReasons}
            />
          )}
        </div>
      </div>
    </Card>
  );
}
