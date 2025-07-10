import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, UserX, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { DateFilter } from "@/components/DateFilter";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { useLeadsData } from "@/hooks/useLeadsData";
import { useContractsData } from "@/hooks/useContractsData";
import { useLeadStatusHistory } from "@/hooks/useLeadStatusHistory";
import { getDay, getMonth, format } from "date-fns";
import { TeamResultsPanel } from "@/components/TeamResultsPanel";
import { BrazilTimezone } from "@/lib/timezone";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSchema } from "@/hooks/useTenantSchema";

export function DashboardContent() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange | undefined>();
  const [conversionView, setConversionView] = useState<'weekly' | 'monthly'>('weekly');
  const [leadsView, setLeadsView] = useState<'weekly' | 'monthly'>('weekly');
  const [actionView, setActionView] = useState<'type' | 'group'>('type');
  const [isInitialized, setIsInitialized] = useState(false);
  const [previousMonthData, setPreviousMonthData] = useState<{
    leads: number;
    proposals: number;
    losses: number;
    closedDeals: number;
  }>({ leads: 0, proposals: 0, losses: 0, closedDeals: 0 });

  const { components } = useDashboardSettings();
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();
  
  // Use team data hooks - useLeadsData doesn't return error, useContractsData does
  const { leads: allLeads, isLoading: leadsLoading } = useLeadsData();
  const { contracts: allContracts, isLoading: contractsLoading, error: contractsError } = useContractsData();
  const { statusHistory, hasLeadPassedThroughStatus } = useLeadStatusHistory();

  // Filter team leads by date range
  const getFilteredLeads = useCallback(() => {
    if (!allLeads || allLeads.length === 0) return [];
    
    if (!appliedDateRange) return allLeads;

    const fromDate = appliedDateRange.from;
    const toDate = appliedDateRange.to || appliedDateRange.from;

    return allLeads.filter(lead => {
      const leadDate = new Date(lead.created_at);
      const leadDateLocal = BrazilTimezone.toLocal(leadDate);
      const leadDateOnly = new Date(leadDateLocal.getFullYear(), leadDateLocal.getMonth(), leadDateLocal.getDate());
      const fromDateOnly = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
      const toDateOnly = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
      
      return leadDateOnly >= fromDateOnly && leadDateOnly <= toDateOnly;
    });
  }, [allLeads, appliedDateRange]);

  // Filter team contracts by date range
  const getFilteredContracts = useCallback(() => {
    if (!allContracts || allContracts.length === 0) return [];
    
    if (!appliedDateRange) return allContracts;

    const fromDate = appliedDateRange.from;
    const toDate = appliedDateRange.to || appliedDateRange.from;

    return allContracts.filter(contract => {
      const contractDate = new Date(contract.closedAt);
      const contractDateLocal = BrazilTimezone.toLocal(contractDate);
      const contractDateOnly = new Date(contractDateLocal.getFullYear(), contractDateLocal.getMonth(), contractDateLocal.getDate());
      const fromDateOnly = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
      const toDateOnly = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
      
      return contractDateOnly >= fromDateOnly && contractDateOnly <= toDateOnly;
    });
  }, [allContracts, appliedDateRange]);

  const leads = getFilteredLeads();
  const contracts = getFilteredContracts();

  // Função para verificar se o componente deve ser exibido
  const isComponentVisible = (componentId: string) => {
    const component = components.find(comp => comp.id === componentId);
    return component ? component.visible : true;
  };

  // CORREÇÃO: Função para verificar se um lead é oportunidade (mesma lógica das análises)
  const isOpportunityLead = useCallback((lead: any): boolean => {
    console.log(`🔍 [DashboardContent] Verificando se ${lead.name} (${lead.status}) é oportunidade`);
    
    // NOVA REGRA: Oportunidades são leads que:
    // 1. NÃO estão em "Novo" (independente do histórico)
    // 2. Estão atualmente em "Proposta" ou "Reunião" OU passaram por eles (histórico)
    
    // PRIMEIRO: Excluir completamente leads com status "Novo"
    if (lead.status === "Novo") {
      console.log(`❌ [DashboardContent] Lead ${lead.name} está em Novo - SEMPRE EXCLUÍDO`);
      return false;
    }
    
    // SEGUNDO: Se está em Proposta ou Reunião atualmente, incluir automaticamente
    if (lead.status === "Proposta" || lead.status === "Reunião") {
      console.log(`✅ [DashboardContent] Lead ${lead.name} está atualmente em ${lead.status} - INCLUÍDO`);
      return true;
    }
    
    // TERCEIRO: Verificar se passou por Proposta/Reunião no histórico (incluindo finalizados)
    const hasPassedThroughTargetStatuses = hasLeadPassedThroughStatus(lead.id, ["Proposta", "Reunião"]);
    console.log(`📊 [DashboardContent] Lead ${lead.name} (${lead.status}) passou por Proposta/Reunião: ${hasPassedThroughTargetStatuses}`);
    
    if (hasPassedThroughTargetStatuses) {
      console.log(`✅ [DashboardContent] Lead ${lead.name} passou por Proposta/Reunião - INCLUÍDO mesmo estando em ${lead.status}`);
      return true;
    }
    
    console.log(`❌ [DashboardContent] Lead ${lead.name} não passou por Proposta/Reunião - EXCLUÍDO`);
    return false;
  }, [hasLeadPassedThroughStatus]);

  // CORREÇÃO: Função para verificar se existem dados históricos
  const checkForHistoricalData = useCallback(async () => {
    try {
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) return false;

      const now = BrazilTimezone.now();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const { data: historicalLeads, error } = await supabase.rpc('exec_sql' as any, {
        sql: `
          SELECT COUNT(*) as total FROM ${schema}.leads
          WHERE DATE(created_at AT TIME ZONE 'America/Sao_Paulo') 
          BETWEEN '${previousMonth.toISOString().split('T')[0]}' 
          AND '${previousMonthEnd.toISOString().split('T')[0]}'
        `
      });

      if (error) {
        console.error("❌ Erro ao verificar dados históricos:", error);
        return false;
      }

      const hasHistoricalData = Array.isArray(historicalLeads) && historicalLeads.length > 0 && historicalLeads[0].total > 0;
      console.log("📊 DashboardContent - Dados históricos:", hasHistoricalData ? "ENCONTRADOS" : "NÃO ENCONTRADOS");
      
      return hasHistoricalData;
    } catch (error) {
      console.error("❌ Erro ao verificar dados históricos:", error);
      return false;
    }
  }, [tenantSchema, ensureTenantSchema]);

  // CORREÇÃO: Buscar dados do mês anterior ou definir como 0 para contas novas
  const fetchPreviousMonthData = useCallback(async () => {
    try {
      const hasHistorical = await checkForHistoricalData();
      
      if (!hasHistorical) {
        console.log("📊 DashboardContent - Conta nova detectada, definindo dados anteriores como 0");
        setPreviousMonthData({
          leads: 0,
          proposals: 0,
          losses: 0,
          closedDeals: 0
        });
        return;
      }

      console.log("📊 DashboardContent - Conta com histórico, usando dados simulados");
      // Para contas com histórico, usar dados simulados (você pode implementar busca real aqui)
      setPreviousMonthData({
        leads: 3,
        proposals: 2,
        losses: 1,
        closedDeals: 0
      });
    } catch (error) {
      console.error("❌ Erro ao buscar dados do mês anterior:", error);
      setPreviousMonthData({ leads: 0, proposals: 0, losses: 0, closedDeals: 0 });
    }
  }, [checkForHistoricalData]);

  // Função para calcular ticks customizados do eixo Y baseado nos dados
  const getCustomYAxisTicks = useCallback((data: any[]) => {
    if (!data || data.length === 0) return [0, 5, 10, 15, 20];
    
    const maxValue = Math.max(...data.map(item => Math.max(item.opportunities || 0, item.closures || 0)));
    
    if (maxValue === 0) return [0, 5, 10, 15, 20];
    
    // Calcular o próximo múltiplo de 5 maior que o valor máximo
    const maxTick = Math.ceil(maxValue / 5) * 5 + 5;
    
    const ticks = [];
    for (let i = 0; i <= maxTick; i += 5) {
      ticks.push(i);
    }
    
    return ticks;
  }, []);

  // CORREÇÃO: Inicialização única e simplificada
  useEffect(() => {
    if (!isInitialized && allLeads && allContracts && tenantSchema) {
      console.log("🚀 DashboardContent - Inicializando dashboard pela primeira vez");
      
      const now = BrazilTimezone.now();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const currentMonthRange = {
        from: startOfMonth,
        to: endOfMonth
      };
      
      console.log("📅 DashboardContent - Carregando dados do mês atual:", {
        from: BrazilTimezone.formatDateForDisplay(startOfMonth),
        to: BrazilTimezone.formatDateForDisplay(endOfMonth)
      });
      
      setAppliedDateRange(currentMonthRange);
      fetchPreviousMonthData();
      setIsInitialized(true);
    }
  }, [isInitialized, allLeads, allContracts, tenantSchema, fetchPreviousMonthData]);

  // CORREÇÃO: Função para aplicar filtro de data
  const handleDateRangeApply = useCallback((range: DateRange | undefined) => {
    console.log("📅 DashboardContent - Aplicando filtro de período:", range);
    
    if (!range?.from) {
      // Se não há filtro, buscar dados do mês atual
      const now = BrazilTimezone.now();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const currentMonthRange = {
        from: startOfMonth,
        to: endOfMonth
      };

      console.log("📅 DashboardContent - Sem filtro aplicado, carregando mês atual");
      setAppliedDateRange(currentMonthRange);
      return;
    }

    // Aplicar o novo filtro
    const rangeToApply = {
      from: range.from,
      to: range.to || range.from
    };

    console.log("📅 DashboardContent - Aplicando período:", {
      from: BrazilTimezone.formatDateForDisplay(rangeToApply.from),
      to: BrazilTimezone.formatDateForDisplay(rangeToApply.to)
    });

    setAppliedDateRange(rangeToApply);
  }, []);

  // CORREÇÃO: Calcular estatísticas reais baseadas nos leads filtrados usando a mesma lógica das análises
  const totalLeads = leads?.length || 0;
  const proposalsAndMeetings = leads?.filter(lead => isOpportunityLead(lead)).length || 0;
  const lostLeads = leads?.filter(lead => lead.status === "Perdido").length || 0;
  const closedDeals = leads?.filter(lead => lead.status === "Contrato Fechado").length || 0;

  // Log para debug da contagem de oportunidades
  console.log("📊 DashboardContent - Contagem de oportunidades:", {
    totalLeads,
    proposalsAndMeetings,
    lostLeads,
    closedDeals,
    leadsProcessados: leads?.map(l => `${l.name} (${l.status}) - É oportunidade: ${isOpportunityLead(l)}`).join(', ')
  });

  // Calcular valor total dos contratos
  const totalValue = contracts?.reduce((sum, contract) => sum + contract.value, 0) || 0;

  // CORREÇÃO: Função para calcular porcentagem de mudança corrigida para contas novas
  const calculatePercentageChange = (current: number, previous: number): { value: string; type: 'positive' | 'negative' } => {
    // Se não há dados anteriores (conta nova), mostrar 0%
    if (previous === 0) {
      console.log(`📊 DashboardContent - Conta nova: atual=${current}, anterior=${previous} -> 0%`);
      return { value: '0%', type: 'positive' };
    }
    
    const change = ((current - previous) / previous) * 100;
    const isPositive = change >= 0;
    
    console.log(`📊 DashboardContent - Cálculo: atual=${current}, anterior=${previous}, mudança=${change.toFixed(1)}%`);
    
    return {
      value: `${isPositive ? '+' : ''}${Math.round(change)}%`,
      type: isPositive ? 'positive' : 'negative'
    };
  };

  const leadsChange = calculatePercentageChange(totalLeads, previousMonthData.leads);
  const proposalsChange = calculatePercentageChange(proposalsAndMeetings, previousMonthData.proposals);
  const lossesChange = calculatePercentageChange(lostLeads, previousMonthData.losses);
  const closedDealsChange = calculatePercentageChange(closedDeals, previousMonthData.closedDeals);

  const stats = [
    {
      title: "Leads",
      value: totalLeads.toString(),
      icon: Users,
      change: leadsChange.value,
      changeType: leadsChange.type,
    },
    {
      title: "Propostas/Reuniões",
      value: proposalsAndMeetings.toString(),
      icon: UserPlus,
      change: proposalsChange.value,
      changeType: proposalsChange.type,
    },
    {
      title: "Perdas",
      value: lostLeads.toString(),
      icon: UserX,
      change: lossesChange.value,
      changeType: lossesChange.type === 'positive' ? 'negative' : 'positive', // Invertido para perdas
    },
    {
      title: "Vendas",
      value: closedDeals.toString(),
      icon: DollarSign,
      change: closedDealsChange.value,
      changeType: closedDealsChange.type,
    },
  ];

  // CORREÇÃO: Taxa de conversão baseada nos dados reais filtrados
  const conversionData = [
    {
      totalLeads: totalLeads,
      opportunities: proposalsAndMeetings,
      sales: closedDeals,
      opportunityRate: totalLeads > 0 ? `${((proposalsAndMeetings / totalLeads) * 100).toFixed(1)}%` : "0%",
      salesRate: totalLeads > 0 ? `${((closedDeals / totalLeads) * 100).toFixed(1)}%` : "0%",
      overallConversion: proposalsAndMeetings > 0 ? `${Math.min(((closedDeals / proposalsAndMeetings) * 100), 100).toFixed(1)}%` : "0%",
    },
  ];

  // CORREÇÃO: Gerar dados REAIS de conversão baseados nos leads filtrados
  const getRealConversionData = useMemo(() => {
    if (!leads || leads.length === 0) {
      const weeklyData = [
        { day: "Segunda", sales: 0, conversion: 0 },
        { day: "Terça", sales: 0, conversion: 0 },
        { day: "Quarta", sales: 0, conversion: 0 },
        { day: "Quinta", sales: 0, conversion: 0 },
        { day: "Sexta", sales: 0, conversion: 0 },
        { day: "Sábado", sales: 0, conversion: 0 },
        { day: "Domingo", sales: 0, conversion: 0 },
      ];
      
      const monthlyData = [
        { month: "Jan", sales: 0, conversion: 0 },
        { month: "Fev", sales: 0, conversion: 0 },
        { month: "Mar", sales: 0, conversion: 0 },
        { month: "Abr", sales: 0, conversion: 0 },
        { month: "Mai", sales: 0, conversion: 0 },
        { month: "Jun", sales: 0, conversion: 0 },
        { month: "Jul", sales: 0, conversion: 0 },
        { month: "Ago", sales: 0, conversion: 0 },
        { month: "Set", sales: 0, conversion: 0 },
        { month: "Out", sales: 0, conversion: 0 },
        { month: "Nov", sales: 0, conversion: 0 },
        { month: "Dez", sales: 0, conversion: 0 },
      ];
      
      return { weekly: weeklyData, monthly: monthlyData };
    }

    const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const weeklyData = weekDays.map((day, index) => {
      const dayLeads = leads.filter(lead => lead.created_at && getDay(new Date(lead.created_at)) === index);
      const dayOpportunities = dayLeads.filter(lead => isOpportunityLead(lead));
      const daySales = dayLeads.filter(lead => lead.status === "Contrato Fechado");
      const conversion = dayOpportunities.length > 0 ? Math.min((daySales.length / dayOpportunities.length) * 100, 100) : 0;
      
      return {
        day,
        sales: daySales.length,
        conversion: parseFloat(conversion.toFixed(1))
      };
    });

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyData = months.map((month, index) => {
      const monthLeads = leads.filter(lead => lead.created_at && getMonth(new Date(lead.created_at)) === index);
      const monthOpportunities = monthLeads.filter(lead => isOpportunityLead(lead));
      const monthSales = monthLeads.filter(lead => lead.status === "Contrato Fechado");
      const conversion = monthOpportunities.length > 0 ? Math.min((monthSales.length / monthOpportunities.length) * 100, 100) : 0;
      
      return {
        month,
        sales: monthSales.length,
        conversion: parseFloat(conversion.toFixed(1))
      };
    });

    return { weekly: weeklyData, monthly: monthlyData };
  }, [leads, isOpportunityLead]);

  // CORREÇÃO: Gerar dados REAIS de leads por período baseados nos leads filtrados
  const getRealLeadsData = useMemo(() => {
    if (!leads || leads.length === 0) {
      const weeklyData = [
        { day: "Segunda", leads: 0 },
        { day: "Terça", leads: 0 },
        { day: "Quarta", leads: 0 },
        { day: "Quinta", leads: 0 },
        { day: "Sexta", leads: 0 },
        { day: "Sábado", leads: 0 },
        { day: "Domingo", leads: 0 },
      ];
      
      const monthlyData = [
        { month: "Jan", leads: 0 },
        { month: "Fev", leads: 0 },
        { month: "Mar", leads: 0 },
        { month: "Abr", leads: 0 },
        { month: "Mai", leads: 0 },
        { month: "Jun", leads: 0 },
        { month: "Jul", leads: 0 },
        { month: "Ago", leads: 0 },
        { month: "Set", leads: 0 },
        { month: "Out", leads: 0 },
        { month: "Nov", leads: 0 },
        { month: "Dez", leads: 0 },
      ];
      
      return { weekly: weeklyData, monthly: monthlyData };
    }

    const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const weeklyData = weekDays.map((day, index) => ({
      day,
      leads: leads.filter(lead => lead.created_at && getDay(new Date(lead.created_at)) === index).length
    }));

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyData = months.map((month, index) => ({
      month,
      leads: leads.filter(lead => lead.created_at && getMonth(new Date(lead.created_at)) === index).length
    }));

    return { weekly: weeklyData, monthly: monthlyData };
  }, [leads]);

  // Gerar dados REAIS de ação baseados nos leads filtrados
  const getActionData = useCallback(() => {
    if (!leads || leads.length === 0) return [];

    if (actionView === 'type') {
      const actionTypeCounts = leads.reduce((acc, lead) => {
        const isOpportunityOrClosed = ['Proposta', 'Reunião', 'Contrato Fechado'].includes(lead.status);
        if (!isOpportunityOrClosed) return acc;

        const actionType = lead.action_type || 'Outros';
        if (!acc[actionType]) {
          acc[actionType] = { opportunities: 0, closures: 0 };
        }
        
        if (['Proposta', 'Reunião'].includes(lead.status)) {
          acc[actionType].opportunities++;
        }
        if (lead.status === 'Contrato Fechado') {
          acc[actionType].closures++;
          acc[actionType].opportunities++;
        }
        
        return acc;
      }, {} as Record<string, { opportunities: number; closures: number }>);

      return Object.entries(actionTypeCounts)
        .map(([type, data]) => ({
          type,
          opportunities: data.opportunities,
          closures: data.closures
        }))
        .sort((a, b) => b.opportunities - a.opportunities)
        .slice(0, 5);
    } else {
      const actionGroupCounts = leads.reduce((acc, lead) => {
        const isOpportunityOrClosed = ['Proposta', 'Reunião', 'Contrato Fechado'].includes(lead.status);
        if (!isOpportunityOrClosed) return acc;

        const actionGroup = lead.action_group || 'Outros';
        if (!acc[actionGroup]) {
          acc[actionGroup] = { opportunities: 0, closures: 0 };
        }
        
        if (['Proposta', 'Reunião'].includes(lead.status)) {
          acc[actionGroup].opportunities++;
        }
        if (lead.status === 'Contrato Fechado') {
          acc[actionGroup].closures++;
          acc[actionGroup].opportunities++;
        }
        
        return acc;
      }, {} as Record<string, { opportunities: number; closures: number }>);

      return Object.entries(actionGroupCounts)
        .map(([group, data]) => ({
          group,
          opportunities: data.opportunities,
          closures: data.closures
        }))
        .sort((a, b) => b.opportunities - a.opportunities)
        .slice(0, 5);
    }
  }, [leads, actionView]);

  const chartConfig = {
    conversion: {
      label: "Taxa de Conversão (%)",
      color: "hsl(220, 98%, 61%)",
    },
    leads: {
      label: "Leads",
      color: "hsl(142, 76%, 36%)",
    },
    proposals: {
      label: "Propostas",
      color: "hsl(38, 92%, 50%)",
    },
    opportunities: {
      label: "Oportunidades",
      color: "hsl(262, 83%, 58%)",
    },
    closures: {
      label: "Fechamentos",
      color: "hsl(0, 84%, 60%)",
    },
  };

  const getConversionData = () => {
    return conversionView === 'weekly' ? getRealConversionData.weekly : getRealConversionData.monthly;
  };

  const getLeadsData = () => {
    return leadsView === 'weekly' ? getRealLeadsData.weekly : getRealLeadsData.monthly;
  };

  const getConversionDataKey = () => {
    return conversionView === 'weekly' ? 'day' : 'month';
  };

  const getLeadsDataKey = () => {
    return leadsView === 'weekly' ? 'day' : 'month';
  };

  const getActionDataKey = () => {
    return actionView === 'type' ? 'type' : 'group';
  };

  const getBestConversionPeriod = () => {
    const data = getConversionData();
    const best = data.reduce((prev, current) => 
      current.conversion > prev.conversion ? current : prev
    );
    const periodKey = conversionView === 'weekly' ? 'day' : 'month';
    const periodValue = best[periodKey as keyof typeof best];
    const suffix = conversionView === 'weekly' ? '-feira' : '';
    return `${periodValue}${suffix} (${best.conversion}%)`;
  };

  const getBestLeadsPeriod = () => {
    const data = getLeadsData();
    const best = data.reduce((prev, current) => 
      current.leads > prev.leads ? current : prev
    );
    const periodKey = leadsView === 'weekly' ? 'day' : 'month';
    const periodValue = best[periodKey as keyof typeof best];
    const suffix = leadsView === 'weekly' ? '-feira' : '';
    return `${periodValue}${suffix} (${best.leads} leads)`;
  };

  const getBestActionPeriod = () => {
    const data = getActionData();
    if (data.length === 0) return 'N/A';
    
    const best = data.reduce((prev, current) => 
      current.opportunities > prev.opportunities ? current : prev
    );
    const dataKey = actionView === 'type' ? 'type' : 'group';
    const value = best[dataKey as keyof typeof best];
    const conversionRate = best.opportunities > 0 ? ((best.closures / best.opportunities) * 100).toFixed(1) : '0';
    return `${value} (${conversionRate}% taxa)`;
  };

  // CORREÇÃO: Estado de carregamento melhorado
  const isLoading = leadsLoading || contractsLoading;

  if (isLoading || !isInitialized) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados do dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // CORREÇÃO: Melhorar getDisplayTitle para lidar com casos onde to pode ser undefined
  const getDisplayTitle = () => {
    if (appliedDateRange?.from) {
      if (appliedDateRange?.to) {
        return `Dashboard - Período: ${BrazilTimezone.formatDateForDisplay(appliedDateRange.from)} a ${BrazilTimezone.formatDateForDisplay(appliedDateRange.to)}`;
      } else {
        return `Dashboard - Data: ${BrazilTimezone.formatDateForDisplay(appliedDateRange.from)}`;
      }
    }
    return "Dashboard - Dados gerais";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Acompanhe suas métricas e resultados</p>
        </div>
        <DateFilter 
          date={dateRange} 
          setDate={setDateRange}
          onApply={handleDateRangeApply}
        />
      </div>

      {/* Stats Cards */}
      {isComponentVisible('stats-cards') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className={`h-4 w-4 mr-1 ${
                      stat.changeType === 'positive' ? 'text-green-500' : 'text-red-500'
                    }`} />
                    <span className={`text-sm font-medium ${
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs mês anterior</span>
                  </div>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <stat.icon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversion Chart */}
        {isComponentVisible('conversion-chart') && (
          <Card className="p-6 flex flex-col">
            <CardHeader className="p-0 mb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Conversão por {conversionView === 'weekly' ? 'Dia da Semana' : 'Mês'}
                </CardTitle>
                <Select value={conversionView} onValueChange={(value: 'weekly' | 'monthly') => setConversionView(value)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="h-20 flex-1 px-4">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getConversionData()} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                      <XAxis 
                        dataKey={getConversionDataKey()}
                        tick={{ fontSize: 8, fill: '#6b7280' }}
                        angle={-45}
                        textAnchor="end"
                        height={20}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 8, fill: '#6b7280' }}
                        width={30}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value, name) => [`${value}%`, 'Taxa de Conversão']}
                        labelFormatter={(label) => conversionView === 'weekly' ? `${label}-feira` : label}
                      />
                      <Line 
                        type="monotone"
                        dataKey="conversion" 
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 2 }}
                        activeDot={{ r: 3, stroke: '#3b82f6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  Melhor período: <span className="font-medium text-blue-600">{getBestConversionPeriod()}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conversion Rate - Central panel */}
        {isComponentVisible('conversion-rate') && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Taxa de Conversão</h3>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold text-blue-600">{conversionData[0].overallConversion}</p>
                  <p className="text-sm text-gray-600">Taxa Geral de Conversão</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total de Leads</span>
                    <span className="font-medium">{conversionData[0].totalLeads}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Oportunidades Geradas</span>
                    <div className="text-right">
                      <span className="font-medium">{conversionData[0].opportunities}</span>
                      <span className="text-xs text-orange-600 ml-2">({conversionData[0].opportunityRate})</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Vendas Realizadas</span>
                    <div className="text-right">
                      <span className="font-medium">{conversionData[0].sales}</span>
                      <span className="text-xs text-green-600 ml-2">({conversionData[0].salesRate})</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: conversionData[0].overallConversion }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Meta: 75% | Atual: {conversionData[0].overallConversion}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* New Leads Chart */}
        {isComponentVisible('leads-chart') && (
          <Card className="p-6 flex flex-col">
            <CardHeader className="p-0 mb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                  <Users className="h-5 w-5 text-green-600" />
                  Leads Novos por {leadsView === 'weekly' ? 'Dia da Semana' : 'Mês'}
                </CardTitle>
                <Select value={leadsView} onValueChange={(value: 'weekly' | 'monthly') => setLeadsView(value)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="h-20 flex-1 px-4">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getLeadsData()} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                      <XAxis 
                        dataKey={getLeadsDataKey()}
                        tick={{ fontSize: 8, fill: '#6b7280' }}
                        angle={-45}
                        textAnchor="end"
                        height={20}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 8, fill: '#6b7280' }}
                        width={30}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value, name) => [value, 'Leads']}
                        labelFormatter={(label) => leadsView === 'weekly' ? `${label}-feira` : label}
                      />
                      <Line 
                        type="monotone"
                        dataKey="leads" 
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 2 }}
                        activeDot={{ r: 3, stroke: '#10b981', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  Melhor período: <span className="font-medium text-green-600">{getBestLeadsPeriod()}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Row - Team Results and Action Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isComponentVisible('team-results') && (
          <div className="lg:col-span-2">
            <TeamResultsPanel />
          </div>
        )}
        
        {isComponentVisible('action-chart') && (
          <Card className="p-6 flex flex-col">
            <CardHeader className="p-0 mb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Oportunidades por {actionView === 'type' ? 'Tipo de Ação' : 'Grupo de Ação'}
                </CardTitle>
                <Select value={actionView} onValueChange={(value: 'type' | 'group') => setActionView(value)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="type">Tipo de Ação</SelectItem>
                    <SelectItem value="group">Grupo de Ação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="h-20 flex-1 px-4">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getActionData()} margin={{ top: 15, right: 20, left: 20, bottom: 10 }}>
                      <XAxis 
                        dataKey={getActionDataKey()}
                        tick={{ fontSize: 7, fill: '#6b7280' }}
                        angle={-45}
                        textAnchor="end"
                        height={20}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 8, fill: '#6b7280' }}
                        width={30}
                        axisLine={false}
                        tickLine={false}
                        ticks={getCustomYAxisTicks(getActionData())}
                        domain={[0, 'dataMax + 5']}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={15}
                        wrapperStyle={{ fontSize: '8px', paddingBottom: '5px' }}
                        iconType="rect"
                      />
                      <Bar 
                        dataKey="opportunities" 
                        fill="#8b5cf6"
                        name="Oportunidades"
                        barSize={8}
                        radius={[1, 1, 0, 0]}
                      />
                      <Bar 
                        dataKey="closures" 
                        fill="#ef4444"
                        name="Fechamentos"
                        barSize={8}
                        radius={[1, 1, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  Melhor {actionView === 'type' ? 'tipo' : 'grupo'}: <span className="font-medium text-purple-600">{getBestActionPeriod()}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Error States - Only show contractsError since useLeadsData doesn't return error */}
      {contractsError && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="text-red-800">
            <p className="font-medium">Erro ao carregar dados:</p>
            <p className="text-sm mt-1">{contractsError}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
