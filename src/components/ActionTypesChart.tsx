
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Briefcase, BarChart3, PieChart } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface ActionTypesChartProps {
  leadsData: Array<{
    id: number;
    status: string;
    action_type: string | null;
    category: string;
  }>;
  selectedCategory: string;
}

// Move getActionTypeLabel outside the component to avoid initialization issues
const getActionTypeLabel = (actionType: string) => {
  const labels: Record<string, string> = {
    "consultoria": "Consultoria Jurídica",
    "contratos": "Contratos",
    "trabalhista": "Trabalhista",
    "compliance": "Compliance",
    "tributario": "Tributário",
    "civil": "Civil",
    "criminal": "Criminal",
    "outros": "Outros"
  };
  return labels[actionType] || actionType;
};

export function ActionTypesChart({ leadsData, selectedCategory }: ActionTypesChartProps) {
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");

  const actionTypeData = useMemo(() => {
    let filteredLeads = [];

    if (selectedCategory === "contratos") {
      // Leads com status "Contrato Fechado"
      filteredLeads = leadsData.filter(lead => lead.status === "Novo Contrato");
    } else if (selectedCategory === "oportunidades") {
      // Leads que passaram por "Reunião" ou "Proposta" - para simplificar, vamos usar leads com status "Oportunidade"
      filteredLeads = leadsData.filter(lead => lead.status === "Oportunidade");
    } else {
      return [];
    }

    // Filtrar leads com action_type
    const leadsWithActionType = filteredLeads.filter(lead => lead.action_type);

    if (leadsWithActionType.length === 0) return [];

    // Contar ocorrências de cada tipo de ação
    const actionTypeCounts = leadsWithActionType.reduce((acc, lead) => {
      if (lead.action_type) {
        acc[lead.action_type] = (acc[lead.action_type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Calcular porcentagens e ordenar por frequência
    const totalActions = leadsWithActionType.length;
    return Object.entries(actionTypeCounts)
      .map(([actionType, count]) => ({
        actionType: getActionTypeLabel(actionType),
        count,
        percentage: Math.round((count / totalActions) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  }, [leadsData, selectedCategory]);

  // Só mostrar o gráfico se há dados para exibir
  if (actionTypeData.length === 0) return null;

  // Cores modernas para as barras
  const getBarColor = (index: number) => {
    const colors = [
      "bg-gradient-to-r from-blue-500 to-blue-600",
      "bg-gradient-to-r from-green-500 to-green-600", 
      "bg-gradient-to-r from-purple-500 to-purple-600",
      "bg-gradient-to-r from-orange-500 to-orange-600",
      "bg-gradient-to-r from-pink-500 to-pink-600",
      "bg-gradient-to-r from-teal-500 to-teal-600",
    ];
    return colors[index % colors.length];
  };

  const getPieColor = (index: number) => {
    const colors = [
      "#3b82f6", "#10b981", "#8b5cf6", "#f97316", "#ec4899", "#14b8a6"
    ];
    return colors[index % colors.length];
  };

  const getTitle = () => {
    if (selectedCategory === "contratos") {
      return "Tipos de Ação - Novos Contratos";
    } else if (selectedCategory === "oportunidades") {
      return "Tipos de Ação - Oportunidades";
    }
    return "Tipos de Ação";
  };

  const getDescription = () => {
    if (selectedCategory === "contratos") {
      return "Distribuição dos tipos de ação para leads com contratos fechados";
    } else if (selectedCategory === "oportunidades") {
      return "Distribuição dos tipos de ação para leads em oportunidade";
    }
    return "Distribuição dos tipos de ação";
  };

  const renderBarChart = () => (
    <div className="space-y-4">
      {actionTypeData.map((item, index) => (
        <div key={item.actionType} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {item.actionType}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-gray-900">
                {item.percentage}%
              </span>
              <span className="text-xs text-gray-500 ml-1">
                ({item.count} leads)
              </span>
            </div>
          </div>
          
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
              <div
                className={`h-3 rounded-full transition-all duration-700 ease-out ${getBarColor(index)} shadow-sm`}
                style={{ 
                  width: `${item.percentage}%`,
                  background: index === 0 
                    ? "linear-gradient(90deg, #3b82f6, #2563eb)" 
                    : index === 1 
                    ? "linear-gradient(90deg, #10b981, #059669)"
                    : index === 2
                    ? "linear-gradient(90deg, #8b5cf6, #7c3aed)"
                    : index === 3
                    ? "linear-gradient(90deg, #f97316, #ea580c)"
                    : index === 4
                    ? "linear-gradient(90deg, #ec4899, #db2777)"
                    : "linear-gradient(90deg, #14b8a6, #0d9488)"
                }}
              />
            </div>
            
            {/* Efeito de brilho */}
            <div 
              className="absolute top-0 left-0 h-3 rounded-full opacity-30 bg-white"
              style={{ 
                width: `${Math.min(item.percentage * 0.6, 100)}%`,
                background: "linear-gradient(90deg, rgba(255,255,255,0.8), rgba(255,255,255,0))"
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );

  const renderPieChart = () => {
    const total = actionTypeData.reduce((sum, item) => sum + item.count, 0);
    let currentAngle = 0;

    return (
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width="200" height="200" className="transform -rotate-90">
            {actionTypeData.map((item, index) => {
              const percentage = item.count / total;
              const angle = percentage * 360;
              const radius = 80;
              const centerX = 100;
              const centerY = 100;
              
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              
              const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
              const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
              const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
              const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');
              
              currentAngle = endAngle;
              
              return (
                <path
                  key={item.actionType}
                  d={pathData}
                  fill={getPieColor(index)}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              );
            })}
          </svg>
          
          {/* Legend */}
          <div className="mt-4 space-y-2">
            {actionTypeData.map((item, index) => (
              <div key={item.actionType} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: getPieColor(index) }}
                />
                <span className="text-gray-700">{item.actionType}</span>
                <span className="text-gray-500">({item.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            {selectedCategory === "contratos" ? (
              <Briefcase className="h-5 w-5 text-blue-600" />
            ) : (
              <Target className="h-5 w-5 text-blue-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {getTitle()}
            </h3>
            <p className="text-sm text-gray-600">
              {getDescription()}
            </p>
          </div>
        </div>

        {/* Dropdown para trocar tipo de gráfico */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {chartType === "bar" ? (
                <BarChart3 className="h-4 w-4" />
              ) : (
                <PieChart className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => setChartType("bar")}
              className={chartType === "bar" ? "bg-gray-100" : ""}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Gráfico de Barras
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setChartType("pie")}
              className={chartType === "pie" ? "bg-gray-100" : ""}
            >
              <PieChart className="h-4 w-4 mr-2" />
              Gráfico de Pizza
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {chartType === "bar" ? renderBarChart() : renderPieChart()}

      {/* Resumo estatístico */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {actionTypeData.reduce((sum, item) => sum + item.count, 0)}
            </div>
            <div className="text-xs text-gray-600">
              {selectedCategory === "contratos" ? "Contratos" : "Oportunidades"}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {actionTypeData.length}
            </div>
            <div className="text-xs text-gray-600">Tipos Diferentes</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
