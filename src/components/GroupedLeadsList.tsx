import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { Lead } from "@/types/lead";

interface GroupedLeadsListProps {
  leads: Lead[];
  selectedCategory: string;
  onViewDetails: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
}

export function GroupedLeadsList({ leads, selectedCategory, onViewDetails, onEditLead }: GroupedLeadsListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const handleLeadClick = (lead: Lead) => {
    onViewDetails(lead);
  };

  const groupedLeads = () => {
    console.log(`🔍 GroupedLeadsList - selectedCategory: ${selectedCategory}`);
    
    // CORREÇÃO: Verificar se a categoria inclui subcategorias de ação
    if (selectedCategory === "perdas" || selectedCategory.startsWith("perdas-")) {
      // Para perdas com tipo de ação, agrupar por action_type
      if (selectedCategory === "perdas-tipo-acao") {
        const groups = leads.reduce((acc, lead) => {
          const actionType = lead.action_type || "outros";
          const groupName = getActionTypeLabel(actionType);
          if (!acc[groupName]) {
            acc[groupName] = [];
          }
          acc[groupName].push(lead);
          return acc;
        }, {} as Record<string, Lead[]>);
        return groups;
      }
      // Para perdas com grupo de ação, agrupar por action_group (ou mapear action_type para grupos)
      else if (selectedCategory === "perdas-grupo-acao") {
        const groups = leads.reduce((acc, lead) => {
          const actionType = lead.action_type || "outros";
          const groupName = getActionGroupLabel(actionType);
          if (!acc[groupName]) {
            acc[groupName] = [];
          }
          acc[groupName].push(lead);
          return acc;
        }, {} as Record<string, Lead[]>);
        return groups;
      }
      // Para perdas simples, agrupar por loss_reason
      else if (selectedCategory === "perdas") {
        const groups = leads.reduce((acc, lead) => {
          const lossReason = lead.loss_reason || "Sem motivo especificado";
          if (!acc[lossReason]) {
            acc[lossReason] = [];
          }
          acc[lossReason].push(lead);
          return acc;
        }, {} as Record<string, Lead[]>);
        return groups;
      }
    } 
    // Para contratos com tipo de ação, agrupar por action_type
    else if (selectedCategory === "contratos-tipo-acao") {
      const groups = leads.reduce((acc, lead) => {
        const actionType = lead.action_type || "outros";
        const groupName = getActionTypeLabel(actionType);
        if (!acc[groupName]) {
          acc[groupName] = [];
        }
        acc[groupName].push(lead);
        return acc;
      }, {} as Record<string, Lead[]>);
      return groups;
    }
    // Para contratos com grupo de ação, agrupar por action_group
    else if (selectedCategory === "contratos-grupo-acao") {
      const groups = leads.reduce((acc, lead) => {
        const actionType = lead.action_type || "outros";
        const groupName = getActionGroupLabel(actionType);
        if (!acc[groupName]) {
          acc[groupName] = [];
        }
        acc[groupName].push(lead);
        return acc;
      }, {} as Record<string, Lead[]>);
      return groups;
    }
    // Para oportunidades com tipo de ação, agrupar por action_type
    else if (selectedCategory === "oportunidades-tipo-acao") {
      const groups = leads.reduce((acc, lead) => {
        const actionType = lead.action_type || "outros";
        const groupName = getActionTypeLabel(actionType);
        if (!acc[groupName]) {
          acc[groupName] = [];
        }
        acc[groupName].push(lead);
        return acc;
      }, {} as Record<string, Lead[]>);
      return groups;
    }
    // Para oportunidades com grupo de ação, agrupar por action_group
    else if (selectedCategory === "oportunidades-grupo-acao") {
      const groups = leads.reduce((acc, lead) => {
        const actionType = lead.action_type || "outros";
        const groupName = getActionGroupLabel(actionType);
        if (!acc[groupName]) {
          acc[groupName] = [];
        }
        acc[groupName].push(lead);
        return acc;
      }, {} as Record<string, Lead[]>);
      return groups;
    }
    // Para categorias principais simples (contratos, oportunidades), não agrupar
    else if (selectedCategory === "contratos" || selectedCategory === "oportunidades") {
      return { "Todos os Leads": leads };
    } 
    else {
      return { "Todos os Leads": leads };
    }
  };

  const getActionTypeLabel = (actionType: string): string => {
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
    return labels[actionType] || "Outros";
  };

  // Mapear tipos de ação para grupos de ação (igual aos gráficos)
  const getActionGroupLabel = (actionType: string): string => {
    const actionGroupMapping: Record<string, string> = {
      "consultoria": "Consultoria",
      "contratos": "Contratos", 
      "trabalhista": "Direito do Trabalho",
      "compliance": "Compliance",
      "tributario": "Direito Tributário",
      "civil": "Direito Civil",
      "criminal": "Direito Criminal",
      "outros": "Outros Serviços"
    };
    return actionGroupMapping[actionType] || "Outros Serviços";
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Contrato Fechado':
        return 'bg-green-100 text-green-800';
      case 'Novo':
      case 'Proposta':
      case 'Reunião':
        return 'bg-blue-100 text-blue-800';
      case 'Perdido':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const groups = groupedLeads();
  const groupNames = Object.keys(groups);
  
  // CORREÇÃO: Mostrar agrupamento para todas as subcategorias que incluem ação E para perdas simples
  const shouldShowGrouping = (
    selectedCategory === "perdas" || 
    selectedCategory.includes("-tipo-acao") || 
    selectedCategory.includes("-grupo-acao")
  ) && groupNames.length > 1;

  console.log(`📊 GroupedLeadsList - shouldShowGrouping: ${shouldShowGrouping}, groups: ${groupNames.length}`);

  if (leads.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Nenhum lead encontrado</h3>
          <p>Tente ajustar os filtros ou categoria selecionada.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groupNames.map((groupName) => {
        const groupLeads = groups[groupName];
        const isExpanded = expandedGroups[groupName];

        if (!shouldShowGrouping) {
          // Não mostrar agrupamento, apenas a lista normal
          return groupLeads.map((lead) => (
            <Card 
              key={lead.id} 
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleLeadClick(lead)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-semibold text-gray-900">{lead.name}</h3>
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                    {lead.loss_reason && (
                      <Badge className="bg-gray-100 text-gray-800">
                        {lead.loss_reason}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <strong>Email:</strong> {lead.email || 'Não informado'}
                    </div>
                    <div>
                      <strong>Telefone:</strong> {lead.phone}
                    </div>
                    <div>
                      <strong>Estado:</strong> {lead.state || 'Não informado'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">{formatCurrency(lead.value)}</div>
                  <div className="text-sm text-gray-500">{formatDate(lead.created_at)}</div>
                </div>
              </div>
            </Card>
          ));
        }

        return (
          <div key={groupName} className="space-y-3">
            {/* Cabeçalho do grupo - caixa maior */}
            <Card 
              className="p-6 cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl"
              onClick={() => toggleGroup(groupName)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {isExpanded ? (
                    <ChevronDown className="h-6 w-6 text-gray-600" />
                  ) : (
                    <ChevronRight className="h-6 w-6 text-gray-600" />
                  )}
                  <h3 className="text-xl font-bold text-gray-900">
                    {groupName}
                  </h3>
                  <Badge className="bg-blue-100 text-blue-800 px-3 py-1 text-sm">
                    {groupLeads.length} lead{groupLeads.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  {isExpanded ? 'Clique para ocultar' : 'Clique para expandir'}
                </div>
              </div>
            </Card>

            {/* Leads do grupo (mostrados quando expandido) - tamanho reduzido */}
            {isExpanded && (
              <div className="ml-8 space-y-3">
                {groupLeads.map((lead) => (
                  <Card 
                    key={lead.id} 
                    className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-blue-500"
                    onClick={() => handleLeadClick(lead)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-semibold text-gray-900">{lead.name}</h3>
                          <Badge className={`text-xs ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </Badge>
                          {lead.loss_reason && selectedCategory.startsWith("perdas") && (
                            <Badge className="bg-gray-100 text-gray-800 text-xs">
                              {lead.loss_reason}
                            </Badge>
                          )}
                          {lead.action_type && (selectedCategory.includes("contratos") || selectedCategory.includes("oportunidades")) && (
                            <Badge className="bg-purple-100 text-purple-800 text-xs">
                              {getActionTypeLabel(lead.action_type)}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600">
                          <div>
                            <strong>Email:</strong> {lead.email || 'Não informado'}
                          </div>
                          <div>
                            <strong>Telefone:</strong> {lead.phone}
                          </div>
                          <div>
                            <strong>Estado:</strong> {lead.state || 'Não informado'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-green-600">{formatCurrency(lead.value)}</div>
                        <div className="text-xs text-gray-500">{formatDate(lead.created_at)}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
