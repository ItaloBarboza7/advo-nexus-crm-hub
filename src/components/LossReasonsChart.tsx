
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, Users } from "lucide-react";
import { Lead } from "@/types/lead";

interface LossReasonsChartProps {
  leads: Lead[];
}

export function LossReasonsChart({ leads }: LossReasonsChartProps) {
  const chartData = useMemo(() => {
    if (!leads || !Array.isArray(leads)) {
      return [];
    }
    
    const lossReasons = leads.reduce((acc, lead) => {
      const reason = lead.loss_reason || "Sem motivo especificado";
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(lossReasons)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: leads.length > 0 ? (count / leads.length) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const totalLeads = leads?.length || 0;

  if (totalLeads === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Motivos de Perda
          </h3>
        </div>
        <div className="text-center text-gray-500 py-8">
          <p>Nenhum lead perdido encontrado.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-500" />
          Motivos de Perda
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>{totalLeads} leads perdidos</span>
        </div>
      </div>

      <div className="space-y-4">
        {chartData.map((item, index) => (
          <div key={item.reason} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">{item.reason}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {item.count} leads
                </Badge>
                <span className="text-sm text-gray-500">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Total de leads perdidos: {totalLeads}</span>
          <span>Principal motivo: {chartData[0]?.reason || 'N/A'}</span>
        </div>
      </div>
    </Card>
  );
}
