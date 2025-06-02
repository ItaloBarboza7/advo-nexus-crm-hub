
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, UserCheck, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Lead } from "@/types/lead";

interface StateStatsChartProps {
  leads: Lead[];
}

export function StateStatsChart({ leads }: StateStatsChartProps) {
  const stateStats = useMemo(() => {
    if (!leads || !Array.isArray(leads)) {
      return [];
    }
    
    const states = leads.reduce((acc, lead) => {
      const state = lead.state || "Não informado";
      if (!acc[state]) {
        acc[state] = {
          total: 0,
          contratos: 0
        };
      }
      
      acc[state].total += 1;
      
      if (lead.status === "Contrato Fechado") {
        acc[state].contratos += 1;
      }
      
      return acc;
    }, {} as Record<string, { total: number; contratos: number; }>);

    return Object.entries(states)
      .map(([state, stats]) => ({
        state,
        ...stats,
        taxaConversao: stats.total > 0 ? (stats.contratos / stats.total) * 100 : 0
      }))
      .sort((a, b) => b.taxaConversao - a.taxaConversao); // Ordenar por taxa de conversão
  }, [leads]);

  const totalLeads = leads?.length || 0;
  const totalContratos = stateStats.reduce((acc, state) => acc + state.contratos, 0);
  const top3Estados = stateStats.slice(0, 3);

  if (totalLeads === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-500" />
            Performance por Estado
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
          Performance por Estado
        </h3>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{totalLeads} leads</span>
          </div>
          <div className="flex items-center gap-1">
            <UserCheck className="h-4 w-4 text-green-600" />
            <span>{totalContratos} contratos</span>
          </div>
        </div>
      </div>

      {/* Top 3 Estados - Ranking de Conversão */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h4 className="font-semibold text-gray-800">Top 3 Estados por Conversão</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3Estados.map((estado, index) => (
            <div key={estado.state} className={`p-4 rounded-lg border-2 ${
              index === 0 ? 'bg-yellow-50 border-yellow-200' :
              index === 1 ? 'bg-gray-50 border-gray-200' :
              'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-500' :
                    'bg-orange-500'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="font-semibold text-gray-800">{estado.state}</span>
                </div>
                <Badge className={
                  index === 0 ? 'bg-yellow-100 text-yellow-800' :
                  index === 1 ? 'bg-gray-100 text-gray-800' :
                  'bg-orange-100 text-orange-800'
                }>
                  {estado.taxaConversao.toFixed(1)}%
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-center">
                  <div className="font-bold text-gray-900">{estado.total}</div>
                  <div className="text-gray-600 text-xs">Total</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-green-700">{estado.contratos}</div>
                  <div className="text-gray-600 text-xs">Contratos</div>
                </div>
              </div>
              
              <div className="mt-3">
                <Progress 
                  value={estado.taxaConversao} 
                  className="h-2"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lista Completa de Estados */}
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
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900">{estado.total}</div>
                  <div className="text-xs text-gray-600">leads</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-green-700">{estado.contratos}</div>
                  <div className="text-xs text-gray-600">contratos</div>
                </div>
                <div className="text-center min-w-[60px]">
                  <div className="text-sm font-bold text-purple-700">{estado.taxaConversao.toFixed(1)}%</div>
                  <div className="text-xs text-gray-600">conversão</div>
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
            <span className="font-semibold text-gray-900">{((totalContratos / totalLeads) * 100).toFixed(1)}%</span>
            <div>Taxa geral de conversão</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
