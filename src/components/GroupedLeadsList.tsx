
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { Lead } from "@/types/lead";

interface GroupedLeadsListProps {
  leads: Lead[];
  selectedCategory: string;
}

export function GroupedLeadsList({ leads, selectedCategory }: GroupedLeadsListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Agrupar leads por motivo de perda quando a categoria for "perdas"
  const groupedLeads = () => {
    if (selectedCategory !== "perdas") {
      return { "Todos os Leads": leads };
    }

    const groups = leads.reduce((acc, lead) => {
      const lossReason = lead.loss_reason || "Sem motivo especificado";
      if (!acc[lossReason]) {
        acc[lossReason] = [];
      }
      acc[lossReason].push(lead);
      return acc;
    }, {} as Record<string, Lead[]>);

    return groups;
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
        const showGrouping = selectedCategory === "perdas" && groupNames.length > 1;

        if (!showGrouping) {
          // Não mostrar agrupamento, apenas a lista normal
          return groupLeads.map((lead) => (
            <Card key={lead.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{lead.name}</h3>
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
                      <strong>Empresa:</strong> {lead.company || 'Não informado'}
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
          <div key={groupName} className="space-y-2">
            {/* Cabeçalho do grupo */}
            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-shadow bg-gray-50 border-2 border-gray-200"
              onClick={() => toggleGroup(groupName)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {groupName}
                  </h3>
                  <Badge className="bg-blue-100 text-blue-800">
                    {groupLeads.length} lead{groupLeads.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {isExpanded ? 'Clique para ocultar' : 'Clique para expandir'}
                </div>
              </div>
            </Card>

            {/* Leads do grupo (mostrados quando expandido) */}
            {isExpanded && (
              <div className="ml-6 space-y-3">
                {groupLeads.map((lead) => (
                  <Card key={lead.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{lead.name}</h3>
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <strong>Email:</strong> {lead.email || 'Não informado'}
                          </div>
                          <div>
                            <strong>Telefone:</strong> {lead.phone}
                          </div>
                          <div>
                            <strong>Empresa:</strong> {lead.company || 'Não informado'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">{formatCurrency(lead.value)}</div>
                        <div className="text-sm text-gray-500">{formatDate(lead.created_at)}</div>
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
