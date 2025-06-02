
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, UserCheck, Target, UserX, TrendingUp } from "lucide-react";
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
          contratos: 0,
          oportunidades: 0,
          perdas: 0
        };
      }
      
      acc[state].total += 1;
      
      if (lead.status === "Contrato Fechado") {
        acc[state].contratos += 1;
      } else if (["Novo", "Proposta", "Reunião"].includes(lead.status)) {
        acc[state].oportunidades += 1;
      } else if (lead.status === "Perdido") {
        acc[state].perdas += 1;
      }
      
      return acc;
    }, {} as Record<string, { total: number; contratos: number; oportunidades: number; perdas: number; }>);

    return Object.entries(states)
      .map(([state, stats]) => ({
        state,
        ...stats,
        contratosPercent: stats.total > 0 ? (stats.contratos / stats.total) * 100 : 0,
        oportunidadesPercent: stats.total > 0 ? (stats.oportunidades / stats.total) * 100 : 0,
        perdasPercent: stats.total > 0 ? (stats.perdas / stats.total) * 100 : 0,
        taxaConversao: stats.total > 0 ? ((stats.contratos / stats.total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.total - a.total);
  }, [leads]);

  const totalLeads = leads?.length || 0;
  const totalContratos = stateStats.reduce((acc, state) => acc + state.contratos, 0);
  const melhorEstado = stateStats[0];

  if (totalLeads === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-500" />
            Leads por Estado
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

      {/* Estado Destaque */}
      {melhorEstado && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Estado Líder: {melhorEstado.state}
            </h4>
            <Badge className="bg-purple-100 text-purple-800">
              {melhorEstado.taxaConversao}% conversão
            </Badge>
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-gray-900">{melhorEstado.total}</div>
              <div className="text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-green-700">{melhorEstado.contratos}</div>
              <div className="text-gray-600">Contratos</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-blue-700">{melhorEstado.oportunidades}</div>
              <div className="text-gray-600">Oportunidades</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-red-700">{melhorEstado.perdas}</div>
              <div className="text-gray-600">Perdas</div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 max-h-80 overflow-y-auto">
        {stateStats.map((statData, index) => (
          <div key={statData.state} className="space-y-3 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <h4 className="font-medium text-gray-800">{statData.state}</h4>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">{statData.total} leads</span>
                <Badge className="bg-gray-100 text-gray-700 text-xs">
                  {statData.taxaConversao}%
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Contratos */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-green-600" />
                    <span className="text-gray-600">Contratos</span>
                  </div>
                  <span className="font-semibold text-green-700">{statData.contratos}</span>
                </div>
                <Progress 
                  value={statData.contratosPercent} 
                  className="h-2"
                />
                <span className="text-xs text-gray-500">{statData.contratosPercent.toFixed(1)}%</span>
              </div>

              {/* Oportunidades */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-blue-600" />
                    <span className="text-gray-600">Oportunidades</span>
                  </div>
                  <span className="font-semibold text-blue-700">{statData.oportunidades}</span>
                </div>
                <Progress 
                  value={statData.oportunidadesPercent} 
                  className="h-2"
                />
                <span className="text-xs text-gray-500">{statData.oportunidadesPercent.toFixed(1)}%</span>
              </div>

              {/* Perdas */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <UserX className="h-3 w-3 text-red-600" />
                    <span className="text-gray-600">Perdas</span>
                  </div>
                  <span className="font-semibold text-red-700">{statData.perdas}</span>
                </div>
                <Progress 
                  value={statData.perdasPercent} 
                  className="h-2"
                />
                <span className="text-xs text-gray-500">{statData.perdasPercent.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 text-center">
          <div>
            <span className="font-semibold text-gray-900">{stateStats.length}</span>
            <div>Estados ativos</div>
          </div>
          <div>
            <span className="font-semibold text-gray-900">{melhorEstado?.state || 'N/A'}</span>
            <div>Melhor estado</div>
          </div>
          <div>
            <span className="font-semibold text-gray-900">{melhorEstado?.taxaConversao || '0'}%</span>
            <div>Melhor conversão</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
