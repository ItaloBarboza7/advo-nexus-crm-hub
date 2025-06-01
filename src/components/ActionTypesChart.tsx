
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Briefcase } from "lucide-react";

interface ActionTypesChartProps {
  leadsData: Array<{
    id: number;
    status: string;
    action_type: string | null;
    category: string;
  }>;
  selectedCategory: string;
}

// Move getActionTypeLabel outside the component to avoid initialization issues
const getActionTypeLabel = (actionType: string) => {
  const labels: Record<string, string> = {
    "consultoria": "Consultoria Jurídica",
    "contratos": "Contratos",
    "trabalhista": "Trabalhista",
    "compliance": "Compliance",
    "tributario": "Tributário",
    "civil": "Civil",
    "criminal": "Criminal",
    "outros": "Outros"
  };
  return labels[actionType] || actionType;
};

export function ActionTypesChart({ leadsData, selectedCategory }: ActionTypesChartProps) {
  const actionTypeData = useMemo(() => {
    let filteredLeads = [];

    if (selectedCategory === "contratos") {
      // Leads com status "Contrato Fechado"
      filteredLeads = leadsData.filter(lead => lead.status === "Novo Contrato");
    } else if (selectedCategory === "oportunidades") {
      // Leads que passaram por "Reunião" ou "Proposta" - para simplificar, vamos usar leads com status "Oportunidade"
      filteredLeads = leadsData.filter(lead => lead.status === "Oportunidade");
    } else {
      return [];
    }

    // Filtrar leads com action_type
    const leadsWithActionType = filteredLeads.filter(lead => lead.action_type);

    if (leadsWithActionType.length === 0) return [];

    // Contar ocorrências de cada tipo de ação
    const actionTypeCounts = leadsWithActionType.reduce((acc, lead) => {
      if (lead.action_type) {
        acc[lead.action_type] = (acc[lead.action_type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Calcular porcentagens e ordenar por frequência
    const totalActions = leadsWithActionType.length;
    return Object.entries(actionTypeCounts)
      .map(([actionType, count]) => ({
        actionType: getActionTypeLabel(actionType),
        count,
        percentage: Math.round((count / totalActions) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  }, [leadsData, selectedCategory]);

  // Só mostrar o gráfico se há dados para exibir
  if (actionTypeData.length === 0) return null;

  // Cores modernas para as barras
  const getBarColor = (index: number) => {
    const colors = [
      "bg-gradient-to-r from-blue-500 to-blue-600",
      "bg-gradient-to-r from-green-500 to-green-600", 
      "bg-gradient-to-r from-purple-500 to-purple-600",
      "bg-gradient-to-r from-orange-500 to-orange-600",
      "bg-gradient-to-r from-pink-500 to-pink-600",
      "bg-gradient-to-r from-teal-500 to-teal-600",
    ];
    return colors[index % colors.length];
  };

  const getTitle = () => {
    if (selectedCategory === "contratos") {
      return "Tipos de Ação - Novos Contratos";
    } else if (selectedCategory === "oportunidades") {
      return "Tipos de Ação - Oportunidades";
    }
    return "Tipos de Ação";
  };

  const getDescription = () => {
    if (selectedCategory === "contratos") {
      return "Distribuição dos tipos de ação para leads com contratos fechados";
    } else if (selectedCategory === "oportunidades") {
      return "Distribuição dos tipos de ação para leads em oportunidade";
    }
    return "Distribuição dos tipos de ação";
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-blue-100">
          {selectedCategory === "contratos" ? (
            <Briefcase className="h-5 w-5 text-blue-600" />
          ) : (
            <Target className="h-5 w-5 text-blue-600" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {getTitle()}
          </h3>
          <p className="text-sm text-gray-600">
            {getDescription()}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {actionTypeData.map((item, index) => (
          <div key={item.actionType} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {item.actionType}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-gray-900">
                  {item.percentage}%
                </span>
                <span className="text-xs text-gray-500 ml-1">
                  ({item.count} leads)
                </span>
              </div>
            </div>
            
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ease-out ${getBarColor(index)} shadow-sm`}
                  style={{ 
                    width: `${item.percentage}%`,
                    background: index === 0 
                      ? "linear-gradient(90deg, #3b82f6, #2563eb)" 
                      : index === 1 
                      ? "linear-gradient(90deg, #10b981, #059669)"
                      : index === 2
                      ? "linear-gradient(90deg, #8b5cf6, #7c3aed)"
                      : index === 3
                      ? "linear-gradient(90deg, #f97316, #ea580c)"
                      : index === 4
                      ? "linear-gradient(90deg, #ec4899, #db2777)"
                      : "linear-gradient(90deg, #14b8a6, #0d9488)"
                  }}
                />
              </div>
              
              {/* Efeito de brilho */}
              <div 
                className="absolute top-0 left-0 h-3 rounded-full opacity-30 bg-white"
                style={{ 
                  width: `${Math.min(item.percentage * 0.6, 100)}%`,
                  background: "linear-gradient(90deg, rgba(255,255,255,0.8), rgba(255,255,255,0))"
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Resumo estatístico */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {actionTypeData.reduce((sum, item) => sum + item.count, 0)}
            </div>
            <div className="text-xs text-gray-600">
              {selectedCategory === "contratos" ? "Contratos" : "Oportunidades"}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {actionTypeData.length}
            </div>
            <div className="text-xs text-gray-600">Tipos Diferentes</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
