
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Filter, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface AdvancedFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  activeFilters: FilterOptions;
}

export interface FilterOptions {
  status: string[];
  source: string[];
  actionType: string[];
  valueRange: { min: number | null; max: number | null };
}

export function AdvancedFilters({ onFiltersChange, activeFilters }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const statusOptions = [
    { value: "Novo", label: "Novo" },
    { value: "Reunião", label: "Reunião" },
    { value: "Proposta", label: "Proposta" },
    { value: "Contrato Fechado", label: "Contrato Fechado" },
    { value: "Perdido", label: "Perdido" }
  ];

  const sourceOptions = [
    { value: "website", label: "Website" },
    { value: "indicacao", label: "Indicação" },
    { value: "google", label: "Google Ads" },
    { value: "facebook", label: "Facebook" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "outros", label: "Outros" }
  ];

  const actionTypeOptions = [
    { value: "consultoria", label: "Consultoria Jurídica" },
    { value: "contratos", label: "Contratos" },
    { value: "trabalhista", label: "Trabalhista" },
    { value: "compliance", label: "Compliance" },
    { value: "tributario", label: "Tributário" },
    { value: "civil", label: "Civil" },
    { value: "criminal", label: "Criminal" },
    { value: "outros", label: "Outros" }
  ];

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatus = checked
      ? [...activeFilters.status, status]
      : activeFilters.status.filter(s => s !== status);
    
    onFiltersChange({ ...activeFilters, status: newStatus });
  };

  const handleSourceChange = (source: string, checked: boolean) => {
    const newSource = checked
      ? [...activeFilters.source, source]
      : activeFilters.source.filter(s => s !== source);
    
    onFiltersChange({ ...activeFilters, source: newSource });
  };

  const handleActionTypeChange = (actionType: string, checked: boolean) => {
    const newActionType = checked
      ? [...activeFilters.actionType, actionType]
      : activeFilters.actionType.filter(a => a !== actionType);
    
    onFiltersChange({ ...activeFilters, actionType: newActionType });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      status: [],
      source: [],
      actionType: [],
      valueRange: { min: null, max: null }
    });
  };

  const getActiveFiltersCount = () => {
    return activeFilters.status.length + 
           activeFilters.source.length + 
           activeFilters.actionType.length;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filtros Avançados
          {activeFiltersCount > 0 && (
            <Badge className="ml-2 bg-blue-100 text-blue-800 h-5 w-5 p-0 flex items-center justify-center">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-4 bg-white border border-gray-200 shadow-lg">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Filtros Avançados</h3>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          <Separator />

          {/* Status Filter */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Status</h4>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={activeFilters.status.includes(option.value)}
                    onCheckedChange={(checked) => 
                      handleStatusChange(option.value, checked as boolean)
                    }
                  />
                  <label 
                    htmlFor={`status-${option.value}`} 
                    className="text-sm text-gray-600 cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Source Filter */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Fonte</h4>
            <div className="space-y-2">
              {sourceOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`source-${option.value}`}
                    checked={activeFilters.source.includes(option.value)}
                    onCheckedChange={(checked) => 
                      handleSourceChange(option.value, checked as boolean)
                    }
                  />
                  <label 
                    htmlFor={`source-${option.value}`} 
                    className="text-sm text-gray-600 cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Action Type Filter */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Tipo de Ação</h4>
            <div className="space-y-2">
              {actionTypeOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`action-${option.value}`}
                    checked={activeFilters.actionType.includes(option.value)}
                    onCheckedChange={(checked) => 
                      handleActionTypeChange(option.value, checked as boolean)
                    }
                  />
                  <label 
                    htmlFor={`action-${option.value}`} 
                    className="text-sm text-gray-600 cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
