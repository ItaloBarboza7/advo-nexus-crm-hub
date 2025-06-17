
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, X } from "lucide-react";
import { useTenantFilterOptions } from "@/hooks/useTenantFilterOptions";

export interface FilterOptions {
  status: string[];
  source: string[];
  valueRange: { min: number | null; max: number | null };
  state: string[];
  actionType: string[];
}

interface LeadFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  activeFilters: FilterOptions;
}

export function LeadFilters({ onFiltersChange, activeFilters }: LeadFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterOptions>(activeFilters);
  const { 
    statusOptions, 
    sourceOptions, 
    stateOptions, 
    getAllActionTypeOptions,
    loading 
  } = useTenantFilterOptions();

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const clearFilters = () => {
    const emptyFilters: FilterOptions = {
      status: [],
      source: [],
      valueRange: { min: null, max: null },
      state: [],
      actionType: []
    };
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
    setIsOpen(false);
  };

  const removeFilter = (type: keyof FilterOptions, value: string) => {
    const newFilters = { ...localFilters };
    if (type === 'valueRange') return;
    
    newFilters[type] = (newFilters[type] as string[]).filter(item => item !== value);
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const getActiveFiltersCount = () => {
    return (
      activeFilters.status.length +
      activeFilters.source.length +
      activeFilters.state.length +
      activeFilters.actionType.length +
      (activeFilters.valueRange.min !== null || activeFilters.valueRange.max !== null ? 1 : 0)
    );
  };

  const hasActiveFilters = getActiveFiltersCount() > 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            {loading ? "Carregando..." : "Filtros"}
            {hasActiveFilters && !loading && (
              <Badge className="ml-2 bg-blue-500 text-white text-xs px-1 py-0.5 rounded-full">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4 space-y-4" align="start">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Filtros</h3>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (!localFilters.status.includes(value)) {
                    setLocalFilters(prev => ({
                      ...prev,
                      status: [...prev.status, value]
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-1 mt-2">
                {localFilters.status.map(status => (
                  <Badge key={status} variant="secondary" className="text-xs">
                    {status}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => setLocalFilters(prev => ({
                        ...prev,
                        status: prev.status.filter(s => s !== status)
                      }))}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Fonte</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (!localFilters.source.includes(value)) {
                    setLocalFilters(prev => ({
                      ...prev,
                      source: [...prev.source, value]
                    }));
                  }
                }}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Carregando..." : "Selecione uma fonte"} />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-1 mt-2">
                {localFilters.source.map(source => (
                  <Badge key={source} variant="secondary" className="text-xs">
                    {sourceOptions.find(opt => opt.value === source)?.label || source}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => setLocalFilters(prev => ({
                        ...prev,
                        source: prev.source.filter(s => s !== source)
                      }))}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Estado</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (!localFilters.state.includes(value)) {
                    setLocalFilters(prev => ({
                      ...prev,
                      state: [...prev.state, value]
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um estado" />
                </SelectTrigger>
                <SelectContent>
                  {stateOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-1 mt-2">
                {localFilters.state.map(state => (
                  <Badge key={state} variant="secondary" className="text-xs">
                    {state}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => setLocalFilters(prev => ({
                        ...prev,
                        state: prev.state.filter(s => s !== state)
                      }))}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Tipo de Ação</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (!localFilters.actionType.includes(value)) {
                    setLocalFilters(prev => ({
                      ...prev,
                      actionType: [...prev.actionType, value]
                    }));
                  }
                }}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Carregando..." : "Selecione um tipo"} />
                </SelectTrigger>
                <SelectContent>
                  {getAllActionTypeOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-1 mt-2">
                {localFilters.actionType.map(actionType => (
                  <Badge key={actionType} variant="secondary" className="text-xs">
                    {getAllActionTypeOptions().find(opt => opt.value === actionType)?.label || actionType}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => setLocalFilters(prev => ({
                        ...prev,
                        actionType: prev.actionType.filter(at => at !== actionType)
                      }))}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Faixa de Valor (R$)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Mín"
                  value={localFilters.valueRange.min || ""}
                  onChange={(e) => setLocalFilters(prev => ({
                    ...prev,
                    valueRange: { ...prev.valueRange, min: e.target.value ? Number(e.target.value) : null }
                  }))}
                />
                <Input
                  type="number"
                  placeholder="Máx"
                  value={localFilters.valueRange.max || ""}
                  onChange={(e) => setLocalFilters(prev => ({
                    ...prev,
                    valueRange: { ...prev.valueRange, max: e.target.value ? Number(e.target.value) : null }
                  }))}
                />
              </div>
            </div>
          </div>

          <Button onClick={applyFilters} className="w-full">
            Aplicar Filtros
          </Button>
        </PopoverContent>
      </Popover>

      {/* Badges dos filtros ativos fora do popover */}
      {activeFilters.status.map(status => (
        <Badge key={`status-${status}`} variant="secondary">
          Status: {status}
          <X 
            className="h-3 w-3 ml-1 cursor-pointer" 
            onClick={() => removeFilter('status', status)}
          />
        </Badge>
      ))}
      
      {activeFilters.source.map(source => (
        <Badge key={`source-${source}`} variant="secondary">
          Fonte: {sourceOptions.find(opt => opt.value === source)?.label || source}
          <X 
            className="h-3 w-3 ml-1 cursor-pointer" 
            onClick={() => removeFilter('source', source)}
          />
        </Badge>
      ))}
      
      {activeFilters.state.map(state => (
        <Badge key={`state-${state}`} variant="secondary">
          Estado: {state}
          <X 
            className="h-3 w-3 ml-1 cursor-pointer" 
            onClick={() => removeFilter('state', state)}
          />
        </Badge>
      ))}
      
      {activeFilters.actionType.map(actionType => (
        <Badge key={`actionType-${actionType}`} variant="secondary">
          Tipo: {getAllActionTypeOptions().find(opt => opt.value === actionType)?.label || actionType}
          <X 
            className="h-3 w-3 ml-1 cursor-pointer" 
            onClick={() => removeFilter('actionType', actionType)}
          />
        </Badge>
      ))}
      
      {(activeFilters.valueRange.min !== null || activeFilters.valueRange.max !== null) && (
        <Badge variant="secondary">
          Valor: {activeFilters.valueRange.min || 0} - {activeFilters.valueRange.max || "∞"}
          <X 
            className="h-3 w-3 ml-1 cursor-pointer" 
            onClick={() => {
              const newFilters = { ...activeFilters, valueRange: { min: null, max: null } };
              onFiltersChange(newFilters);
            }}
          />
        </Badge>
      )}
    </div>
  );
}
