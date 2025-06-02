
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Users, BarChart3, LineChart, Filter } from "lucide-react";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Lead } from "@/types/lead";
import { DateFilter } from "@/components/DateFilter";
import { DateRange } from "react-day-picker";

interface ActionTypesChartProps {
  leads: Lead[];
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  "consultoria": "Consultoria Jurídica",
  "contratos": "Contratos",
  "trabalhista": "Trabalhista",
  "compliance": "Compliance",
  "tributario": "Tributário",
  "civil": "Civil",
  "criminal": "Criminal",
  "outros": "Outros"
};

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899', '#6366f1', '#eab308'];

export function ActionTypesChart({ leads }: ActionTypesChartProps) {
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
    
    const actionTypes = filteredLeads.reduce((acc, lead) => {
      const type = lead.action_type || "outros";
      const label = ACTION_TYPE_LABELS[type] || type;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(actionTypes)
      .map(([type, count], index) => ({
        type: type.length > 15 ? type.substring(0, 15) + '...' : type,
        fullType: type,
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
            <Target className="h-5 w-5 text-blue-500" />
            Tipos de Ação
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
          <p>Nenhum lead encontrado.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-500" />
          Tipos de Ação
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 mr-4">
            <Users className="h-4 w-4" />
            <span>{totalLeads} leads</span>
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
              <div key={item.fullType} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-gray-800 truncate text-sm" title={item.fullType}>
                      {item.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 ml-4">
                    <span className="font-bold text-gray-900 min-w-[2.5rem] text-right text-lg">{item.count}</span>
                    <span className="text-xs bg-gradient-to-r from-blue-100 to-blue-200 px-3 py-1.5 rounded-full font-semibold min-w-[4rem] text-center shadow-sm border text-blue-800">
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
                dataKey="type" 
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
                labelFormatter={(label) => `Tipo: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2, fill: '#dbeafe' }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Total de leads: {totalLeads}</span>
          <span>Principal tipo: {chartData[0]?.fullType || 'N/A'}</span>
        </div>
      </div>
    </Card>
  );
}
