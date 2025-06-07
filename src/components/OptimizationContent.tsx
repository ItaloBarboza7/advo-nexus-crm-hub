import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, TrendingDown, Target, DollarSign, MapPin, Activity, Lightbulb, BarChart3, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";

interface OptimizationSuggestion {
  id: string;
  type: 'performance' | 'conversion' | 'source' | 'action_type' | 'state_action' | 'loss_reason' | 'conversion_rate' | 'state_performance';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metric: string;
  recommendation: string;
  impact: string;
  dataSupport: {
    mainStat: string;
    comparisonStat?: string;
    additionalInfo: string[];
  };
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

    // === ANÁLISES PRINCIPAIS RESTAURADAS ===

    // 1. Análise de Performance Geral
    const performanceAnalysis = analyzePerformance(leadsData);
    newSuggestions.push(...performanceAnalysis);

    // 2. Análise de Conversão por Fonte
    const sourceAnalysis = analyzeSourceConversion(leadsData);
    newSuggestions.push(...sourceAnalysis);

    // 3. Análise de Tipos de Ação
    const actionTypeAnalysis = analyzeActionTypes(leadsData);
    newSuggestions.push(...actionTypeAnalysis);

    // 4. ANÁLISE PRINCIPAL DE MOTIVOS DE PERDA
    const lossReasonAnalysis = analyzeLossReasons(leadsData);
    newSuggestions.push(...lossReasonAnalysis);

    // === ANÁLISES DE CRUZAMENTO ===

    // 5. Análise por Estado e Performance
    const statePerformanceAnalysis = analyzeStatePerformance(leadsData);
    newSuggestions.push(...statePerformanceAnalysis);

    // 6. Análise por Estado e Tipo de Ação
    const stateActionAnalysis = analyzeStateActionPerformance(leadsData);
    newSuggestions.push(...stateActionAnalysis);

    // 7. Análise de Motivos de Perda por Estado
    const stateLossAnalysis = analyzeStateLossReasons(leadsData);
    newSuggestions.push(...stateLossAnalysis);

    // 8. Análise de Taxa de Conversão
    const conversionAnalysis = analyzeConversionRates(leadsData);
    newSuggestions.push(...conversionAnalysis);

    console.log('🔍 Total de sugestões geradas:', newSuggestions.length);
    console.log('📊 Sugestões por tipo:', newSuggestions.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>));

    setSuggestions(newSuggestions);
  };

  // === ANÁLISES PRINCIPAIS (restauradas) ===

  const analyzePerformance = (leadsData: Lead[]): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    const totalLeads = leadsData.length;
    const closedLeads = leadsData.filter(lead => lead.status === 'Contrato Fechado').length;
    const lostLeads = leadsData.filter(lead => lead.status === 'Perdido').length;
    const conversionRate = totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0;

    if (conversionRate < 20) {
      suggestions.push({
        id: 'low-conversion-rate',
        type: 'performance',
        priority: 'high',
        title: 'Taxa de conversão geral baixa',
        description: `A taxa de conversão geral está em ${conversionRate.toFixed(1)}%, abaixo do ideal`,
        metric: `${conversionRate.toFixed(1)}% de conversão`,
        recommendation: 'Revisar processo de vendas e qualificação de leads',
        impact: 'Aumento potencial de 15-25% na conversão',
        dataSupport: {
          mainStat: `${closedLeads} contratos de ${totalLeads} leads (${conversionRate.toFixed(1)}%)`,
          additionalInfo: [
            `${lostLeads} leads perdidos (${((lostLeads / totalLeads) * 100).toFixed(1)}%)`,
            'Meta recomendada: 25-35% de conversão',
            'Focar em qualificação e follow-up'
          ]
        }
      });
    }

    return suggestions;
  };

  const analyzeSourceConversion = (leadsData: Lead[]): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
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
        total: data.total,
        closed: data.closed
      }))
      .filter(source => source.total >= 3)
      .sort((a, b) => b.conversionRate - a.conversionRate);

    if (sourcePerformance.length > 1) {
      const worstSource = sourcePerformance[sourcePerformance.length - 1];
      
      if (worstSource.conversionRate < 15 && worstSource.total >= 5) {
        suggestions.push({
          id: `source-${worstSource.source}`,
          type: 'source',
          priority: 'medium',
          title: `Baixa performance da fonte: ${worstSource.source}`,
          description: `A fonte "${worstSource.source}" tem apenas ${worstSource.conversionRate.toFixed(1)}% de conversão`,
          metric: `${worstSource.conversionRate.toFixed(1)}% de conversão`,
          recommendation: `Revisar qualidade dos leads de "${worstSource.source}" ou reduzir investimento`,
          impact: 'Realocação de recursos pode aumentar ROI em 20-30%',
          dataSupport: {
            mainStat: `${worstSource.closed}/${worstSource.total} contratos (${worstSource.conversionRate.toFixed(1)}%)`,
            additionalInfo: [
              `Volume total: ${worstSource.total} leads`,
              `Contratos perdidos: ${worstSource.total - worstSource.closed}`,
              'Considerar melhorar ou pausar esta fonte'
            ]
          }
        });
      }
    }

    return suggestions;
  };

  const analyzeActionTypes = (leadsData: Lead[]): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    const actionData: Record<string, { total: number; closed: number }> = {};

    leadsData.forEach(lead => {
      const actionType = lead.action_type || 'Não informado';
      if (!actionData[actionType]) {
        actionData[actionType] = { total: 0, closed: 0 };
      }
      actionData[actionType].total++;
      if (lead.status === 'Contrato Fechado') {
        actionData[actionType].closed++;
      }
    });

    const actionPerformance = Object.entries(actionData)
      .map(([action, data]) => ({
        action,
        conversionRate: data.total > 0 ? (data.closed / data.total) * 100 : 0,
        total: data.total,
        closed: data.closed
      }))
      .filter(action => action.total >= 3)
      .sort((a, b) => b.conversionRate - a.conversionRate);

    if (actionPerformance.length > 1) {
      const bestAction = actionPerformance[0];
      const worstAction = actionPerformance[actionPerformance.length - 1];

      if (bestAction.conversionRate > worstAction.conversionRate + 20 && worstAction.total >= 5) {
        suggestions.push({
          id: `action-type-${worstAction.action}`,
          type: 'action_type',
          priority: 'medium',
          title: `Otimizar tipo de ação: ${worstAction.action}`,
          description: `"${worstAction.action}" tem performance inferior a "${bestAction.action}"`,
          metric: `${worstAction.conversionRate.toFixed(1)}% vs ${bestAction.conversionRate.toFixed(1)}%`,
          recommendation: `Focar mais em "${bestAction.action}" e reduzir "${worstAction.action}"`,
          impact: `Potencial aumento de ${(bestAction.conversionRate - worstAction.conversionRate).toFixed(1)}% na conversão`,
          dataSupport: {
            mainStat: `"${worstAction.action}": ${worstAction.closed}/${worstAction.total} (${worstAction.conversionRate.toFixed(1)}%)`,
            comparisonStat: `"${bestAction.action}": ${bestAction.closed}/${bestAction.total} (${bestAction.conversionRate.toFixed(1)}%)`,
            additionalInfo: [
              `Diferença: ${(bestAction.conversionRate - worstAction.conversionRate).toFixed(1)} pontos percentuais`,
              'Realocar recursos para ações mais efetivas',
              'Treinar equipe nas melhores práticas'
            ]
          }
        });
      }
    }

    return suggestions;
  };

  // === ANÁLISE PRINCIPAL DE MOTIVOS DE PERDA (nova/corrigida) ===

  const analyzeLossReasons = (leadsData: Lead[]): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    const lostLeads = leadsData.filter(lead => lead.status === 'Perdido');
    
    if (lostLeads.length < 3) return suggestions;

    const lossReasonData: Record<string, number> = {};
    
    lostLeads.forEach(lead => {
      const reason = lead.loss_reason || 'Não informado';
      lossReasonData[reason] = (lossReasonData[reason] || 0) + 1;
    });

    const lossReasonPerformance = Object.entries(lossReasonData)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: (count / lostLeads.length) * 100
      }))
      .sort((a, b) => b.count - a.count);

    // Principal motivo de perda
    const mainLossReason = lossReasonPerformance[0];
    if (mainLossReason && mainLossReason.percentage > 25) {
      suggestions.push({
        id: `main-loss-reason-${mainLossReason.reason}`,
        type: 'loss_reason',
        priority: mainLossReason.percentage > 50 ? 'high' : 'medium',
        title: `Principal motivo de perda: "${mainLossReason.reason}"`,
        description: `${mainLossReason.percentage.toFixed(1)}% de todas as perdas são por "${mainLossReason.reason}"`,
        metric: `${mainLossReason.count} de ${lostLeads.length} perdas (${mainLossReason.percentage.toFixed(1)}%)`,
        recommendation: `Desenvolver estratégia específica para reduzir perdas por "${mainLossReason.reason}"`,
        impact: `Potencial recuperação de ${Math.round(mainLossReason.count * 0.25)}-${Math.round(mainLossReason.count * 0.4)} leads`,
        dataSupport: {
          mainStat: `${mainLossReason.count} leads perdidos por "${mainLossReason.reason}"`,
          additionalInfo: [
            `Representa ${mainLossReason.percentage.toFixed(1)}% de todas as perdas`,
            `Total de leads perdidos: ${lostLeads.length}`,
            `Outros motivos: ${lossReasonPerformance.length - 1} diferentes`,
            `Impacto estimado na receita: Alto`
          ]
        }
      });
    }

    // Motivos concentrados (mais de 20% mas não o principal)
    lossReasonPerformance.slice(1).forEach(reason => {
      if (reason.percentage > 20 && reason.count >= 3) {
        suggestions.push({
          id: `concentrated-loss-${reason.reason}`,
          type: 'loss_reason',
          priority: 'medium',
          title: `Alto índice de perda por "${reason.reason}"`,
          description: `"${reason.reason}" representa ${reason.percentage.toFixed(1)}% das perdas`,
          metric: `${reason.count} de ${lostLeads.length} perdas`,
          recommendation: `Analisar e criar plano de ação para "${reason.reason}"`,
          impact: `Potencial recuperação de ${Math.round(reason.count * 0.2)} leads`,
          dataSupport: {
            mainStat: `${reason.count} leads perdidos por "${reason.reason}" (${reason.percentage.toFixed(1)}%)`,
            comparisonStat: `Principal motivo: "${mainLossReason.reason}" com ${mainLossReason.percentage.toFixed(1)}%`,
            additionalInfo: [
              `Concentração significativa do problema`,
              `Oportunidade de melhoria direcionada`,
              `ROI alto em ações específicas`
            ]
          }
        });
      }
    });

    console.log('📊 Análise de motivos de perda:', {
      totalLostLeads: lostLeads.length,
      reasonsAnalyzed: lossReasonPerformance.length,
      suggestionsGenerated: suggestions.length,
      mainReason: mainLossReason?.reason,
      mainReasonPercentage: mainLossReason?.percentage
    });

    return suggestions;
  };

  // === ANÁLISES DE CRUZAMENTO (mantidas) ===

  const analyzeStatePerformance = (leadsData: Lead[]): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    const stateData: Record<string, { total: number; closed: number; lost: number }> = {};

    leadsData.forEach(lead => {
      const state = lead.state || 'Não informado';
      if (!stateData[state]) {
        stateData[state] = { total: 0, closed: 0, lost: 0 };
      }
      stateData[state].total++;
      if (lead.status === 'Contrato Fechado') stateData[state].closed++;
      if (lead.status === 'Perdido') stateData[state].lost++;
    });

    const statePerformance = Object.entries(stateData)
      .map(([state, data]) => ({
        state,
        conversionRate: data.total > 0 ? (data.closed / data.total) * 100 : 0,
        lossRate: data.total > 0 ? (data.lost / data.total) * 100 : 0,
        total: data.total,
        closed: data.closed,
        lost: data.lost
      }))
      .filter(state => state.total >= 5)
      .sort((a, b) => b.conversionRate - a.conversionRate);

    if (statePerformance.length > 1) {
      const bestState = statePerformance[0];
      const worstStates = statePerformance.filter(s => s.conversionRate < bestState.conversionRate - 20);

      worstStates.forEach(state => {
        suggestions.push({
          id: `state-performance-${state.state}`,
          type: 'state_performance',
          priority: state.conversionRate < 15 ? 'high' : 'medium',
          title: `Baixa performance no estado: ${state.state}`,
          description: `${state.state} apresenta conversão significativamente inferior aos melhores estados`,
          metric: `${state.conversionRate.toFixed(1)}% de conversão`,
          recommendation: `Analisar estratégias específicas para ${state.state} e aplicar táticas do estado ${bestState.state}`,
          impact: `Potencial aumento de ${(bestState.conversionRate - state.conversionRate).toFixed(1)}% na conversão`,
          dataSupport: {
            mainStat: `${state.closed} contratos de ${state.total} leads (${state.conversionRate.toFixed(1)}%)`,
            comparisonStat: `Melhor estado: ${bestState.state} com ${bestState.conversionRate.toFixed(1)}%`,
            additionalInfo: [
              `${state.lost} leads perdidos em ${state.state}`,
              `Taxa de perda: ${state.lossRate.toFixed(1)}%`,
              `Diferença para o melhor: ${(bestState.conversionRate - state.conversionRate).toFixed(1)} pontos percentuais`
            ]
          }
        });
      });
    }

    return suggestions;
  };

  const analyzeStateActionPerformance = (leadsData: Lead[]): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    const stateActionData: Record<string, Record<string, { total: number; closed: number }>> = {};

    leadsData.forEach(lead => {
      const state = lead.state || 'Não informado';
      const actionType = lead.action_type || 'Não informado';

      if (!stateActionData[state]) stateActionData[state] = {};
      if (!stateActionData[state][actionType]) {
        stateActionData[state][actionType] = { total: 0, closed: 0 };
      }

      stateActionData[state][actionType].total++;
      if (lead.status === 'Contrato Fechado') {
        stateActionData[state][actionType].closed++;
      }
    });

    Object.entries(stateActionData).forEach(([state, actions]) => {
      const actionPerformance = Object.entries(actions)
        .map(([actionType, data]) => ({
          actionType,
          conversionRate: data.total > 0 ? (data.closed / data.total) * 100 : 0,
          total: data.total,
          closed: data.closed
        }))
        .filter(action => action.total >= 3)
        .sort((a, b) => b.conversionRate - a.conversionRate);

      if (actionPerformance.length > 1) {
        const bestAction = actionPerformance[0];
        const worstAction = actionPerformance[actionPerformance.length - 1];

        if (bestAction.conversionRate > worstAction.conversionRate + 25) {
          suggestions.push({
            id: `state-action-${state}-${worstAction.actionType}`,
            type: 'state_action',
            priority: worstAction.conversionRate < 15 ? 'high' : 'medium',
            title: `${state}: Otimizar tipo de ação "${worstAction.actionType}"`,
            description: `No estado ${state}, o tipo de ação "${worstAction.actionType}" tem performance muito baixa`,
            metric: `${worstAction.conversionRate.toFixed(1)}% vs ${bestAction.conversionRate.toFixed(1)}%`,
            recommendation: `Reduzir "${worstAction.actionType}" e focar em "${bestAction.actionType}" no estado ${state}`,
            impact: `Potencial aumento de ${(bestAction.conversionRate - worstAction.conversionRate).toFixed(1)}% na conversão`,
            dataSupport: {
              mainStat: `"${worstAction.actionType}": ${worstAction.closed}/${worstAction.total} (${worstAction.conversionRate.toFixed(1)}%)`,
              comparisonStat: `"${bestAction.actionType}": ${bestAction.closed}/${bestAction.total} (${bestAction.conversionRate.toFixed(1)}%)`,
              additionalInfo: [
                `Estado analisado: ${state}`,
                `Diferença de performance: ${(bestAction.conversionRate - worstAction.conversionRate).toFixed(1)} pontos percentuais`,
                `Total de ações analisadas: ${actionPerformance.length}`
              ]
            }
          });
        }
      }
    });

    return suggestions;
  };

  const analyzeStateLossReasons = (leadsData: Lead[]): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    const stateLossData: Record<string, Record<string, number>> = {};

    leadsData.filter(lead => lead.status === 'Perdido').forEach(lead => {
      const state = lead.state || 'Não informado';
      const lossReason = lead.loss_reason || 'Não informado';

      if (!stateLossData[state]) stateLossData[state] = {};
      stateLossData[state][lossReason] = (stateLossData[state][lossReason] || 0) + 1;
    });

    Object.entries(stateLossData).forEach(([state, lossReasons]) => {
      const totalLossesInState = Object.values(lossReasons).reduce((sum, count) => sum + count, 0);
      
      Object.entries(lossReasons).forEach(([reason, count]) => {
        const percentage = (count / totalLossesInState) * 100;
        
        if (percentage > 30 && totalLossesInState >= 5) {
          suggestions.push({
            id: `state-loss-${state}-${reason}`,
            type: 'loss_reason',
            priority: percentage > 50 ? 'high' : 'medium',
            title: `${state}: Alto índice de perda por "${reason}"`,
            description: `No estado ${state}, ${percentage.toFixed(1)}% das perdas são por "${reason}"`,
            metric: `${count} perdas de ${totalLossesInState} total`,
            recommendation: `Desenvolver estratégia específica para "${reason}" no estado ${state}`,
            impact: `Potencial recuperação de ${Math.round(count * 0.2)}-${Math.round(count * 0.3)} leads`,
            dataSupport: {
              mainStat: `${count} leads perdidos por "${reason}" (${percentage.toFixed(1)}% do total)`,
              additionalInfo: [
                `Estado: ${state}`,
                `Total de perdas no estado: ${totalLossesInState}`,
                `Concentração do problema: ${percentage.toFixed(1)}%`
              ]
            }
          });
        }
      });
    });

    return suggestions;
  };

  const analyzeConversionRates = (leadsData: Lead[]): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    
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
        total: data.total,
        closed: data.closed
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
          impact: `Realocação de recursos pode aumentar ROI em 25-30%`,
          dataSupport: {
            mainStat: `${source.closed}/${source.total} contratos (${source.conversionRate.toFixed(1)}%)`,
            comparisonStat: `Melhor fonte: ${bestSource.source} com ${bestSource.conversionRate.toFixed(1)}%`,
            additionalInfo: [
              `Diferença: ${(bestSource.conversionRate - source.conversionRate).toFixed(1)} pontos percentuais`,
              `Volume de leads: ${source.total}`,
              `Contratos perdidos potenciais: ${Math.round((bestSource.conversionRate - source.conversionRate) * source.total / 100)}`
            ]
          }
        });
      });
    }

    return suggestions;
  };

  // ... keep existing code (helper functions and rendering)
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
      case 'performance': return <BarChart3 className="h-5 w-5 text-blue-500" />;
      case 'source': return <Activity className="h-5 w-5 text-green-500" />;
      case 'action_type': return <Users className="h-5 w-5 text-orange-500" />;
      case 'state_action': return <MapPin className="h-5 w-5 text-blue-500" />;
      case 'state_performance': return <BarChart3 className="h-5 w-5 text-purple-500" />;
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
                  
                  <p className="text-gray-600 mb-4">{suggestion.description}</p>
                  
                  {/* Dados de Suporte */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Dados que Corroboram a Análise:
                    </h4>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">Métrica Principal:</span>
                        <span className="ml-2 text-gray-600">{suggestion.dataSupport.mainStat}</span>
                      </div>
                      {suggestion.dataSupport.comparisonStat && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Comparação:</span>
                          <span className="ml-2 text-gray-600">{suggestion.dataSupport.comparisonStat}</span>
                        </div>
                      )}
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">Informações Adicionais:</span>
                        <ul className="ml-4 mt-1 space-y-1">
                          {suggestion.dataSupport.additionalInfo.map((info, index) => (
                            <li key={index} className="text-gray-600 text-xs">• {info}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
