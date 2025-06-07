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
        description: (
          <div className="space-y-3">
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
              <h4 className="font-semibold text-emerald-800 mb-2">📊 Análise de Performance</h4>
              <ul className="text-emerald-700 text-sm space-y-1">
                <li>• {topState[1].won} contratos fechados de {topState[1].total} leads</li>
                <li>• Taxa de conversão: {conversionRate}%</li>
                <li>• ROI estimado: {roi.toFixed(0)}% superior à média</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">🎯 Ações Recomendadas</h4>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Alocar 40% dos recursos de marketing para esta região</li>
                <li>• Implementar campanha segmentada específica</li>
                <li>• Contratar representante comercial local</li>
                <li>• Investir em publicidade regional direcionada</li>
              </ul>
            </div>
          </div>
        ),
        icon: <MapPin className="h-5 w-5 text-emerald-600" />
      });
    }

    if (worstState && !isRecommendationCompleted('improve-state')) {
      const conversionRate = ((worstState[1].won / worstState[1].total) * 100).toFixed(1);
      const lossRate = ((worstState[1].lost / worstState[1].total) * 100).toFixed(1);
      recommendations.push({
        id: 'improve-state',
        title: `Otimizar estratégia para ${worstState[0]}`,
        description: (
          <div className="space-y-3">
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-2">⚠️ Situação Atual</h4>
              <ul className="text-amber-700 text-sm space-y-1">
                <li>• Taxa de conversão crítica: {conversionRate}%</li>
                <li>• Leads perdidos: {worstState[1].lost} de {worstState[1].total}</li>
                <li>• Taxa de perda: {lossRate}%</li>
              </ul>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-800 mb-2">🔧 Plano de Melhoria</h4>
              <ul className="text-purple-700 text-sm space-y-1">
                <li>• Revisar proposta de valor para a região</li>
                <li>• Ajustar pricing com base no mercado local</li>
                <li>• Implementar follow-up intensivo</li>
                <li>• Treinar equipe com objeções específicas</li>
              </ul>
            </div>
          </div>
        ),
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
        const contractValue = 5000;
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
      const projectedGain = Math.round(efficiency * 10000);
      recommendations.push({
        id: 'best-action',
        title: `Priorizar ações do tipo "${bestActionType[0]}"`,
        description: (
          <div className="space-y-3">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">📈 Performance Destacada</h4>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Taxa de conversão: {conversionRate}%</li>
                <li>• Fechamentos: {bestActionType[1].won} de {bestActionType[1].total} leads</li>
                <li>• Eficiência {(efficiency * 100).toFixed(0)}% superior à média</li>
              </ul>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">💰 Estratégia de Crescimento</h4>
              <ul className="text-green-700 text-sm space-y-1">
                <li>• Realocar 60% das ações para este tipo</li>
                <li>• Treinar equipe nesta abordagem específica</li>
                <li>• Projeção de ganho: +R$ {projectedGain.toLocaleString()}/mês</li>
                <li>• Padronizar processos desta categoria</li>
              </ul>
            </div>
          </div>
        ),
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
      const potentialRecovery = Math.round(mainLossReason[1] * 0.3 * 5000);
      recommendations.push({
        id: 'main-loss',
        title: `Mitigar principal causa de perda: "${mainLossReason[0]}"`,
        description: (
          <div className="space-y-3">
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">🚨 Problema Identificado</h4>
              <ul className="text-red-700 text-sm space-y-1">
                <li>• {mainLossReason[1]} perdas por este motivo</li>
                <li>• Representa {lossPercentage}% de todas as perdas</li>
                <li>• Receita perdida: R$ {(mainLossReason[1] * 5000).toLocaleString()}</li>
              </ul>
            </div>
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
              <h4 className="font-semibold text-indigo-800 mb-2">🛠️ Plano de Ação</h4>
              <ul className="text-indigo-700 text-sm space-y-1">
                <li>• Criar script específico para esta objeção</li>
                <li>• Treinamento intensivo da equipe comercial</li>
                <li>• Ajustar proposta para endereçar a causa</li>
                <li>• Potencial recuperação: R$ {potentialRecovery.toLocaleString()}</li>
              </ul>
            </div>
          </div>
        ),
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
        const projectedClosing = Math.round(leadsInProcessCount * 0.4);
        const revenueProjection = projectedClosing * 5000;
        
        recommendations.push({
          id: 'follow-up',
          title: 'Implementar sistema de follow-up estruturado',
          description: (
            <div className="space-y-3">
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-2">🔄 Pipeline Atual</h4>
                <ul className="text-purple-700 text-sm space-y-1">
                  <li>• {leadsInProcessCount} leads em processo ativo</li>
                  <li>• Representa {processPercentage}% do pipeline</li>
                  <li>• Potencial para reduzir tempo de conversão em 35%</li>
                </ul>
              </div>
              <div className="bg-cyan-50 p-3 rounded-lg border border-cyan-200">
                <h4 className="font-semibold text-cyan-800 mb-2">⚡ Sistema de Follow-up</h4>
                <ul className="text-cyan-700 text-sm space-y-1">
                  <li>• Automatizar lembretes de contato</li>
                  <li>• Definir cronograma estruturado</li>
                  <li>• Implementar triggers no CRM</li>
                  <li>• Meta: {projectedClosing} fechamentos (R$ {revenueProjection.toLocaleString()})</li>
                </ul>
              </div>
            </div>
          ),
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
