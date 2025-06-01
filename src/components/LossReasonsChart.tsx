
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingDown, Users, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Lead } from "@/types/lead";

interface LossReasonsChartProps {
  leads: Lead[];
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'];

export function LossReasonsChart({ leads }: LossReasonsChartProps) {
  const [viewType, setViewType] = useState<'bar' | 'pie'>('bar');

  const chartData = useMemo(() => {
    if (!leads || !Array.isArray(leads)) {
      return [];
    }
    
    const lossReasons = leads.reduce((acc, lead) => {
      const reason = lead.loss_reason || "Sem motivo especificado";
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(lossReasons)
      .map(([reason, count], index) => ({
        reason,
        count,
        percentage: leads.length > 0 ? (count / leads.length) * 100 : 0,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const totalLeads = leads?.length || 0;
  const maxCount = Math.max(...chartData.map(item => item.count), 1);

  if (totalLeads === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Motivos de Perda
          </h3>
        </div>
        <div className="text-center text-gray-500 py-8">
          <p>Nenhum lead perdido encontrado.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-500" />
          Motivos de Perda
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 mr-4">
            <Users className="h-4 w-4" />
            <span>{totalLeads} leads perdidos</span>
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

      <div className="h-80">
        {viewType === 'bar' ? (
          <div className="space-y-4 h-full overflow-y-auto">
            {chartData.map((item, index) => (
              <div key={item.reason} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-gray-700 truncate">
                      {item.reason}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 ml-2">
                    <span className="font-medium">{item.count} leads</span>
                    <span>({item.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="relative">
                  <Progress 
                    value={(item.count / maxCount) * 100} 
                    className="h-3"
                  />
                  <div 
                    className="absolute inset-0 rounded-full transition-all duration-300"
                    style={{ 
                      background: `linear-gradient(to right, ${item.color} 0%, ${item.color}88 100%)`,
                      width: `${(item.count / maxCount) * 100}%`
                    }}
                  />
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
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
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
                  props.payload.reason
                ]}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value: string) => (
                  <span style={{ fontSize: '12px' }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Total de leads perdidos: {totalLeads}</span>
          <span>Principal motivo: {chartData[0]?.reason || 'N/A'}</span>
        </div>
      </div>
    </Card>
  );
}
