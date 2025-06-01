
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Users } from "lucide-react";
import { Lead } from "@/types/lead";

interface ActionTypesChartProps {
  leads: Lead[];
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  "consultoria": "Consultoria Jurídica",
  "contratos": "Contratos",
  "trabalhista": "Trabalhista",
  "compliance": "Compliance",
  "tributario": "Tributário",
  "civil": "Civil",
  "criminal": "Criminal",
  "outros": "Outros"
};

const ACTION_TYPE_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-yellow-500"
];

export function ActionTypesChart({ leads }: ActionTypesChartProps) {
  const chartData = useMemo(() => {
    if (!leads || !Array.isArray(leads)) {
      return [];
    }
    
    const actionTypes = leads.reduce((acc, lead) => {
      const type = lead.action_type || "outros";
      const label = ACTION_TYPE_LABELS[type] || type;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(actionTypes)
      .map(([type, count], index) => ({
        type,
        count,
        percentage: leads.length > 0 ? (count / leads.length) * 100 : 0,
        color: ACTION_TYPE_COLORS[index % ACTION_TYPE_COLORS.length]
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const totalLeads = leads?.length || 0;

  if (totalLeads === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Tipos de Ação
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-500" />
          Tipos de Ação
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>{totalLeads} leads</span>
        </div>
      </div>

      <div className="space-y-4">
        {chartData.map((item, index) => (
          <div key={item.type} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">{item.type}</span>
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
                className={`${item.color} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Total de leads: {totalLeads}</span>
          <span>Principal tipo: {chartData[0]?.type || 'N/A'}</span>
        </div>
      </div>
    </Card>
  );
}
