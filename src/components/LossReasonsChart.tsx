
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingDown, AlertTriangle, BarChart3, PieChart } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface LossReason {
  id: string;
  reason: string;
}

interface LossReasonsChartProps {
  leadsData: Array<{
    id: number;
    status: string;
    lossReason: string | null;
    category: string;
  }>;
  lossReasons: LossReason[];
  selectedCategory: string;
}

export function LossReasonsChart({ leadsData, lossReasons, selectedCategory }: LossReasonsChartProps) {
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");

  const lossData = useMemo(() => {
    // Filtrar apenas os leads de perda
    const lossLeads = leadsData.filter(lead => 
      lead.status === "Perda" && lead.lossReason
    );

    if (lossLeads.length === 0) return [];

    // Contar ocorrências de cada motivo de perda
    const reasonCounts = lossLeads.reduce((acc, lead) => {
      if (lead.lossReason) {
        acc[lead.lossReason] = (acc[lead.lossReason] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Calcular porcentagens e ordenar por frequência
    const totalLosses = lossLeads.length;
    return Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: Math.round((count / totalLosses) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  }, [leadsData]);

  // Só mostrar o gráfico se há dados de perda para exibir
  if (lossData.length === 0) return null;

  // Cores modernas e futurísticas para as barras
  const getBarColor = (index: number) => {
    const colors = [
      "bg-gradient-to-r from-red-500 to-red-600",
      "bg-gradient-to-r from-orange-500 to-orange-600", 
      "bg-gradient-to-r from-yellow-500 to-yellow-600",
      "bg-gradient-to-r from-blue-500 to-blue-600",
      "bg-gradient-to-r from-purple-500 to-purple-600",
      "bg-gradient-to-r from-pink-500 to-pink-600",
    ];
    return colors[index % colors.length];
  };

  const getPieColor = (index: number) => {
    const colors = [
      "#ef4444", "#f97316", "#eab308", "#3b82f6", "#8b5cf6", "#ec4899"
    ];
    return colors[index % colors.length];
  };

  const renderBarChart = () => (
    <div className="space-y-4">
      {lossData.map((item, index) => (
        <div key={item.reason} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {item.reason}
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
                    ? "linear-gradient(90deg, #ef4444, #dc2626)" 
                    : index === 1 
                    ? "linear-gradient(90deg, #f97316, #ea580c)"
                    : index === 2
                    ? "linear-gradient(90deg, #eab308, #ca8a04)"
                    : index === 3
                    ? "linear-gradient(90deg, #3b82f6, #2563eb)"
                    : index === 4
                    ? "linear-gradient(90deg, #8b5cf6, #7c3aed)"
                    : "linear-gradient(90deg, #ec4899, #db2777)"
                }}
              />
            </div>
            
            {/* Efeito de brilho futurístico */}
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
    const total = lossData.reduce((sum, item) => sum + item.count, 0);
    let currentAngle = 0;

    return (
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width="200" height="200" className="transform -rotate-90">
            {lossData.map((item, index) => {
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
                  key={item.reason}
                  d={pathData}
                  fill={getPieColor(index)}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              );
            })}
          </svg>
          
          {/* Legend */}
          <div className="mt-4 space-y-2">
            {lossData.map((item, index) => (
              <div key={item.reason} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: getPieColor(index) }}
                />
                <span className="text-gray-700">{item.reason}</span>
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
          <div className="p-2 rounded-lg bg-red-100">
            <TrendingDown className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Análise de Motivos de Perda
            </h3>
            <p className="text-sm text-gray-600">
              Distribuição percentual dos motivos que levaram à perda de leads
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
            <div className="text-2xl font-bold text-red-600">
              {lossData.reduce((sum, item) => sum + item.count, 0)}
            </div>
            <div className="text-xs text-gray-600">Total de Perdas</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-orange-600">
              {lossData.length}
            </div>
            <div className="text-xs text-gray-600">Motivos Diferentes</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
