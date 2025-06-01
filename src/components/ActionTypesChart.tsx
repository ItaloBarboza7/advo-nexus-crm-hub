
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Briefcase, BarChart3, PieChart } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useChartPreferences } from "@/hooks/useChartPreferences";

interface ActionTypesChartProps {
  leadsData: Array<{
    id: number;
    status: string;
    action_type: string | null;
    category: string;
  }>;
  selectedCategory: string;
}

interface ActionTypeData {
  actionType: string;
  count: number;
  percentage: number;
}

// Move getActionTypeLabel outside the component to avoid initialization issues
const getActionTypeLabel = (actionType: string): string => {
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
  const { chartType, updateChartType } = useChartPreferences('action-types');

  const actionTypeData = useMemo((): ActionTypeData[] => {
    let filteredLeads = [];

    if (selectedCategory === "contratos") {
      // Corrigir: usar "Contrato Fechado" em vez de "Novo Contrato"
      filteredLeads = leadsData.filter(lead => lead.status === "Contrato Fechado");
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
    const actionTypeCounts = leadsWithActionType.reduce((acc: Record<string, number>, lead) => {
      if (lead.action_type) {
        acc[lead.action_type] = (acc[lead.action_type] || 0) + 1;
      }
      return acc;
    }, {});

    // Calcular porcentagens e ordenar por frequência
    const totalActions = leadsWithActionType.length;
    return Object.entries(actionTypeCounts)
      .map(([actionType, count]) => ({
        actionType: getActionTypeLabel(actionType),
        count: count as number,
        percentage: Math.round(((count as number) / totalActions) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  }, [leadsData, selectedCategory]);

  // Só mostrar o gráfico se há dados para exibir
  if (actionTypeData.length === 0) return null;

  // Cores modernas inspiradas na imagem (tons de roxo/violeta)
  const getBarColor = (index: number): string => {
    const gradients = [
      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", 
      "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    ];
    return gradients[index % gradients.length];
  };

  const getPieColor = (index: number): string => {
    const colors = [
      "#667eea", "#f093fb", "#4facfe", "#43e97b", "#fa709a", "#a8edea"
    ];
    return colors[index % colors.length];
  };

  const getTitle = (): string => {
    if (selectedCategory === "contratos") {
      return "Tipos de Ação - Novos Contratos";
    } else if (selectedCategory === "oportunidades") {
      return "Tipos de Ação - Oportunidades";
    }
    return "Tipos de Ação";
  };

  const getDescription = (): string => {
    if (selectedCategory === "contratos") {
      return "Distribuição dos tipos de ação para leads com contratos fechados";
    } else if (selectedCategory === "oportunidades") {
      return "Distribuição dos tipos de ação para leads em oportunidade";
    }
    return "Distribuição dos tipos de ação";
  };

  const renderBarChart = () => (
    <div className="space-y-6">
      {actionTypeData.map((item, index) => (
        <div key={item.actionType} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full shadow-md"
                style={{ background: getBarColor(index) }}
              />
              <span className="text-sm font-semibold text-gray-800">
                {item.actionType}
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-gray-900">
                {item.percentage}%
              </span>
              <span className="text-xs text-gray-500 ml-2 block">
                {item.count} leads
              </span>
            </div>
          </div>
          
          <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out shadow-lg relative overflow-hidden"
              style={{ 
                width: `${item.percentage}%`,
                background: getBarColor(index)
              }}
            >
              {/* Efeito de brilho animado */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"
                style={{ 
                  transform: "skewX(-20deg)",
                  animation: "shimmer 2s infinite"
                }}
              />
            </div>
            
            {/* Indicador de progresso */}
            <div 
              className="absolute top-0 right-0 h-full w-1 bg-white rounded-full shadow-md transition-all duration-1000"
              style={{ 
                right: `${100 - item.percentage}%`,
                opacity: item.percentage > 5 ? 1 : 0
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );

  const renderPieChart = () => {
    const total = actionTypeData.reduce((sum: number, item) => sum + item.count, 0);
    let currentAngle = 0;
    const radius = 90;
    const innerRadius = 35;

    return (
      <div className="flex flex-col items-center justify-center">
        <div className="relative mb-6">
          <svg width="240" height="240" className="transform -rotate-90 drop-shadow-lg">
            {/* Fundo circular */}
            <circle
              cx="120"
              cy="120"
              r={radius}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="2"
            />
            
            {actionTypeData.map((item, index) => {
              const percentage = item.count / total;
              const angle = percentage * 360;
              const centerX = 120;
              const centerY = 120;
              
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
                  className="hover:opacity-80 transition-all duration-300 cursor-pointer hover:scale-105"
                  style={{
                    filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))"
                  }}
                />
              );
            })}
            
            {/* Círculo interno para efeito donut */}
            <circle
              cx="120"
              cy="120"
              r={innerRadius}
              fill="white"
              className="drop-shadow-md"
            />
          </svg>
          
          {/* Texto central */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">{total}</span>
            <span className="text-xs text-gray-500">Total</span>
          </div>
        </div>
        
        {/* Legend modernizada */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {actionTypeData.map((item, index) => (
            <div key={item.actionType} className="flex items-center gap-3 p-2 bg-white rounded-lg shadow-sm border border-gray-100">
              <div 
                className="w-4 h-4 rounded-full shadow-md flex-shrink-0"
                style={{ backgroundColor: getPieColor(index) }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-gray-700 truncate block">{item.actionType}</span>
                <span className="text-xs text-gray-500">{item.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="p-8 bg-gradient-to-br from-white via-purple-50 to-blue-50 border-purple-100 shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg">
            {selectedCategory === "contratos" ? (
              <Briefcase className="h-6 w-6 text-white" />
            ) : (
              <Target className="h-6 w-6 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {getTitle()}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {getDescription()}
            </p>
          </div>
        </div>

        {/* Dropdown para trocar tipo de gráfico */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shadow-md hover:shadow-lg transition-shadow">
              {chartType === "bar" ? (
                <BarChart3 className="h-4 w-4" />
              ) : (
                <PieChart className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-xl">
            <DropdownMenuItem 
              onClick={() => updateChartType("bar")}
              className={chartType === "bar" ? "bg-purple-50 text-purple-700" : ""}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Gráfico de Barras
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => updateChartType("pie")}
              className={chartType === "pie" ? "bg-purple-50 text-purple-700" : ""}
            >
              <PieChart className="h-4 w-4 mr-2" />
              Gráfico de Pizza
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {chartType === "bar" ? renderBarChart() : renderPieChart()}

      {/* Resumo estatístico modernizado */}
      <div className="mt-8 pt-6 border-t border-purple-100">
        <div className="grid grid-cols-2 gap-6 text-center">
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl p-4 shadow-md border border-purple-100">
            <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {actionTypeData.reduce((sum: number, item) => sum + item.count, 0)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {selectedCategory === "contratos" ? "Contratos" : "Oportunidades"}
            </div>
          </div>
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl p-4 shadow-md border border-blue-100">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {actionTypeData.length}
            </div>
            <div className="text-xs text-gray-600 mt-1">Tipos Diferentes</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-20deg); }
          100% { transform: translateX(200%) skewX(-20deg); }
        }
      `}</style>
    </Card>
  );
}
