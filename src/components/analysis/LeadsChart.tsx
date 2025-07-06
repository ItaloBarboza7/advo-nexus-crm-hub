
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Lead } from "@/types/lead";
import { ViewToggleDropdown } from "./ViewToggleDropdown";
import { useState, useMemo, useEffect, useCallback } from "react";
import { format, startOfWeek, endOfWeek, getDay, getMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BrazilTimezone } from "@/lib/timezone";
import { DateRange } from "react-day-picker";

interface LeadsChartProps {
  leads: Lead[];
  title: string;
  filterFunction?: (lead: Lead) => boolean;
  viewMode?: 'weekly' | 'monthly';
  appliedDateRange?: DateRange | undefined;
}

export function LeadsChart({ leads, title, filterFunction, viewMode: externalViewMode, appliedDateRange }: LeadsChartProps) {
  const [internalViewMode, setInternalViewMode] = useState<'weekly' | 'monthly'>('weekly');
  
  // Se receber viewMode como prop, usar ele, senão usar o estado interno
  const currentViewMode = externalViewMode || internalViewMode;

  console.log(`📊 [LeadsChart "${title}"] Renderizando com:`, {
    leadsCount: leads?.length || 0,
    currentViewMode,
    hasAppliedDateRange: !!appliedDateRange,
    appliedDateRangeSummary: appliedDateRange ? {
      from: appliedDateRange.from ? BrazilTimezone.formatDateForDisplay(appliedDateRange.from) : 'N/A',
      to: appliedDateRange.to ? BrazilTimezone.formatDateForDisplay(appliedDateRange.to) : 'N/A'
    } : 'Nenhum',
    hasFilterFunction: !!filterFunction,
    externalViewMode
  });

  // Sincronizar o estado interno com o viewMode externo quando ele mudar
  useEffect(() => {
    if (externalViewMode) {
      setInternalViewMode(externalViewMode);
      console.log(`📊 LeadsChart "${title}" - viewMode sincronizado para: ${externalViewMode}`);
    }
  }, [externalViewMode, title]);

  // ERROR HANDLING: Validar props essenciais
  if (!leads || !Array.isArray(leads)) {
    console.error(`❌ [LeadsChart "${title}"] - leads inválido:`, leads);
    return (
      <Card className="p-6">
        <CardContent>
          <div className="text-center text-red-500">
            Erro: Dados de leads inválidos
          </div>
        </CardContent>
      </Card>
    );
  }

  // FUNÇÃO CORRIGIDA para gerar o título com período - usando useCallback para estabilidade
  const getChartTitle = useCallback(() => {
    const baseTitle = `${title} - ${currentViewMode === 'weekly' ? 'Por Dia da Semana' : 'Por Mês'}`;
    
    console.log(`📊 [LeadsChart "${title}"] getChartTitle - Processando título:`, {
      baseTitle,
      currentViewMode,
      hasAppliedDateRange: !!appliedDateRange,
      dateRangeDetails: appliedDateRange ? {
        from: appliedDateRange.from ? BrazilTimezone.formatDateForDisplay(appliedDateRange.from) : 'N/A',
        to: appliedDateRange.to ? BrazilTimezone.formatDateForDisplay(appliedDateRange.to) : 'N/A'
      } : 'N/A'
    });
    
    // Para gráficos mensais com período aplicado, mostrar período no título
    if (currentViewMode === 'monthly' && appliedDateRange?.from) {
      console.log(`📊 [LeadsChart "${title}"] Adicionando período ao título mensal`);
      
      try {
        const fromDate = BrazilTimezone.formatDateForDisplay(appliedDateRange.from);
        const toDate = appliedDateRange.to ? BrazilTimezone.formatDateForDisplay(appliedDateRange.to) : fromDate;
        
        const finalTitle = fromDate === toDate 
          ? `${baseTitle} (${fromDate})`
          : `${baseTitle} (${fromDate} - ${toDate})`;
        
        console.log(`✅ [LeadsChart "${title}"] Título final: ${finalTitle}`);
        return finalTitle;
      } catch (error) {
        console.error(`❌ [LeadsChart "${title}"] Erro ao formatar datas:`, error);
        return baseTitle;
      }
    }
    
    console.log(`📊 [LeadsChart "${title}"] Usando título base: ${baseTitle}`);
    return baseTitle;
  }, [title, currentViewMode, appliedDateRange]);

  // Cálculo de chartData com melhor logging
  const chartData = useMemo(() => {
    console.log(`📊 [LeadsChart "${title}"] Calculando chartData:`, {
      totalLeads: leads.length,
      currentViewMode,
      hasFilterFunction: !!filterFunction
    });

    try {
      const filteredLeads = filterFunction ? leads.filter(filterFunction) : leads;
      
      console.log(`📊 [LeadsChart "${title}"] Leads após filtro:`, {
        original: leads.length,
        filtered: filteredLeads.length
      });
      
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

        console.log(`📊 [LeadsChart "${title}"] Dados semanais calculados:`, weeklyData);
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

        console.log(`📊 [LeadsChart "${title}"] Dados mensais calculados:`, monthlyData);
        return monthlyData;
      }
    } catch (error) {
      console.error(`❌ [LeadsChart "${title}"] Erro ao processar dados:`, error);
      return [];
    }
  }, [leads, currentViewMode, filterFunction, title]);

  const totalLeads = chartData.reduce((sum, item) => sum + item.leads, 0);
  const maxPeriod = chartData.reduce((prev, current) => 
    current.leads > prev.leads ? current : prev
  );

  const chartConfig = {
    leads: {
      label: "Leads",
      color: "hsl(220, 98%, 61%)",
    },
  };

  const handleViewChange = (view: 'weekly' | 'monthly') => {
    console.log(`📊 LeadsChart "${title}" - Mudança de visualização: ${view}`);
    setInternalViewMode(view);
  };

  const finalTitle = getChartTitle();

  console.log(`📊 [LeadsChart "${title}"] Finalizando render:`, {
    finalTitle,
    totalLeads,
    maxPeriod: maxPeriod.period,
    dataPoints: chartData.length
  });

  return (
    <Card className="p-6">
      <CardHeader className="p-0 mb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            {finalTitle}
          </CardTitle>
          {/* Só mostrar o dropdown interno se não receber viewMode como prop */}
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
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#1e40af" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="period"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  angle={-45}
                  textAnchor="end"
                  height={35}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#6b7280' }}
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
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">{totalLeads}</div>
            <div className="text-sm text-gray-600">Total de Leads</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-lg font-bold text-purple-600">
              {maxPeriod.period}
            </div>
            <div className="text-sm text-gray-600">
              Melhor Período ({maxPeriod.leads} leads)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
