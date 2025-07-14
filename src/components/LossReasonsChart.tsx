
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      let reason = lead.loss_reason;
      if (!reason || reason.trim().toLowerCase() === "outros" || reason.trim() === "") {
        reason = "Outros";
      }
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(lossReasons)
      .map(([reason, count], index) => ({
        name: reason,
        reason,
        count,
        percentage: leads.length > 0 ? (count / leads.length) * 100 : 0,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const totalLeads = leads?.length || 0;

  const renderCustomLabel = (entry: any) => {
    const percent = entry.percentage;
    if (percent < 5) return '';
    return `${percent.toFixed(0)}%`;
  };

  if (totalLeads === 0) {
    return (
      <Card className="p-6 bg-card border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500 dark:text-red-400" />
            Motivos de Perda
          </h3>
        </div>
        <div className="text-center text-muted-foreground py-8">
          <p>Nenhum lead perdido encontrado.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-500 dark:text-red-400" />
          Motivos de Perda
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-4">
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
          <div className="space-y-4 h-full overflow-y-auto px-2">
            {chartData.map((item, index) => (
              <div key={item.reason} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-card-foreground truncate text-sm">
                      {item.reason}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground ml-4">
                    <span className="font-bold text-card-foreground min-w-[2rem] text-right">{item.count}</span>
                    <span className="text-xs bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full font-medium min-w-[3rem] text-center text-red-700 dark:text-red-300">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
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
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  color: 'hsl(var(--card-foreground))'
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value} leads (${props.payload.percentage.toFixed(1)}%)`, 
                  props.payload.reason
                ]}
              />
              <Legend 
                verticalAlign="bottom" 
                height={60}
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value: string, entry: any) => (
                  <span style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>
                    {entry.payload.reason}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Total de leads perdidos: {totalLeads}</span>
          <span>Principal motivo: {chartData[0]?.reason || 'N/A'}</span>
        </div>
      </div>
    </Card>
  );
}
