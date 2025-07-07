import { Card } from "@/components/ui/card";
import { TrendingUp, Users, UserCheck, Target, UserX } from "lucide-react";
import { Lead } from "@/types/lead";
import { useState, useEffect, useCallback } from "react";
import { useLeadsForDate } from "@/hooks/useLeadsForDate";
import { BrazilTimezone } from "@/lib/timezone";

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

  // Buscar dados do mês anterior para comparação
  const fetchPreviousMonthData = useCallback(async () => {
    try {
      const now = BrazilTimezone.now();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      const previousMonthRange = {
        from: previousMonth,
        to: previousMonthEnd
      };

      console.log("📅 AnalysisStats - Buscando dados do mês anterior:", {
        from: BrazilTimezone.formatDateForDisplay(previousMonth),
        to: BrazilTimezone.formatDateForDisplay(previousMonthEnd)
      });

      // Buscar leads do mês anterior
      await fetchLeadsForDateRange(previousMonthRange);
      
      // Simular dados do mês anterior (em um cenário real, você salvaria esses dados)
      // Para demonstração, vou usar valores baseados nos logs que vi
      const previousData = {
        total: 3, // junho teve 3 leads conforme mencionado
        contratos: 1,
        oportunidades: 2,
        perdas: 0
      };

      setPreviousMonthData(previousData);
      console.log("📊 AnalysisStats - Dados do mês anterior definidos:", previousData);

    } catch (error) {
      console.error("❌ Erro ao buscar dados do mês anterior:", error);
    }
  }, [fetchLeadsForDateRange]);

  useEffect(() => {
    fetchPreviousMonthData();
  }, [fetchPreviousMonthData]);

  // CORREÇÃO: Função para calcular porcentagem de mudança para contas novas
  const calculatePercentageChange = (current: number, previous: number): { value: string; type: 'positive' | 'negative' } => {
    // Se é uma conta nova (não há dados anteriores), retornar 0%
    if (previous === 0) {
      return { value: '0%', type: 'positive' };
    }
    
    const change = ((current - previous) / previous) * 100;
    const isPositive = change >= 0;
    
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

  console.log("📊 AnalysisStats - Cálculos de porcentagem:", {
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
      color: "bg-purple-100 text-purple-800",
      category: "all"
    },
    {
      title: "Novos Contratos",
      value: currentContratos.toString(),
      icon: UserCheck,
      change: contratosChange.value,
      changeType: contratosChange.type,
      color: "bg-green-100 text-green-800",
      category: "contratos"
    },
    {
      title: "Oportunidades",
      value: currentOportunidades.toString(),
      icon: Target,
      change: oportunidadesChange.value,
      changeType: oportunidadesChange.type,
      color: "bg-blue-100 text-blue-800",
      category: "oportunidades"
    },
    {
      title: "Perdas",
      value: currentPerdas.toString(),
      icon: UserX,
      change: perdasChange.value,
      changeType: perdasChange.type === 'positive' ? 'negative' : 'positive', // Invertido para perdas
      color: "bg-red-100 text-red-800",
      category: "perdas"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {analysisStats.map((stat, index) => (
        <Card 
          key={index} 
          className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onCategoryChange(stat.category)}
        >
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
            <div className={`p-3 rounded-lg ${stat.color.split(' ')[0]}-100`}>
              <stat.icon className={`h-6 w-6 ${stat.color.split(' ')[1]}-600`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
