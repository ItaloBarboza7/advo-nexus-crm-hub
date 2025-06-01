
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingDown, AlertTriangle, BarChart3, PieChart } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useChartPreferences } from "@/hooks/useChartPreferences";

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
  const { chartType, updateChartType } = useChartPreferences('loss-reasons');

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
    const gradients = [
      "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      "linear-gradient(135deg, #f97316 0%, #ea580c 100%)", 
      "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
      "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
      "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
      "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
    ];
    return gradients[index % gradients.length];
  };

  const getPieColor = (index: number) => {
    const colors = [
      "#ef4444", "#f97316", "#eab308", "#3b82f6", "#8b5cf6", "#ec4899"
    ];
    return colors[index % colors.length];
  };

  const renderBarChart = () => (
    <div className="space-y-6">
      {lossData.map((item, index) => (
        <div key={item.reason} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full shadow-md"
                style={{ background: getBarColor(index) }}
              />
              <span className="text-sm font-semibold text-gray-800">
                {item.reason}
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
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
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
    const total = lossData.reduce((sum, item) => sum + item.count, 0);
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
            
            {lossData.map((item, index) => {
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
                  key={item.reason}
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
          {lossData.map((item, index) => (
            <div key={item.reason} className="flex items-center gap-3 p-2 bg-white rounded-lg shadow-sm border border-gray-100">
              <div 
                className="w-4 h-4 rounded-full shadow-md flex-shrink-0"
                style={{ backgroundColor: getPieColor(index) }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-gray-700 truncate block">{item.reason}</span>
                <span className="text-xs text-gray-500">{item.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="p-8 bg-gradient-to-br from-white via-red-50 to-orange-50 border-red-100 shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 shadow-lg">
            <TrendingDown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Análise de Motivos de Perda
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Distribuição percentual dos motivos que levaram à perda de leads
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
              className={chartType === "bar" ? "bg-red-50 text-red-700" : ""}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Gráfico de Barras
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => updateChartType("pie")}
              className={chartType === "pie" ? "bg-red-50 text-red-700" : ""}
            >
              <PieChart className="h-4 w-4 mr-2" />
              Gráfico de Pizza
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {chartType === "bar" ? renderBarChart() : renderPieChart()}

      {/* Resumo estatístico modernizado */}
      <div className="mt-8 pt-6 border-t border-red-100">
        <div className="grid grid-cols-2 gap-6 text-center">
          <div className="bg-gradient-to-br from-white to-red-50 rounded-xl p-4 shadow-md border border-red-100">
            <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              {lossData.reduce((sum, item) => sum + item.count, 0)}
            </div>
            <div className="text-xs text-gray-600 mt-1">Total de Perdas</div>
          </div>
          <div className="bg-gradient-to-br from-white to-orange-50 rounded-xl p-4 shadow-md border border-orange-100">
            <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              {lossData.length}
            </div>
            <div className="text-xs text-gray-600 mt-1">Motivos Diferentes</div>
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
