import { Card } from "@/components/ui/card";
import { TrendingUp, Users, UserCheck, Target, UserX } from "lucide-react";
import { Lead } from "@/types/lead";
import { useState, useEffect, useCallback } from "react";
import { useLeadsForDate } from "@/hooks/useLeadsForDate";
import { BrazilTimezone } from "@/lib/timezone";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSchema } from "@/hooks/useTenantSchema";
import { ConversionRateChart } from "@/components/ConversionRateChart";

interface AnalysisStatsProps {
  leads: Lead[];
  onCategoryChange: (category: string) => void;
  statusHistory: any[];
  hasLeadPassedThroughStatus: (leadId: string, statuses: string[]) => boolean;
}

export function AnalysisStats({ leads, onCategoryChange, statusHistory, hasLeadPassedThroughStatus }: AnalysisStatsProps) {
  const [previousMonthData, setPreviousMonthData] = useState<{
    total: number;
    contratos: number;
    oportunidades: number;
    perdas: number;
  }>({ total: 0, contratos: 0, oportunidades: 0, perdas: 0 });

  const { fetchLeadsForDateRange } = useLeadsForDate();
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();
  
  // Função corrigida para verificar se um lead é uma oportunidade (NOVA REGRA)
  const isOpportunityLead = (lead: Lead): boolean => {
    console.log(`🔍 [AnalysisStats] Verificando se ${lead.name} (${lead.status}) é oportunidade`);
    
    // NOVA REGRA: Oportunidades são leads que:
    // 1. NÃO estão em "Novo" (independente do histórico)
    // 2. Estão atualmente em "Proposta" ou "Reunião" OU passaram por eles (histórico)
    
    // PRIMEIRO: Excluir completamente leads com status "Novo"
    if (lead.status === "Novo") {
      console.log(`❌ [AnalysisStats] Lead ${lead.name} está em Novo - SEMPRE EXCLUÍDO`);
      return false;
    }
    
    // SEGUNDO: Se está em Proposta ou Reunião atualmente, incluir automaticamente
    if (lead.status === "Proposta" || lead.status === "Reunião") {
      console.log(`✅ [AnalysisStats] Lead ${lead.name} está atualmente em ${lead.status} - INCLUÍDO`);
      return true;
    }
    
    // TERCEIRO: Verificar se passou por Proposta/Reunião no histórico (incluindo finalizados)
    const hasPassedThroughTargetStatuses = hasLeadPassedThroughStatus(lead.id, ["Proposta", "Reunião"]);
    console.log(`📊 [AnalysisStats] Lead ${lead.name} (${lead.status}) passou por Proposta/Reunião: ${hasPassedThroughTargetStatuses}`);
    
    if (hasPassedThroughTargetStatuses) {
      console.log(`✅ [AnalysisStats] Lead ${lead.name} passou por Proposta/Reunião - INCLUÍDO mesmo estando em ${lead.status}`);
      return true;
    }
    
    console.log(`❌ [AnalysisStats] Lead ${lead.name} não passou por Proposta/Reunião - EXCLUÍDO`);
    return false;
  };

  // CORREÇÃO: Função para verificar se existe dados históricos reais
  const checkForHistoricalData = useCallback(async () => {
    try {
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.log("❌ AnalysisStats - Não foi possível obter esquema do tenant");
        return false;
      }

      const now = BrazilTimezone.now();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      console.log("🔍 AnalysisStats - Verificando dados históricos do mês anterior:", {
        from: BrazilTimezone.formatDateForDisplay(previousMonth),
        to: BrazilTimezone.formatDateForDisplay(previousMonthEnd)
      });

      // Buscar leads do mês anterior no esquema do tenant
      const { data: historicalLeads, error } = await supabase.rpc('exec_sql' as any, {
        sql: `
          SELECT COUNT(*) as total FROM ${schema}.leads
          WHERE DATE(created_at AT TIME ZONE 'America/Sao_Paulo') 
          BETWEEN '${previousMonth.toISOString().split('T')[0]}' 
          AND '${previousMonthEnd.toISOString().split('T')[0]}'
        `
      });

      if (error) {
        console.error("❌ Erro ao buscar dados históricos:", error);
        return false;
      }

      const hasHistoricalData = Array.isArray(historicalLeads) && historicalLeads.length > 0 && historicalLeads[0].total > 0;
      console.log("📊 AnalysisStats - Dados históricos encontrados:", hasHistoricalData ? "SIM" : "NÃO");

      return hasHistoricalData;
    } catch (error) {
      console.error("❌ Erro ao verificar dados históricos:", error);
      return false;
    }
  }, [tenantSchema, ensureTenantSchema]);

  // CORREÇÃO: Buscar dados reais do mês anterior
  const fetchPreviousMonthData = useCallback(async () => {
    try {
      const hasHistorical = await checkForHistoricalData();
      
      if (!hasHistorical) {
        console.log("📊 AnalysisStats - Conta nova detectada, definindo dados anteriores como 0");
        setPreviousMonthData({
          total: 0,
          contratos: 0,
          oportunidades: 0,
          perdas: 0
        });
        return;
      }

      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) return;

      const now = BrazilTimezone.now();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      console.log("📅 AnalysisStats - Buscando dados reais do mês anterior");

      // Buscar leads do mês anterior
      const { data: previousLeads, error } = await supabase.rpc('exec_sql' as any, {
        sql: `
          SELECT * FROM ${schema}.leads
          WHERE DATE(created_at AT TIME ZONE 'America/Sao_Paulo') 
          BETWEEN '${previousMonth.toISOString().split('T')[0]}' 
          AND '${previousMonthEnd.toISOString().split('T')[0]}'
        `
      });

      if (error) {
        console.error("❌ Erro ao buscar leads do mês anterior:", error);
        setPreviousMonthData({ total: 0, contratos: 0, oportunidades: 0, perdas: 0 });
        return;
      }

      const previousLeadsData = Array.isArray(previousLeads) ? previousLeads : [];
      
      // Calcular estatísticas do mês anterior
      const total = previousLeadsData.length;
      const contratos = previousLeadsData.filter(lead => lead.status === "Contrato Fechado").length;
      const oportunidades = previousLeadsData.filter(lead => isOpportunityLead(lead)).length;
      const perdas = previousLeadsData.filter(lead => lead.status === "Perdido").length;

      const previousData = { total, contratos, oportunidades, perdas };
      setPreviousMonthData(previousData);
      
      console.log("📊 AnalysisStats - Dados reais do mês anterior:", previousData);

    } catch (error) {
      console.error("❌ Erro ao buscar dados do mês anterior:", error);
      setPreviousMonthData({ total: 0, contratos: 0, oportunidades: 0, perdas: 0 });
    }
  }, [checkForHistoricalData, tenantSchema, ensureTenantSchema, isOpportunityLead]);

  useEffect(() => {
    if (tenantSchema) {
      fetchPreviousMonthData();
    }
  }, [fetchPreviousMonthData, tenantSchema]);

  // CORREÇÃO: Função para calcular porcentagem de mudança corrigida para contas novas
  const calculatePercentageChange = (current: number, previous: number): { value: string; type: 'positive' | 'negative' } => {
    // Se não há dados anteriores (conta nova), mostrar 0%
    if (previous === 0) {
      console.log(`📊 Conta nova detectada: atual=${current}, anterior=${previous} -> 0%`);
      return { value: '0%', type: 'positive' };
    }
    
    const change = ((current - previous) / previous) * 100;
    const isPositive = change >= 0;
    
    console.log(`📊 Cálculo de porcentagem: atual=${current}, anterior=${previous}, mudança=${change.toFixed(1)}%`);
    
    return {
      value: `${isPositive ? '+' : ''}${Math.round(change)}%`,
      type: isPositive ? 'positive' : 'negative'
    };
  };

  // Calcular valores atuais
  const currentTotal = leads.length;
  const currentContratos = leads.filter(lead => lead.status === "Contrato Fechado").length;
  const currentOportunidades = leads.filter(lead => isOpportunityLead(lead)).length;
  const currentPerdas = leads.filter(lead => lead.status === "Perdido").length;

  // Calcular mudanças
  const totalChange = calculatePercentageChange(currentTotal, previousMonthData.total);
  const contratosChange = calculatePercentageChange(currentContratos, previousMonthData.contratos);
  const oportunidadesChange = calculatePercentageChange(currentOportunidades, previousMonthData.oportunidades);
  const perdasChange = calculatePercentageChange(currentPerdas, previousMonthData.perdas);

  console.log("📊 AnalysisStats - Cálculos finais de porcentagem:", {
    current: { currentTotal, currentContratos, currentOportunidades, currentPerdas },
    previous: previousMonthData,
    changes: { totalChange, contratosChange, oportunidadesChange, perdasChange }
  });

  const analysisStats = [
    {
      title: "Todos",
      value: currentTotal.toString(),
      icon: Users,
      change: totalChange.value,
      changeType: totalChange.type,
      color: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
      category: "all"
    },
    {
      title: "Novos Contratos",
      value: currentContratos.toString(),
      icon: UserCheck,
      change: contratosChange.value,
      changeType: contratosChange.type,
      color: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
      category: "contratos"
    },
    {
      title: "Oportunidades",
      value: currentOportunidades.toString(),
      icon: Target,
      change: oportunidadesChange.value,
      changeType: oportunidadesChange.type,
      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
      category: "oportunidades"
    },
    {
      title: "Perdas",
      value: currentPerdas.toString(),
      icon: UserX,
      change: perdasChange.value,
      changeType: perdasChange.type === 'positive' ? 'negative' : 'positive', // Invertido para perdas
      color: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
      category: "perdas"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {analysisStats.map((stat, index) => (
          <Card 
            key={index} 
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer bg-card border-border"
            onClick={() => onCategoryChange(stat.category)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold text-card-foreground mt-2">{stat.value}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className={`h-4 w-4 mr-1 ${
                    stat.changeType === 'positive' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">vs mês anterior</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Gráfico de Taxa de Conversão */}
      <ConversionRateChart
        totalLeads={currentTotal}
        opportunities={currentOportunidades}
        sales={currentContratos}
        conversionGoal={75}
      />
    </div>
  );
}
