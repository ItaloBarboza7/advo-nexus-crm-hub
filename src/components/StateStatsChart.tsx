import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, UserCheck, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Lead } from "@/types/lead";

interface StateStatsChartProps {
  leads: Lead[];
  selectedCategory?: string;
  hasLeadPassedThroughStatus?: (leadId: string, statuses: string[]) => boolean;
}

export function StateStatsChart({ leads, selectedCategory = "all", hasLeadPassedThroughStatus }: StateStatsChartProps) {
  
  // Função para verificar se um lead é uma oportunidade (NOVA REGRA)
  const isOpportunityLead = (lead: Lead): boolean => {
    if (!hasLeadPassedThroughStatus) return false;
    
    // NOVA REGRA: Oportunidades são leads que:
    // 1. NÃO estão em "Novo" (independente do histórico)
    // 2. Estão atualmente em "Proposta" ou "Reunião" OU passaram por eles (histórico)
    
    if (lead.status === "Novo") return false;
    
    if (lead.status === "Proposta" || lead.status === "Reunião") return true;
    
    const hasPassedThroughTargetStatuses = hasLeadPassedThroughStatus(lead.id, ["Proposta", "Reunião"]);
    
    return hasPassedThroughTargetStatuses;
  };

  const stateStats = useMemo(() => {
    if (!leads || !Array.isArray(leads)) {
      return [];
    }
    
    const mainCategory = selectedCategory.split('-')[0];
    
    const states = leads.reduce((acc, lead) => {
      const state = lead.state || "Não informado";
      if (!acc[state]) {
        acc[state] = {
          total: 0,
          contratos: 0,
          oportunidades: 0,
          perdas: 0
        };
      }
      
      // Sempre contar o total
      acc[state].total += 1;
      
      // Contar contratos
      if (lead.status === "Contrato Fechado") {
        acc[state].contratos += 1;
      }
      
      // Contar oportunidades (NOVA REGRA)
      if (isOpportunityLead(lead)) {
        acc[state].oportunidades += 1;
      }
      
      // Contar perdas
      if (lead.status === "Perdido") {
        acc[state].perdas += 1;
      }
      
      return acc;
    }, {} as Record<string, { total: number; contratos: number; oportunidades: number; perdas: number; }>);

    return Object.entries(states)
      .map(([state, stats]) => {
        let metrica = 0;
        let taxaConversao = 0;
        
        // Definir métrica baseada na categoria
        switch (mainCategory) {
          case "contratos":
            metrica = stats.contratos;
            taxaConversao = stats.total > 0 ? (stats.contratos / stats.total) * 100 : 0;
            break;
          case "oportunidades":
            metrica = stats.oportunidades;
            taxaConversao = stats.total > 0 ? (stats.oportunidades / stats.total) * 100 : 0;
            break;
          case "perdas":
            metrica = stats.perdas;
            taxaConversao = stats.total > 0 ? (stats.perdas / stats.total) * 100 : 0;
            break;
          default: // "all" ou "estados"
            metrica = stats.total;
            taxaConversao = stats.total > 0 ? (stats.contratos / stats.total) * 100 : 0;
            break;
        }
        
        return {
          state,
          total: stats.total,
          contratos: stats.contratos,
          oportunidades: stats.oportunidades,
          perdas: stats.perdas,
          metrica,
          taxaConversao
        };
      })
      .sort((a, b) => {
        if (mainCategory === "all" || selectedCategory === "estados") {
          return b.total - a.total;
        }
        return b.metrica - a.metrica;
      });
  }, [leads, selectedCategory, hasLeadPassedThroughStatus]);

  const getTitle = () => {
    const mainCategory = selectedCategory.split('-')[0];
    switch (mainCategory) {
      case "contratos":
        return "Estados com Mais Contratos";
      case "oportunidades":
        return "Estados com Mais Oportunidades";
      case "perdas":
        return "Estados com Mais Perdas";
      default:
        return "Estados com Mais Leads";
    }
  };

  const getMetricaLabel = () => {
    const mainCategory = selectedCategory.split('-')[0];
    switch (mainCategory) {
      case "contratos":
        return "contratos";
      case "oportunidades":
        return "oportunidades";
      case "perdas":
        return "perdas";
      default:
        return "leads";
    }
  };

  const totalLeads = leads?.length || 0;
  const totalMetrica = stateStats.reduce((acc, state) => acc + state.metrica, 0);
  const top3Estados = stateStats.slice(0, 3);

  // Verificar se estamos na visualização de Estados
  const isEstadosView = selectedCategory === "estados" || selectedCategory.endsWith("-estados");

  if (totalLeads === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-500" />
            {getTitle()}
          </h3>
        </div>
        <div className="text-center text-gray-500 py-8">
          <p>Nenhum lead encontrado.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-purple-500" />
          {getTitle()}
        </h3>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{totalLeads} leads</span>
          </div>
          <div className="flex items-center gap-1">
            <UserCheck className="h-4 w-4 text-green-600" />
            <span>{totalMetrica} {getMetricaLabel()}</span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        {/* Só mostrar o título "Top 3 Estados" e o ícone do troféu se NÃO estivermos na visualização de Estados */}
        {!isEstadosView && (
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h4 className="font-semibold text-gray-800">Top 3 Estados</h4>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3Estados.map((estado, index) => (
            <div key={estado.state} className={`p-4 rounded-lg border-2 ${
              index === 0 ? 'bg-gray-100 border-gray-800 text-gray-800' :
              index === 1 ? 'bg-gray-100 border-gray-600 text-gray-700' :
              'bg-gray-100 border-gray-400 text-gray-600'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border ${
                    index === 0 ? 'bg-gray-100 border-gray-800 text-gray-800' :
                    index === 1 ? 'bg-gray-100 border-gray-600 text-gray-600' :
                    'bg-gray-100 border-gray-400 text-gray-400'
                  }`}>
                    {index + 1}°
                  </div>
                  <span className="font-semibold">{estado.state}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-center">
                  <div className="font-bold">{estado.total}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{estado.metrica}</div>
                  <div className="text-xs text-gray-500">{getMetricaLabel()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 mb-4">Todos os Estados</h4>
        <div className="max-h-60 overflow-y-auto space-y-3">
          {stateStats.map((estado, index) => (
            <div key={estado.state} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-purple-600">{index + 1}</span>
                </div>
                <span className="font-medium text-gray-800">{estado.state}</span>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Mostrar "total" apenas se não for a categoria "all" */}
                {selectedCategory !== "all" && (
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-900">{estado.total}</div>
                    <div className="text-xs text-gray-600">total</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-sm font-semibold text-purple-700">{estado.metrica}</div>
                  <div className="text-xs text-gray-600">{getMetricaLabel()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 text-center">
          <div>
            <span className="font-semibold text-gray-900">{stateStats.length}</span>
            <div>Estados ativos</div>
          </div>
          <div>
            <span className="font-semibold text-gray-900">{totalMetrica}</span>
            <div>Total de {getMetricaLabel()}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
