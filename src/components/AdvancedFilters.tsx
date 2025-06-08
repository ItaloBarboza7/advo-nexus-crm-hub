
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { StatusFilter } from "@/components/filters/StatusFilter";
import { SourceFilter } from "@/components/filters/SourceFilter";
import { ActionGroupFilter } from "@/components/filters/ActionGroupFilter";
import { StateFilter } from "@/components/filters/StateFilter";
import { LossReasonFilter } from "@/components/filters/LossReasonFilter";
import { useFilterOptions } from "@/hooks/useFilterOptions";

interface AdvancedFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  activeFilters: FilterOptions;
  selectedCategory?: string;
  lossReasons?: Array<{ id: string; reason: string; }>;
  onLossReasonUpdate?: () => void;
  onDeleteLossReason?: (lossReasonId: string, lossReasonName: string) => Promise<boolean>;
  onAddLossReason?: (reason: string) => Promise<boolean>;
}

export interface FilterOptions {
  status: string[];
  source: string[];
  actionType: string[];
  state: string[];
  lossReason: string[];
  valueRange: { min: number | null; max: number | null };
}

export function AdvancedFilters({ 
  onFiltersChange, 
  activeFilters, 
  selectedCategory, 
  lossReasons = [],
  onLossReasonUpdate,
  onDeleteLossReason,
  onAddLossReason
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { statusOptions, sourceOptions, actionGroupOptions, stateOptions } = useFilterOptions();

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

  const handleActionGroupChange = (actionGroup: string, checked: boolean) => {
    const newActionType = checked
      ? [...activeFilters.actionType, actionGroup]
      : activeFilters.actionType.filter(a => a !== actionGroup);
    
    onFiltersChange({ ...activeFilters, actionType: newActionType });
  };

  const handleStateChange = (state: string, checked: boolean) => {
    const newState = checked
      ? [...activeFilters.state, state]
      : activeFilters.state.filter(s => s !== state);
    
    onFiltersChange({ ...activeFilters, state: newState });
  };

  const handleLossReasonChange = (lossReason: string, checked: boolean) => {
    const newLossReason = checked
      ? [...activeFilters.lossReason, lossReason]
      : activeFilters.lossReason.filter(l => l !== lossReason);
    
    onFiltersChange({ ...activeFilters, lossReason: newLossReason });
    
    // Notificar sobre mudança nos motivos de perda para sincronizar dados
    if (onLossReasonUpdate) {
      console.log('🔄 [AdvancedFilters] Notificando mudança nos motivos de perda...');
      onLossReasonUpdate();
    }
  };

  const clearAllFilters = () => {
    onFiltersChange({
      status: [],
      source: [],
      actionType: [],
      state: [],
      lossReason: [],
      valueRange: { min: null, max: null }
    });
  };

  const getActiveFiltersCount = () => {
    return activeFilters.status.length + 
           activeFilters.source.length + 
           activeFilters.actionType.length +
           activeFilters.state.length +
           activeFilters.lossReason.length;
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
      <DropdownMenuContent 
        className="w-80 p-0 bg-white border border-gray-200 shadow-lg" 
        side="bottom" 
        align="start"
        sideOffset={5}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Filtros Avançados</h3>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-96">
          <div className="p-4 space-y-4">
            {selectedCategory !== "perdas" && (
              <>
                <StatusFilter
                  statusOptions={statusOptions}
                  activeFilters={activeFilters.status}
                  onStatusChange={handleStatusChange}
                />
                <Separator />
              </>
            )}

            <SourceFilter
              sourceOptions={sourceOptions}
              activeFilters={activeFilters.source}
              onSourceChange={handleSourceChange}
            />

            <Separator />

            <ActionGroupFilter
              actionGroupOptions={actionGroupOptions}
              activeFilters={activeFilters.actionType}
              onActionGroupChange={handleActionGroupChange}
            />

            <Separator />

            {selectedCategory === "perdas" && (
              <>
                <LossReasonFilter
                  lossReasons={lossReasons}
                  activeFilters={activeFilters.lossReason}
                  onLossReasonChange={handleLossReasonChange}
                  onDeleteLossReason={onDeleteLossReason}
                  onAddLossReason={onAddLossReason}
                />
                <Separator />
              </>
            )}

            <StateFilter
              stateOptions={stateOptions}
              activeFilters={activeFilters.state}
              onStateChange={handleStateChange}
            />
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
