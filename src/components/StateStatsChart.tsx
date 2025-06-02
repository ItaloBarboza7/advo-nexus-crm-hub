
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, UserCheck, Target, UserX } from "lucide-react";
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
        perdasPercent: stats.total > 0 ? (stats.perdas / stats.total) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [leads]);

  const totalLeads = leads?.length || 0;

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
          Leads por Estado
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>{totalLeads} leads em {stateStats.length} estados</span>
        </div>
      </div>

      <div className="space-y-6 max-h-96 overflow-y-auto">
        {stateStats.map((statData, index) => (
          <div key={statData.state} className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm"></div>
                <h4 className="font-semibold text-gray-800">{statData.state}</h4>
              </div>
              <Badge className="bg-purple-100 text-purple-800">
                {statData.total} leads
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              {/* Novos Contratos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <span className="text-gray-600">Contratos</span>
                  </div>
                  <span className="font-bold text-green-700">{statData.contratos}</span>
                </div>
                <div className="space-y-1">
                  <Progress 
                    value={statData.contratosPercent} 
                    className="h-2 bg-gray-200"
                  />
                  <span className="text-xs text-gray-500">
                    {statData.contratosPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Oportunidades */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="text-gray-600">Oportunidades</span>
                  </div>
                  <span className="font-bold text-blue-700">{statData.oportunidades}</span>
                </div>
                <div className="space-y-1">
                  <Progress 
                    value={statData.oportunidadesPercent} 
                    className="h-2 bg-gray-200"
                  />
                  <span className="text-xs text-gray-500">
                    {statData.oportunidadesPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Perdas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-red-600" />
                    <span className="text-gray-600">Perdas</span>
                  </div>
                  <span className="font-bold text-red-700">{statData.perdas}</span>
                </div>
                <div className="space-y-1">
                  <Progress 
                    value={statData.perdasPercent} 
                    className="h-2 bg-gray-200"
                  />
                  <span className="text-xs text-gray-500">
                    {statData.perdasPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Estados com leads: {stateStats.length}</span>
          <span>Estado líder: {stateStats[0]?.state || 'N/A'} ({stateStats[0]?.total || 0} leads)</span>
        </div>
      </div>
    </Card>
  );
}
