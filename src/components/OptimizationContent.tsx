
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
                <li>• Melhor desempenho entre os estados analisados</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">🎯 Oportunidade Identificada</h4>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Estado apresenta maior potencial de conversão</li>
                <li>• Considere expandir a atuação nesta região</li>
                <li>• Analisar fatores de sucesso específicos desta localidade</li>
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
                <li>• Taxa de conversão: {conversionRate}%</li>
                <li>• Leads perdidos: {worstState[1].lost} de {worstState[1].total}</li>
                <li>• Taxa de perda: {lossRate}%</li>
              </ul>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-800 mb-2">🔧 Análise Recomendada</h4>
              <ul className="text-purple-700 text-sm space-y-1">
                <li>• Revisar abordagem comercial para esta região</li>
                <li>• Analisar particularidades do mercado local</li>
                <li>• Investigar motivos das perdas recorrentes</li>
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
      }
      return acc;
    }, {} as Record<string, { total: number; won: number; avgValue: number; totalValue: number }>);

    const bestActionType = Object.entries(actionStats)
      .filter(([type, stats]) => type !== 'Não especificado' && stats.total >= 3)
      .sort(([,a], [,b]) => (b.won / b.total) - (a.won / a.total))[0];

    const worstActionType = Object.entries(actionStats)
      .filter(([type, stats]) => type !== 'Não especificado' && stats.total >= 3)
      .sort(([,a], [,b]) => (a.won / a.total) - (b.won / b.total))[0];

    if (bestActionType && !isRecommendationCompleted('best-action')) {
      const conversionRate = ((bestActionType[1].won / bestActionType[1].total) * 100).toFixed(1);
      recommendations.push({
        id: 'best-action',
        title: `Tipo de ação mais efetiva: "${bestActionType[0]}"`,
        description: (
          <div className="space-y-3">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">📈 Performance Destacada</h4>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Taxa de conversão: {conversionRate}%</li>
                <li>• Fechamentos: {bestActionType[1].won} de {bestActionType[1].total} leads</li>
                <li>• Melhor performance entre os tipos de ação</li>
              </ul>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">💡 Insights</h4>
              <ul className="text-green-700 text-sm space-y-1">
                <li>• Considere priorizar este tipo de ação</li>
                <li>• Analise os fatores de sucesso desta abordagem</li>
                <li>• Potencial para replicar estratégia em outras áreas</li>
              </ul>
            </div>
          </div>
        ),
        icon: <Target className="h-5 w-5 text-blue-600" />
      });
    }

    if (worstActionType && !isRecommendationCompleted('worst-action')) {
      const conversionRate = ((worstActionType[1].won / worstActionType[1].total) * 100).toFixed(1);
      recommendations.push({
        id: 'worst-action',
        title: `Revisar estratégia: "${worstActionType[0]}"`,
        description: (
          <div className="space-y-3">
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">📉 Performance Baixa</h4>
              <ul className="text-red-700 text-sm space-y-1">
                <li>• Taxa de conversão: {conversionRate}%</li>
                <li>• Fechamentos: {worstActionType[1].won} de {worstActionType[1].total} leads</li>
                <li>• Menor performance entre os tipos de ação</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-800 mb-2">🔍 Análise Necessária</h4>
              <ul className="text-orange-700 text-sm space-y-1">
                <li>• Revisar efetividade desta abordagem</li>
                <li>• Identificar pontos de melhoria no processo</li>
                <li>• Considerar ajustes na estratégia</li>
              </ul>
            </div>
          </div>
        ),
        icon: <AlertTriangle className="h-5 w-5 text-red-600" />
      });
    }

    // Análise de tipos de ação por estado
    const actionByStateStats = leads.reduce((acc, lead) => {
      const state = lead.state || 'Não informado';
      const actionType = lead.action_type || 'Não especificado';
      if (!acc[state]) acc[state] = {};
      if (!acc[state][actionType]) {
        acc[state][actionType] = { total: 0, won: 0 };
      }
      acc[state][actionType].total++;
      if (lead.status === 'Contrato Fechado') acc[state][actionType].won++;
      return acc;
    }, {} as Record<string, Record<string, { total: number; won: number }>>);

    // Encontrar melhor combinação estado + tipo de ação
    let bestStateAction: { state: string; action: string; stats: { total: number; won: number } } | null = null;
    let bestConversion = 0;

    Object.entries(actionByStateStats).forEach(([state, actions]) => {
      if (state === 'Não informado') return;
      Object.entries(actions).forEach(([action, stats]) => {
        if (action === 'Não especificado' || stats.total < 2) return;
        const conversion = stats.won / stats.total;
        if (conversion > bestConversion) {
          bestConversion = conversion;
          bestStateAction = { state, action, stats };
        }
      });
    });

    if (bestStateAction && !isRecommendationCompleted('best-state-action')) {
      const conversionRate = (bestConversion * 100).toFixed(1);
      recommendations.push({
        id: 'best-state-action',
        title: `Combinação de sucesso: "${bestStateAction.action}" em ${bestStateAction.state}`,
        description: (
          <div className="space-y-3">
            <div className="bg-cyan-50 p-3 rounded-lg border border-cyan-200">
              <h4 className="font-semibold text-cyan-800 mb-2">🎯 Combinação Vencedora</h4>
              <ul className="text-cyan-700 text-sm space-y-1">
                <li>• Taxa de conversão: {conversionRate}%</li>
                <li>• Fechamentos: {bestStateAction.stats.won} de {bestStateAction.stats.total} leads</li>
                <li>• Melhor combinação estado + tipo de ação</li>
              </ul>
            </div>
            <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
              <h4 className="font-semibold text-teal-800 mb-2">📊 Estratégia Focada</h4>
              <ul className="text-teal-700 text-sm space-y-1">
                <li>• Replicar esta combinação em outras oportunidades</li>
                <li>• Analisar fatores específicos deste sucesso</li>
                <li>• Potencial para especialização regional</li>
              </ul>
            </div>
          </div>
        ),
        icon: <Target className="h-5 w-5 text-cyan-600" />
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
      recommendations.push({
        id: 'main-loss',
        title: `Principal causa de perda: "${mainLossReason[0]}"`,
        description: (
          <div className="space-y-3">
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">🚨 Problema Identificado</h4>
              <ul className="text-red-700 text-sm space-y-1">
                <li>• {mainLossReason[1]} perdas por este motivo</li>
                <li>• Representa {lossPercentage}% de todas as perdas</li>
                <li>• Principal causa de insucesso identificada</li>
              </ul>
            </div>
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
              <h4 className="font-semibold text-indigo-800 mb-2">🛠️ Área de Melhoria</h4>
              <ul className="text-indigo-700 text-sm space-y-1">
                <li>• Desenvolver estratégias para contornar esta objeção</li>
                <li>• Analisar padrões nos leads perdidos por este motivo</li>
                <li>• Considerar ajustes na abordagem inicial</li>
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

      if (leadsInProcessCount >= 3) {
        recommendations.push({
          id: 'follow-up',
          title: 'Oportunidade no pipeline ativo',
          description: (
            <div className="space-y-3">
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-2">🔄 Pipeline Atual</h4>
                <ul className="text-purple-700 text-sm space-y-1">
                  <li>• {leadsInProcessCount} leads em processo ativo</li>
                  <li>• Oportunidades em estágios avançados</li>
                  <li>• Potencial para conversão a curto prazo</li>
                </ul>
              </div>
              <div className="bg-violet-50 p-3 rounded-lg border border-violet-200">
                <h4 className="font-semibold text-violet-800 mb-2">⚡ Foco Estratégico</h4>
                <ul className="text-violet-700 text-sm space-y-1">
                  <li>• Priorizar acompanhamento destes leads</li>
                  <li>• Manter contato regular e estruturado</li>
                  <li>• Acelerar processo de decisão quando possível</li>
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
