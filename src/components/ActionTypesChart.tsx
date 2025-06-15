
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Users, BarChart3, PieChart as PieChartIcon, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Lead } from "@/types/lead";
import { getChartTitle } from "@/components/analysis/ChartTitleProvider";
import { useActionGroupsAndTypes } from "@/hooks/useActionGroupsAndTypes";

interface ActionTypesChartProps {
  leads: Lead[];
  selectedCategory?: string;
}

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"
];

export function ActionTypesChart({ leads, selectedCategory = "all" }: ActionTypesChartProps) {
  const [viewType, setViewType] = useState<'bar' | 'pie'>('bar');
  const { validActionTypeNames, loadingActionOptions } = useActionGroupsAndTypes();

  const chartData = useMemo(() => {
    if (!leads || !Array.isArray(leads)) return [];

    // Agrupa por tipo válido, senão "Tipo Removido"
    const typeCounts = leads.reduce((acc, lead) => {
      let type = lead.action_type || "Tipo Removido";
      if (!validActionTypeNames.includes(type)) type = "Tipo Removido";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCounts)
      .map(([type, count], idx) => ({
        name: type,
        actionType: type,
        count,
        percentage: leads.length > 0 ? (count / leads.length) * 100 : 0,
        color: COLORS[idx % COLORS.length]
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads, validActionTypeNames]);

  const hasRemoved = chartData.some(item => item.actionType === "Tipo Removido");
  const totalLeads = leads?.length || 0;
  const chartTitle = getChartTitle({ selectedCategory, chartType: 'actionTypes' });

  const renderCustomLabel = (entry: any) => entry.percentage >= 5 ? `${entry.percentage.toFixed(0)}%` : "";

  if (loadingActionOptions) {
    return (
      <Card className="p-6">
        <div className="text-gray-600">Carregando tipos de ação...</div>
      </Card>
    );
  }

  if (totalLeads === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            {chartTitle}
          </h3>
        </div>
        <div className="text-center text-gray-500 py-8">
          <p>Nenhum lead encontrado.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          {chartTitle}
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 mr-4">
            <Users className="h-4 w-4" />
            <span>{totalLeads} leads</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={viewType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('bar')}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewType === 'pie' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('pie')}
            >
              <PieChartIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {hasRemoved && (
        <div className="mb-4 flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded-md border border-yellow-200">
          <AlertCircle className="h-4 w-4" />
          Leads marcados com tipos de ação removidos foram agrupados como <b>"Tipo Removido"</b>.
        </div>
      )}

      <div className="h-80">
        {viewType === 'bar' ? (
          <div className="space-y-4 h-full overflow-y-auto px-2">
            {chartData.map((item) => (
              <div key={item.actionType} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-gray-800 truncate text-sm">
                      {item.actionType}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 ml-4">
                    <span className="font-bold text-gray-900 min-w-[2rem] text-right">{item.count}</span>
                    <span className="text-xs bg-blue-50 px-2 py-1 rounded-full font-medium min-w-[3rem] text-center text-blue-700">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{ 
                        width: `${item.percentage}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="count"
                label={renderCustomLabel}
                labelLine={false}
              >
                {chartData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value} leads (${props.payload.percentage.toFixed(1)}%)`, 
                  props.payload.actionType
                ]}
              />
              <Legend 
                verticalAlign="bottom" 
                height={60}
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value: string, entry: any) => (
                  <span style={{ fontSize: '12px', color: '#374151' }}>
                    {entry.payload.actionType}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Total de leads: {totalLeads}</span>
          <span>Tipo principal: {chartData[0]?.actionType || 'N/A'}</span>
        </div>
      </div>
    </Card>
  );
}
