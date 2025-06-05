
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, TrendingDown, Target, DollarSign, MapPin, Activity, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";

interface OptimizationSuggestion {
  id: string;
  type: 'state_action' | 'loss_reason' | 'conversion_rate';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metric: string;
  recommendation: string;
  impact: string;
}

export function OptimizationContent() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const fetchLeads = async () => {
    try {
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
      generateSuggestions(transformedLeads);
    } catch (error) {
      console.error('Erro inesperado ao buscar leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSuggestions = (leadsData: Lead[]) => {
    const newSuggestions: OptimizationSuggestion[] = [];

    // Análise por Estado e Tipo de Ação
    const stateActionAnalysis = analyzeStateActionPerformance(leadsData);
    newSuggestions.push(...stateActionAnalysis);

    // Análise de Motivos de Perda
    const lossReasonAnalysis = analyzeLossReasons(leadsData);
    newSuggestions.push(...lossReasonAnalysis);

    // Análise de Taxa de Conversão
    const conversionAnalysis = analyzeConversionRates(leadsData);
    newSuggestions.push(...conversionAnalysis);

    setSuggestions(newSuggestions);
  };

  const analyzeStateActionPerformance = (leadsData: Lead[]): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    const stateActionData: Record<string, Record<string, { total: number; closed: number }>> = {};

    // Agrupar dados por estado e tipo de ação
    leadsData.forEach(lead => {
      const state = lead.state || 'Não informado';
      const actionType = lead.action_type || 'Não informado';

      if (!stateActionData[state]) {
        stateActionData[state] = {};
      }
      if (!stateActionData[state][actionType]) {
        stateActionData[state][actionType] = { total: 0, closed: 0 };
      }

      stateActionData[state][actionType].total++;
      if (lead.status === 'Contrato Fechado') {
        stateActionData[state][actionType].closed++;
      }
    });

    // Analisar cada estado
    Object.entries(stateActionData).forEach(([state, actions]) => {
      const actionPerformance = Object.entries(actions).map(([actionType, data]) => ({
        actionType,
        conversionRate: data.total > 0 ? (data.closed / data.total) * 100 : 0,
        total: data.total
      })).filter(action => action.total >= 3); // Só considerar ações com pelo menos 3 leads

      if (actionPerformance.length > 1) {
        const bestAction = actionPerformance.reduce((best, current) => 
          current.conversionRate > best.conversionRate ? current : best
        );
        const worstAction = actionPerformance.reduce((worst, current) => 
          current.conversionRate < worst.conversionRate ? current : worst
        );

        if (bestAction.conversionRate > worstAction.conversionRate + 20) {
          suggestions.push({
            id: `state-action-${state}`,
            type: 'state_action',
            priority: worstAction.conversionRate < 20 ? 'high' : 'medium',
            title: `Otimizar ações no estado: ${state}`,
            description: `O tipo de ação "${worstAction.actionType}" tem baixa conversão (${worstAction.conversionRate.toFixed(1)}%)`,
            metric: `${worstAction.conversionRate.toFixed(1)}% vs ${bestAction.conversionRate.toFixed(1)}%`,
            recommendation: `Reduzir foco em "${worstAction.actionType}" e aumentar em "${bestAction.actionType}"`,
            impact: `Potencial aumento de ${(bestAction.conversionRate - worstAction.conversionRate).toFixed(1)}% na conversão`
          });
        }
      }
    });

    return suggestions;
  };

  const analyzeLossReasons = (leadsData: Lead[]): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    const lostLeads = leadsData.filter(lead => lead.status === 'Perdido');
    
    if (lostLeads.length === 0) return suggestions;

    const lossReasonCount: Record<string, { count: number; states: Set<string> }> = {};

    lostLeads.forEach(lead => {
      const reason = lead.loss_reason || 'Não informado';
      const state = lead.state || 'Não informado';

      if (!lossReasonCount[reason]) {
        lossReasonCount[reason] = { count: 0, states: new Set() };
      }
      lossReasonCount[reason].count++;
      lossReasonCount[reason].states.add(state);
    });

    // Identificar motivos de perda críticos
    Object.entries(lossReasonCount).forEach(([reason, data]) => {
      const percentage = (data.count / lostLeads.length) * 100;
      
      if (percentage > 25 && reason.toLowerCase().includes('dinheiro')) {
        suggestions.push({
          id: `loss-reason-${reason}`,
          type: 'loss_reason',
          priority: 'high',
          title: `Alto índice de perda por falta de recursos financeiros`,
          description: `${percentage.toFixed(1)}% das perdas são por "${reason}"`,
          metric: `${data.count} leads perdidos (${percentage.toFixed(1)}%)`,
          recommendation: `Focar em leads com maior capacidade financeira e melhorar qualificação inicial`,
          impact: `Potencial redução de 15-20% nas perdas por esse motivo`
        });
      } else if (percentage > 20) {
        suggestions.push({
          id: `loss-reason-${reason}`,
          type: 'loss_reason',
          priority: percentage > 30 ? 'high' : 'medium',
          title: `Motivo de perda recorrente: ${reason}`,
          description: `${percentage.toFixed(1)}% das perdas são por "${reason}"`,
          metric: `${data.count} leads perdidos`,
          recommendation: `Desenvolver estratégia específica para lidar com "${reason}"`,
          impact: `Potencial recuperação de 10-15% desses leads`
        });
      }
    });

    return suggestions;
  };

  const analyzeConversionRates = (leadsData: Lead[]): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Análise por fonte
    const sourceData: Record<string, { total: number; closed: number }> = {};
    
    leadsData.forEach(lead => {
      const source = lead.source || 'Não informado';
      if (!sourceData[source]) {
        sourceData[source] = { total: 0, closed: 0 };
      }
      sourceData[source].total++;
      if (lead.status === 'Contrato Fechado') {
        sourceData[source].closed++;
      }
    });

    const sourcePerformance = Object.entries(sourceData)
      .map(([source, data]) => ({
        source,
        conversionRate: data.total > 0 ? (data.closed / data.total) * 100 : 0,
        total: data.total
      }))
      .filter(source => source.total >= 5)
      .sort((a, b) => b.conversionRate - a.conversionRate);

    if (sourcePerformance.length > 1) {
      const bestSource = sourcePerformance[0];
      const worstSources = sourcePerformance.filter(s => s.conversionRate < bestSource.conversionRate - 15);

      worstSources.forEach(source => {
        suggestions.push({
          id: `conversion-${source.source}`,
          type: 'conversion_rate',
          priority: source.conversionRate < 10 ? 'high' : 'medium',
          title: `Baixa conversão na fonte: ${source.source}`,
          description: `Taxa de conversão de apenas ${source.conversionRate.toFixed(1)}%`,
          metric: `${source.conversionRate.toFixed(1)}% vs ${bestSource.conversionRate.toFixed(1)}% (melhor fonte)`,
          recommendation: `Revisar qualidade dos leads de "${source.source}" ou reduzir investimento`,
          impact: `Realocação de recursos pode aumentar ROI em 25-30%`
        });
      });
    }

    return suggestions;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <TrendingDown className="h-4 w-4" />;
      case 'low': return <TrendingUp className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'state_action': return <MapPin className="h-5 w-5 text-blue-500" />;
      case 'loss_reason': return <DollarSign className="h-5 w-5 text-red-500" />;
      case 'conversion_rate': return <Activity className="h-5 w-5 text-green-500" />;
      default: return <Lightbulb className="h-5 w-5 text-yellow-500" />;
    }
  };

  const filteredSuggestions = selectedPriority === 'all' 
    ? suggestions 
    : suggestions.filter(s => s.priority === selectedPriority);

  useEffect(() => {
    fetchLeads();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando análises de otimização...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Otimização</h1>
          <p className="text-gray-600">Sugestões de melhorias baseadas na análise de dados</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedPriority === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedPriority('all')}
          >
            Todas
          </Button>
          <Button
            variant={selectedPriority === 'high' ? 'default' : 'outline'}
            onClick={() => setSelectedPriority('high')}
          >
            Alta
          </Button>
          <Button
            variant={selectedPriority === 'medium' ? 'default' : 'outline'}
            onClick={() => setSelectedPriority('medium')}
          >
            Média
          </Button>
          <Button
            variant={selectedPriority === 'low' ? 'default' : 'outline'}
            onClick={() => setSelectedPriority('low')}
          >
            Baixa
          </Button>
        </div>
      </div>

      {/* Resumo das Sugestões */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {suggestions.filter(s => s.priority === 'high').length}
          </div>
          <div className="text-sm text-gray-600">Prioridade Alta</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {suggestions.filter(s => s.priority === 'medium').length}
          </div>
          <div className="text-sm text-gray-600">Prioridade Média</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {suggestions.filter(s => s.priority === 'low').length}
          </div>
          <div className="text-sm text-gray-600">Prioridade Baixa</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{suggestions.length}</div>
          <div className="text-sm text-gray-600">Total de Sugestões</div>
        </Card>
      </div>

      {/* Lista de Sugestões */}
      <div className="space-y-4">
        {filteredSuggestions.length === 0 ? (
          <Card className="p-8 text-center">
            <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedPriority === 'all' ? 'Nenhuma sugestão disponível' : `Nenhuma sugestão de prioridade ${selectedPriority}`}
            </h3>
            <p className="text-gray-500">
              {suggestions.length === 0 
                ? 'Não há dados suficientes para gerar sugestões de otimização.'
                : 'Tente selecionar uma prioridade diferente.'}
            </p>
          </Card>
        ) : (
          filteredSuggestions.map((suggestion) => (
            <Card key={suggestion.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {getTypeIcon(suggestion.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{suggestion.title}</h3>
                    <Badge className={`${getPriorityColor(suggestion.priority)} flex items-center gap-1`}>
                      {getPriorityIcon(suggestion.priority)}
                      {suggestion.priority === 'high' ? 'Alta' : suggestion.priority === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{suggestion.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Métrica:</span>
                      <p className="text-sm text-gray-600">{suggestion.metric}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Recomendação:</span>
                      <p className="text-sm text-gray-600">{suggestion.recommendation}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Impacto Esperado:</span>
                      <p className="text-sm text-gray-600">{suggestion.impact}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
