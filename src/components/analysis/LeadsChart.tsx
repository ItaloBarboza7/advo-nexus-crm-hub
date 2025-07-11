import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Lead } from "@/types/lead";
import { ViewToggleDropdown } from "./ViewToggleDropdown";
import { useState, useMemo, useEffect } from "react";
import { format, startOfWeek, endOfWeek, getDay, getMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadsChartProps {
  leads: Lead[];
  title: string;
  filterFunction?: (lead: Lead) => boolean;
  viewMode?: 'weekly' | 'monthly';
}

export function LeadsChart({ leads, title, filterFunction, viewMode: externalViewMode }: LeadsChartProps) {
  const [internalViewMode, setInternalViewMode] = useState<'weekly' | 'monthly'>('weekly');
  
  const currentViewMode = externalViewMode || internalViewMode;

  useEffect(() => {
    if (externalViewMode) {
      setInternalViewMode(externalViewMode);
      console.log(`📊 LeadsChart "${title}" - viewMode atualizado para: ${externalViewMode}`);
    }
  }, [externalViewMode, title]);

  const chartData = useMemo(() => {
    const filteredLeads = filterFunction ? leads.filter(filterFunction) : leads;
    
    console.log(`📊 LeadsChart "${title}" - gerando dados para viewMode: ${currentViewMode}`);
    console.log(`📋 LeadsChart "${title}" - ${filteredLeads.length} leads filtrados`);
    
    if (currentViewMode === 'weekly') {
      const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const weeklyData = weekDays.map((day, index) => ({
        period: day,
        leads: 0
      }));

      filteredLeads.forEach(lead => {
        if (lead.created_at) {
          const dayIndex = getDay(new Date(lead.created_at));
          weeklyData[dayIndex].leads += 1;
        }
      });

      return weeklyData;
    } else {
      const months = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ];
      const monthlyData = months.map((month, index) => ({
        period: month,
        leads: 0
      }));

      filteredLeads.forEach(lead => {
        if (lead.created_at) {
          const monthIndex = getMonth(new Date(lead.created_at));
          monthlyData[monthIndex].leads += 1;
        }
      });

      return monthlyData;
    }
  }, [leads, currentViewMode, filterFunction, title]);

  const totalLeads = chartData.reduce((sum, item) => sum + item.leads, 0);
  const maxPeriod = chartData.reduce((prev, current) => 
    current.leads > prev.leads ? current : prev
  );

  const chartConfig = {
    leads: {
      label: "Leads",
      color: "hsl(var(--primary))",
    },
  };

  const handleViewChange = (view: 'weekly' | 'monthly') => {
    console.log(`📊 LeadsChart "${title}" - handleViewChange interno chamado: ${view}`);
    setInternalViewMode(view);
  };

  return (
    <Card className="p-6">
      <CardHeader className="p-0 mb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-card-foreground">
            {title} - {currentViewMode === 'weekly' ? 'Por Dia da Semana' : 'Por Mês'}
          </CardTitle>
          {!externalViewMode && (
            <ViewToggleDropdown 
              currentView={currentViewMode}
              onViewChange={handleViewChange}
            />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="h-64 mb-4">
          <ChartContainer config={chartConfig} className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 25 }}>
                <defs>
                  <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="period"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  angle={-45}
                  textAnchor="end"
                  height={35}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  width={25}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value, name) => [`${value}`, 'Leads']}
                />
                <Bar 
                  dataKey="leads" 
                  fill="url(#leadsGradient)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalLeads}</div>
            <div className="text-sm text-muted-foreground">Total de Leads</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {maxPeriod.period}
            </div>
            <div className="text-sm text-muted-foreground">
              Melhor Período ({maxPeriod.leads} leads)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
