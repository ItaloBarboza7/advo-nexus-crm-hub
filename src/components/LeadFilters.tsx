
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, X, DollarSign } from "lucide-react";
import { useFilterOptions } from "@/hooks/useFilterOptions";

interface LeadFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  activeFilters: FilterOptions;
}

export interface FilterOptions {
  status: string[];
  source: string[];
  valueRange: {
    min: number | null;
    max: number | null;
  };
  state: string[];
  actionType: string[];
}

const LEAD_STATUSES = [
  { id: "Novo", title: "Novo", color: "bg-blue-100 text-blue-800" },
  { id: "Proposta", title: "Proposta", color: "bg-purple-100 text-purple-800" },
  { id: "Reunião", title: "Reunião", color: "bg-orange-100 text-orange-800" },
  { id: "Contrato Fechado", title: "Contrato Fechado", color: "bg-green-100 text-green-800" },
  { id: "Perdido", title: "Perdido", color: "bg-red-100 text-red-800" },
  { id: "Finalizado", title: "Finalizado", color: "bg-gray-100 text-gray-800" },
];

const COMMON_STATES = [
  "São Paulo", "Rio de Janeiro", "Minas Gerais", "Espírito Santo",
  "Paraná", "Santa Catarina", "Rio Grande do Sul", "Bahia",
  "Pernambuco", "Ceará", "Goiás", "Distrito Federal"
];

const COMMON_ACTION_TYPES = [
  "Consulta",
  "Contrato",
  "Assessoria",
  "Representação",
  "Parecer",
  "Mediação"
];

export function LeadFilters({ onFiltersChange, activeFilters }: LeadFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { sourceOptions, loading: sourcesLoading } = useFilterOptions();

  const updateFilters = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...activeFilters, [key]: value };
    onFiltersChange(newFilters);
  };

  const toggleArrayFilter = (key: 'status' | 'source' | 'state' | 'actionType', value: string) => {
    const currentArray = activeFilters[key];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilters(key, newArray);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      status: [],
      source: [],
      valueRange: { min: null, max: null },
      state: [],
      actionType: []
    });
  };

  const hasActiveFilters = () => {
    return activeFilters.status.length > 0 ||
           activeFilters.source.length > 0 ||
           activeFilters.state.length > 0 ||
           activeFilters.actionType.length > 0 ||
           activeFilters.valueRange.min !== null ||
           activeFilters.valueRange.max !== null;
  };

  const getActiveFiltersCount = () => {
    return activeFilters.status.length +
           activeFilters.source.length +
           activeFilters.state.length +
           activeFilters.actionType.length +
           (activeFilters.valueRange.min !== null ? 1 : 0) +
           (activeFilters.valueRange.max !== null ? 1 : 0);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Filter className="h-4 w-4 mr-2" />
        Filtros
        {hasActiveFilters() && (
          <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
            {getActiveFiltersCount()}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 mt-2 w-96 p-4 z-50 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Filtros</h3>
            <div className="flex gap-2">
              {hasActiveFilters() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-red-600 hover:text-red-700"
                >
                  Limpar Tudo
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Status */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Status</Label>
              <div className="flex flex-wrap gap-2">
                {LEAD_STATUSES.map((status) => (
                  <Badge
                    key={status.id}
                    variant={activeFilters.status.includes(status.id) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      activeFilters.status.includes(status.id) ? status.color : ""
                    }`}
                    onClick={() => toggleArrayFilter('status', status.id)}
                  >
                    {status.title}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Fonte (agora dinâmica) */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Fonte</Label>
              <div className="flex flex-wrap gap-2 min-h-[32px]">
                {sourcesLoading ? (
                  <span className="text-xs text-gray-400">Carregando fontes...</span>
                ) : (
                  sourceOptions.length === 0 ? (
                    <span className="text-xs text-gray-400">Nenhuma fonte cadastrada</span>
                  ) : (
                    sourceOptions.map((source) => (
                      <Badge
                        key={source.value}
                        variant={activeFilters.source.includes(source.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleArrayFilter('source', source.value)}
                      >
                        {source.label}
                      </Badge>
                    ))
                  )
                )}
              </div>
            </div>

            {/* Estado (mantém como antes, lista fixa) */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Estado</Label>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {COMMON_STATES.map((state) => (
                  <Badge
                    key={state}
                    variant={activeFilters.state.includes(state) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter('state', state)}
                  >
                    {state}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tipo de Ação */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Tipo de Ação</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ACTION_TYPES.map((actionType) => (
                  <Badge
                    key={actionType}
                    variant={activeFilters.actionType.includes(actionType) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter('actionType', actionType)}
                  >
                    {actionType}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Faixa de Valor */}
            <div>
              <Label className="text-sm font-medium mb-2 block flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Faixa de Valor
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-gray-500">Mínimo</Label>
                  <Input
                    type="number"
                    placeholder="R$ 0"
                    value={activeFilters.valueRange.min || ""}
                    onChange={(e) => updateFilters('valueRange', {
                      ...activeFilters.valueRange,
                      min: e.target.value ? parseFloat(e.target.value) : null
                    })}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-gray-500">Máximo</Label>
                  <Input
                    type="number"
                    placeholder="R$ 100.000"
                    value={activeFilters.valueRange.max || ""}
                    onChange={(e) => updateFilters('valueRange', {
                      ...activeFilters.valueRange,
                      max: e.target.value ? parseFloat(e.target.value) : null
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
