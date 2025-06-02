
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingDown, Users, BarChart3, LineChart, Filter } from "lucide-react";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Lead } from "@/types/lead";
import { DateFilter } from "@/components/DateFilter";
import { DateRange } from "react-day-picker";

interface LossReasonsChartProps {
  leads: Lead[];
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'];

export function LossReasonsChart({ leads }: LossReasonsChartProps) {
  const [viewType, setViewType] = useState<'bar' | 'line'>('bar');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const filteredLeads = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return leads;
    
    return leads.filter(lead => {
      const leadDate = new Date(lead.created_at);
      return leadDate >= dateRange.from! && leadDate <= dateRange.to!;
    });
  }, [leads, dateRange]);

  const chartData = useMemo(() => {
    if (!filteredLeads || !Array.isArray(filteredLeads)) {
      return [];
    }
    
    const lossReasons = filteredLeads.reduce((acc, lead) => {
      const reason = lead.loss_reason || "Sem motivo especificado";
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(lossReasons)
      .map(([reason, count], index) => ({
        reason: reason.length > 20 ? reason.substring(0, 20) + '...' : reason,
        fullReason: reason,
        count,
        percentage: filteredLeads.length > 0 ? (count / filteredLeads.length) * 100 : 0,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLeads]);

  const totalLeads = filteredLeads?.length || 0;
  const maxCount = Math.max(...chartData.map(item => item.count), 1);

  if (totalLeads === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Motivos de Perda
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>
        {showFilters && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <DateFilter date={dateRange} setDate={setDateRange} />
          </div>
        )}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant={viewType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('bar')}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('line')}
            >
              <LineChart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <DateFilter date={dateRange} setDate={setDateRange} />
        </div>
      )}

      <div className="h-80">
        {viewType === 'bar' ? (
          <div className="space-y-6 h-full overflow-y-auto">
            {chartData.map((item, index) => (
              <div key={item.fullReason} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-gray-800 truncate text-sm" title={item.fullReason}>
                      {item.reason}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 ml-4">
                    <span className="font-bold text-gray-900 min-w-[2.5rem] text-right text-lg">{item.count}</span>
                    <span className="text-xs bg-gradient-to-r from-gray-100 to-gray-200 px-3 py-1.5 rounded-full font-semibold min-w-[4rem] text-center shadow-sm border">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <div className="w-full bg-gradient-to-r from-gray-100 to-gray-200 rounded-full h-2 overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full relative overflow-hidden transition-all duration-1000 ease-out shadow-sm"
                      style={{ 
                        width: `${(item.count / maxCount) * 100}%`,
                        background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}dd 50%, ${item.color}bb 100%)`
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-white/20 to-transparent"></div>
                      <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"></div>
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-white/50 to-transparent rounded-t-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <XAxis 
                dataKey="reason" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  color: 'white'
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value} leads (${props.payload.percentage.toFixed(1)}%)`, 
                  'Quantidade'
                ]}
                labelFormatter={(label) => `Motivo: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#ef4444" 
                strokeWidth={3}
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: '#ef4444', strokeWidth: 2, fill: '#fee2e2' }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Total de leads perdidos: {totalLeads}</span>
          <span>Principal motivo: {chartData[0]?.fullReason || 'N/A'}</span>
        </div>
      </div>
    </Card>
  );
}
