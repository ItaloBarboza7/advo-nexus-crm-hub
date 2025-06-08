import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Users, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Lead } from "@/types/lead";
import { getChartTitle } from "@/components/analysis/ChartTitleProvider";

interface ActionTypesChartProps {
  leads: Lead[];
  selectedCategory?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

export function ActionTypesChart({ leads, selectedCategory = 'all' }: ActionTypesChartProps) {
  const [viewType, setViewType] = useState<'bar' | 'pie'>('bar');

  const chartData = useMemo(() => {
    if (!leads || !Array.isArray(leads)) {
      return [];
    }
    
    const actionTypes = leads.reduce((acc, lead) => {
      const actionType = lead.action_type || "Sem tipo especificado";
      acc[actionType] = (acc[actionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(actionTypes)
      .map(([type, count], index) => ({
        name: type,
        actionType: type,
        count,
        percentage: leads.length > 0 ? (count / leads.length) * 100 : 0,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const totalLeads = leads?.length || 0;
  const chartTitle = getChartTitle({ selectedCategory, chartType: 'actionTypes' });

  const renderCustomLabel = (entry: any) => {
    const percent = entry.percentage;
    if (percent < 5) return ''; // Não mostra percentual para fatias muito pequenas
    return `${percent.toFixed(0)}%`;
  };

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

      <div className="h-80">
        {viewType === 'bar' ? (
          <div className="h-full px-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                barCategoryGap="20%"
              >
                <defs>
                  {chartData.map((entry, index) => (
                    <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={entry.color} stopOpacity={1}/>
                      <stop offset="100%" stopColor={entry.color} stopOpacity={0.8}/>
                    </linearGradient>
                  ))}
                </defs>
                <XAxis 
                  dataKey="actionType"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  width={40}
                  axisLine={false}
                  tickLine={false}
                />
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
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#gradient-${index})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
