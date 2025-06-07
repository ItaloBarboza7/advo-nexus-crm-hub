
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MapPin, Users, AlertTriangle, Target, Lightbulb } from "lucide-react";
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
      title: "Recomendação concluída",
      description: `"${title}" foi marcada como concluída.`,
    });
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Análise dos dados para gerar recomendações
  const generateRecommendations = () => {
    const recommendations = [];

    // Análise por estados
    const stateStats = leads.reduce((acc, lead) => {
      const state = lead.state || 'Não informado';
      if (!acc[state]) {
        acc[state] = { total: 0, won: 0, lost: 0 };
      }
      acc[state].total++;
      if (lead.status === 'Contrato Fechado') acc[state].won++;
      if (lead.status === 'Perdido') acc[state].lost++;
      return acc;
    }, {} as Record<string, { total: number; won: number; lost: number }>);

    const topState = Object.entries(stateStats)
      .sort(([,a], [,b]) => b.won - a.won)[0];

    const worstState = Object.entries(stateStats)
      .filter(([state]) => state !== 'Não informado')
      .sort(([,a], [,b]) => (a.won / Math.max(a.total, 1)) - (b.won / Math.max(b.total, 1)))[0];

    if (topState && !isRecommendationCompleted('top-state')) {
      recommendations.push({
        id: 'top-state',
        title: `Foque no estado ${topState[0]}`,
        description: `O estado ${topState[0]} tem a melhor performance com ${topState[1].won} contratos fechados. Considere investir mais recursos de marketing e vendas nesta região.`,
        icon: <MapPin className="h-6 w-6 text-green-500" />
      });
    }

    if (worstState && worstState[1].total >= 3 && !isRecommendationCompleted('improve-state')) {
      const conversionRate = ((worstState[1].won / worstState[1].total) * 100).toFixed(1);
      recommendations.push({
        id: 'improve-state',
        title: `Melhore a estratégia para ${worstState[0]}`,
        description: `O estado ${worstState[0]} tem baixa conversão (${conversionRate}%). Analise as necessidades específicas desta região e ajuste sua abordagem de vendas.`,
        icon: <TrendingUp className="h-6 w-6 text-orange-500" />
      });
    }

    // Análise por tipos de ação
    const actionStats = leads.reduce((acc, lead) => {
      const actionType = lead.action_type || 'Não especificado';
      if (!acc[actionType]) {
        acc[actionType] = { total: 0, won: 0 };
      }
      acc[actionType].total++;
      if (lead.status === 'Contrato Fechado') acc[actionType].won++;
      return acc;
    }, {} as Record<string, { total: number; won: number }>);

    const bestActionType = Object.entries(actionStats)
      .filter(([,stats]) => stats.total >= 2)
      .sort(([,a], [,b]) => (b.won / b.total) - (a.won / a.total))[0];

    if (bestActionType && !isRecommendationCompleted('best-action')) {
      const conversionRate = ((bestActionType[1].won / bestActionType[1].total) * 100).toFixed(1);
      recommendations.push({
        id: 'best-action',
        title: `Priorize ${bestActionType[0]}`,
        description: `O tipo de ação "${bestActionType[0]}" tem uma taxa de conversão de ${conversionRate}%. Considere focar mais esforços neste tipo de abordagem.`,
        icon: <Target className="h-6 w-6 text-blue-500" />
      });
    }

    // Análise de motivos de perda
    const lossReasons = leads
      .filter(lead => lead.status === 'Perdido' && lead.loss_reason)
      .reduce((acc, lead) => {
        const reason = lead.loss_reason!;
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const mainLossReason = Object.entries(lossReasons)
      .sort(([,a], [,b]) => b - a)[0];

    if (mainLossReason && mainLossReason[1] >= 2 && !isRecommendationCompleted('main-loss')) {
      recommendations.push({
        id: 'main-loss',
        title: `Trate o principal motivo de perda`,
        description: `"${mainLossReason[0]}" é o principal motivo de perda (${mainLossReason[1]} ocorrências). Desenvolva estratégias específicas para superar esta objeção, como ofertas flexíveis de pagamento ou demonstrações de valor mais convincentes.`,
        icon: <AlertTriangle className="h-6 w-6 text-red-500" />
      });
    }

    // Recomendação geral sobre follow-up
    if (!isRecommendationCompleted('follow-up')) {
      const leadsInProcess = leads.filter(lead => 
        lead.status === 'Proposta' || lead.status === 'Reunião'
      ).length;

      if (leadsInProcess >= 3) {
        recommendations.push({
          id: 'follow-up',
          title: 'Intensifique o follow-up',
          description: `Você tem ${leadsInProcess} leads em processo. Estabeleça um cronograma de follow-up sistemático para manter o engajamento e acelerar as decisões.`,
          icon: <Users className="h-6 w-6 text-purple-500" />
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
          <p className="text-gray-600">Carregando recomendações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Otimização</h1>
          <p className="text-gray-600">Recomendações personalizadas para melhorar seus resultados</p>
        </div>
      </div>

      {recommendations.length > 0 ? (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="h-6 w-6 text-yellow-500" />
              <h2 className="text-xl font-semibold text-gray-900">Recomendações Inteligentes</h2>
              <Badge variant="outline" className="text-blue-700 border-blue-300">
                {recommendations.length} recomendações
              </Badge>
            </div>
            <p className="text-gray-600 mb-6">
              Baseado na análise dos seus dados, aqui estão as principais oportunidades de melhoria:
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

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="h-6 w-6 text-green-500" />
              <h2 className="text-xl font-semibold text-gray-900">Resumo dos Dados</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {leads.filter(l => l.status === 'Contrato Fechado').length}
                </div>
                <div className="text-sm text-blue-800">Contratos Fechados</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {leads.filter(l => l.status === 'Proposta' || l.status === 'Reunião').length}
                </div>
                <div className="text-sm text-orange-800">Em Processo</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">
                  {leads.filter(l => l.status === 'Perdido').length}
                </div>
                <div className="text-sm text-red-800">Perdas</div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma recomendação disponível</h3>
          <p className="text-gray-600">
            Continue coletando dados para receber recomendações personalizadas de otimização.
          </p>
        </Card>
      )}
    </div>
  );
}
