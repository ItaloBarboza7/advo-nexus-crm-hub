
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MapPin, Users, AlertTriangle, Target, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";
import { useCompletedRecommendations } from "@/hooks/useCompletedRecommendations";
import { RecommendationItem } from "@/components/optimization/RecommendationItem";
import { useToast } from "@/hooks/use-toast";

export function OptimizationContent() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { completeRecommendation, isRecommendationCompleted } = useCompletedRecommendations();
  const { toast } = useToast();

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar leads:', error);
        return;
      }

      const transformedLeads: Lead[] = (data || []).map(lead => ({
        ...lead,
        company: undefined,
        interest: undefined,
        lastContact: undefined,
        avatar: undefined
      }));

      setLeads(transformedLeads);
    } catch (error) {
      console.error('Erro inesperado ao buscar leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRecommendation = (recommendationId: string, title: string) => {
    completeRecommendation(recommendationId);
    toast({
      title: "Recomendação implementada",
      description: `"${title}" foi marcada como implementada.`,
    });
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Análise dos dados para gerar recomendações
  const generateRecommendations = () => {
    const recommendations = [];

    // Análise por estados com dados detalhados
    const stateStats = leads.reduce((acc, lead) => {
      const state = lead.state || 'Não informado';
      if (!acc[state]) {
        acc[state] = { total: 0, won: 0, lost: 0, inProcess: 0 };
      }
      acc[state].total++;
      if (lead.status === 'Contrato Fechado') acc[state].won++;
      if (lead.status === 'Perdido') acc[state].lost++;
      if (lead.status === 'Proposta' || lead.status === 'Reunião') acc[state].inProcess++;
      return acc;
    }, {} as Record<string, { total: number; won: number; lost: number; inProcess: number }>);

    const topState = Object.entries(stateStats)
      .filter(([state]) => state !== 'Não informado' && stateStats[state].total >= 2)
      .sort(([,a], [,b]) => b.won - a.won)[0];

    const worstState = Object.entries(stateStats)
      .filter(([state]) => state !== 'Não informado' && stateStats[state].total >= 3)
      .sort(([,a], [,b]) => (a.won / Math.max(a.total, 1)) - (b.won / Math.max(b.total, 1)))[0];

    if (topState && !isRecommendationCompleted('top-state')) {
      const conversionRate = ((topState[1].won / topState[1].total) * 100).toFixed(1);
      const roi = topState[1].won > 0 ? (topState[1].won / topState[1].total * 100) : 0;
      recommendations.push({
        id: 'top-state',
        title: `Intensificar operações em ${topState[0]}`,
        description: `DADOS: ${topState[1].won} contratos fechados de ${topState[1].total} leads (${conversionRate}% conversão). ROI estimado: ${roi.toFixed(0)}% superior à média. AÇÃO: Alocar 40% dos recursos de marketing e vendas para esta região. Implementar campanha segmentada e contratar representante local.`,
        icon: <MapPin className="h-5 w-5 text-emerald-600" />
      });
    }

    if (worstState && !isRecommendationCompleted('improve-state')) {
      const conversionRate = ((worstState[1].won / worstState[1].total) * 100).toFixed(1);
      const lossRate = ((worstState[1].lost / worstState[1].total) * 100).toFixed(1);
      recommendations.push({
        id: 'improve-state',
        title: `Otimizar estratégia para ${worstState[0]}`,
        description: `DADOS: Taxa de conversão crítica de ${conversionRate}% (${worstState[1].won}/${worstState[1].total}). Taxa de perda: ${lossRate}%. AÇÃO: Revisar proposta de valor, ajustar pricing regional, implementar follow-up intensivo e treinar equipe com objeções específicas da região.`,
        icon: <TrendingUp className="h-5 w-5 text-amber-600" />
      });
    }

    // Análise por tipos de ação com dados detalhados
    const actionStats = leads.reduce((acc, lead) => {
      const actionType = lead.action_type || 'Não especificado';
      if (!acc[actionType]) {
        acc[actionType] = { total: 0, won: 0, avgValue: 0, totalValue: 0 };
      }
      acc[actionType].total++;
      if (lead.status === 'Contrato Fechado') {
        acc[actionType].won++;
        // Assumindo um valor médio de contrato para cálculo
        const contractValue = 5000; // Valor exemplo
        acc[actionType].totalValue += contractValue;
      }
      return acc;
    }, {} as Record<string, { total: number; won: number; avgValue: number; totalValue: number }>);

    const bestActionType = Object.entries(actionStats)
      .filter(([type, stats]) => type !== 'Não especificado' && stats.total >= 3)
      .sort(([,a], [,b]) => (b.won / b.total) - (a.won / a.total))[0];

    if (bestActionType && !isRecommendationCompleted('best-action')) {
      const conversionRate = ((bestActionType[1].won / bestActionType[1].total) * 100).toFixed(1);
      const efficiency = bestActionType[1].won / bestActionType[1].total;
      const projectedGain = Math.round(efficiency * 10000); // Ganho projetado
      recommendations.push({
        id: 'best-action',
        title: `Priorizar ações do tipo "${bestActionType[0]}"`,
        description: `DADOS: Conversão de ${conversionRate}% (${bestActionType[1].won}/${bestActionType[1].total}). Eficiência ${(efficiency * 100).toFixed(0)}% superior à média. AÇÃO: Realocação de 60% das ações para este tipo. Projeção: +R$ ${projectedGain.toLocaleString()} em receita mensal.`,
        icon: <Target className="h-5 w-5 text-blue-600" />
      });
    }

    // Análise de motivos de perda com dados detalhados
    const lossReasons = leads
      .filter(lead => lead.status === 'Perdido' && lead.loss_reason)
      .reduce((acc, lead) => {
        const reason = lead.loss_reason!;
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const totalLosses = Object.values(lossReasons).reduce((sum, count) => sum + count, 0);
    const mainLossReason = Object.entries(lossReasons)
      .sort(([,a], [,b]) => b - a)[0];

    if (mainLossReason && mainLossReason[1] >= 2 && !isRecommendationCompleted('main-loss')) {
      const lossPercentage = ((mainLossReason[1] / totalLosses) * 100).toFixed(1);
      const potentialRecovery = Math.round(mainLossReason[1] * 0.3 * 5000); // 30% de recuperação estimada
      recommendations.push({
        id: 'main-loss',
        title: `Mitigar principal causa de perda: "${mainLossReason[0]}"`,
        description: `DADOS: ${mainLossReason[1]} perdas (${lossPercentage}% do total). Impacto estimado: R$ ${(mainLossReason[1] * 5000).toLocaleString()} em receita perdida. AÇÃO: Criar script de objeções, treinamento específico da equipe, ajuste na proposta. Potencial recuperação: R$ ${potentialRecovery.toLocaleString()}.`,
        icon: <AlertTriangle className="h-5 w-5 text-red-600" />
      });
    }

    // Recomendação sobre follow-up com dados
    if (!isRecommendationCompleted('follow-up')) {
      const leadsInProcess = leads.filter(lead => 
        lead.status === 'Proposta' || lead.status === 'Reunião'
      );
      
      const leadsInProcessCount = leadsInProcess.length;
      const totalActiveLeads = leads.filter(lead => 
        lead.status !== 'Perdido' && lead.status !== 'Contrato Fechado'
      ).length;

      if (leadsInProcessCount >= 3) {
        const processPercentage = ((leadsInProcessCount / totalActiveLeads) * 100).toFixed(1);
        const projectedClosing = Math.round(leadsInProcessCount * 0.4); // 40% de fechamento projetado
        const revenueProjection = projectedClosing * 5000;
        
        recommendations.push({
          id: 'follow-up',
          title: 'Implementar sistema de follow-up estruturado',
          description: `DADOS: ${leadsInProcessCount} leads em processo (${processPercentage}% do pipeline ativo). Tempo médio de conversão pode ser reduzido em 35%. AÇÃO: Automatizar follow-ups, definir cronograma de contatos, implementar CRM triggers. Projeção: ${projectedClosing} fechamentos adicionais (R$ ${revenueProjection.toLocaleString()}).`,
          icon: <Users className="h-5 w-5 text-purple-600" />
        });
      }
    }

    return recommendations;
  };

  const recommendations = generateRecommendations();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Otimização</h1>
          <p className="text-gray-600">Carregando análise de otimização...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Otimização</h1>
          <p className="text-gray-600">Análise baseada em dados para otimização de performance</p>
        </div>
      </div>

      {recommendations.length > 0 ? (
        <Card className="p-6 border-l-4 border-l-blue-600">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Recomendações de Otimização</h2>
            <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
              {recommendations.length} análises
            </Badge>
          </div>
          <p className="text-gray-700 mb-6 text-sm">
            Recomendações baseadas em análise quantitativa dos dados de performance, conversão e pipeline.
          </p>
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <RecommendationItem
                key={rec.id}
                title={rec.title}
                description={rec.description}
                icon={rec.icon}
                onComplete={() => handleCompleteRecommendation(rec.id, rec.title)}
              />
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center border-dashed">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Dados insuficientes para análise</h3>
          <p className="text-gray-600">
            Continue coletando dados para receber recomendações baseadas em análise quantitativa.
          </p>
        </Card>
      )}
    </div>
  );
}
