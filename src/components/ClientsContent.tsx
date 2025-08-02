import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KanbanView } from "./KanbanView";
import { LeadsListView } from "./LeadsListView";
import { NewLeadForm } from "./NewLeadForm";
import { EditLeadForm } from "./EditLeadForm";
import { LeadFilters, FilterOptions } from "./LeadFilters";
import { GlobalSearch } from "./GlobalSearch";
import { Button } from "./ui/button";
import { Plus, Grid3X3, List, Download, Target } from "lucide-react";
import { Lead } from "@/types/lead";
import { DeleteLeadDialog } from "./DeleteLeadDialog";
import { LossReasonDialog } from "./LossReasonDialog";
import { useSubscriptionControl } from "@/hooks/useSubscriptionControl";
import { SubscriptionProtectedWrapper } from "./SubscriptionProtectedWrapper";
import { BlockedContent } from "./BlockedContent";
import { useToast } from "@/hooks/use-toast";

export function ClientsContent() {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [lossReasonLead, setLossReasonLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({
    status: [],
    source: [],
    valueRange: { min: null, max: null },
    state: [],
    actionType: []
  });

  const { canAccessFeature } = useSubscriptionControl();
  const { toast } = useToast();

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["leads", searchTerm, activeFilters],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }

      // Apply filters
      if (activeFilters.status.length > 0) {
        query = query.in("status", activeFilters.status);
      }

      if (activeFilters.source.length > 0) {
        query = query.in("source", activeFilters.source);
      }

      if (activeFilters.state.length > 0) {
        query = query.in("state", activeFilters.state);
      }

      if (activeFilters.actionType.length > 0) {
        query = query.in("action_type", activeFilters.actionType);
      }

      if (activeFilters.valueRange.min !== null) {
        query = query.gte("value", activeFilters.valueRange.min);
      }

      if (activeFilters.valueRange.max !== null) {
        query = query.lte("value", activeFilters.valueRange.max);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data as Lead[];
    },
  });

  const filteredData = data?.filter((lead) => {
    const nameMatch = lead.name.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch;
  });

  // Transform leads for KanbanView which expects numeric id and value
  const transformedLeads = filteredData?.map(lead => ({
    ...lead,
    id: lead.id, // Keep as string now since we fixed the interface
    email: lead.email || "",
    company: lead.company || "",
    source: lead.source || "",
    interest: lead.action_group || "",
    value: lead.value ? new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(lead.value) : "R$ 0,00",
    lastContact: lead.updated_at ? new Date(lead.updated_at).toLocaleDateString('pt-BR') : "",
    avatar: lead.name.charAt(0).toUpperCase(),
    originalId: lead.id,
    numericValue: lead.value || 0
  })) || [];

  // Define statuses for KanbanView
  const kanbanStatuses = [
    { id: "Novo", title: "Novo", color: "bg-gray-100 text-gray-800" },
    { id: "Proposta", title: "Proposta", color: "bg-gray-100 text-gray-800" },
    { id: "Reunião", title: "Reunião", color: "bg-gray-100 text-gray-800" },
    { id: "Contrato Fechado", title: "Contrato Fechado", color: "bg-gray-100 text-gray-800" },
    { id: "Perdido", title: "Perdido", color: "bg-gray-100 text-gray-800" },
    { id: "Finalizado", title: "Finalizado", color: "bg-gray-100 text-gray-800" }
  ];

  const handleCreateLead = () => {
    if (!canAccessFeature('create_lead')) {
      toast({
        title: "Acesso Restrito",
        description: "Criar leads requer uma assinatura ativa.",
        variant: "destructive",
      });
      return;
    }
    setShowNewLeadForm(true);
  };

  const handleOportunidadeClick = () => {
    // Placeholder for opportunity functionality
    toast({
      title: "Oportunidades",
      description: "Funcionalidade em desenvolvimento.",
    });
  };

  const handleEditLead = (lead: Lead) => {
    if (!canAccessFeature('edit_lead')) {
      toast({
        title: "Acesso Restrito", 
        description: "Editar leads requer uma assinatura ativa.",
        variant: "destructive",
      });
      return;
    }
    setEditingLead(lead);
  };

  const handleDeleteLead = (leadId: string, leadName: string) => {
    if (!canAccessFeature('delete_lead')) {
      toast({
        title: "Acesso Restrito",
        description: "Deletar leads requer uma assinatura ativa.",
        variant: "destructive",
      });
      return;
    }
    const lead = data?.find(l => l.id === leadId);
    if (lead) {
      setDeletingLead(lead);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string, lossReason?: string) => {
    if (!canAccessFeature('edit_lead')) {
      toast({
        title: "Acesso Restrito",
        description: "Alterar status requer uma assinatura ativa.",
        variant: "destructive",
      });
      return;
    }
    
    if (newStatus === "Perdido" && !lossReason) {
      const lead = data?.find(l => l.id === leadId);
      if (lead) {
        setLossReasonLead(lead);
        return;
      }
    }
    
    try {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus, loss_reason: lossReason })
        .eq("id", leadId);

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o status do lead.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Status do lead atualizado com sucesso.",
        });
        refetch();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar o status do lead.",
        variant: "destructive",
      });
    }
  };

  const handleLeadSelect = (lead: Lead) => {
    setEditingLead(lead);
  };

  const handleLeadUpdated = () => {
    refetch();
    setEditingLead(null);
  };

  const handleFiltersChange = (filters: FilterOptions) => {
    setActiveFilters(filters);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLead) return;
    
    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", deletingLead.id);

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível deletar o lead.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Lead deletado com sucesso.",
        });
        refetch();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao deletar o lead.",
        variant: "destructive",
      });
    }
  };

  const handleLossReasonConfirm = (reason: string) => {
    if (lossReasonLead) {
      handleStatusChange(lossReasonLead.id, "Perdido", reason);
    }
  };

  const handleLossReasonCancel = () => {
    setLossReasonLead(null);
  };

  // Helper functions for LeadsListView
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Novo": return "bg-blue-100 text-blue-800";
      case "Contato": return "bg-yellow-100 text-yellow-800";
      case "Qualificado": return "bg-purple-100 text-purple-800";
      case "Proposta": return "bg-orange-100 text-orange-800";
      case "Fechado": return "bg-green-100 text-green-800";
      case "Perdido": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            Gerencie seus leads e acompanhe o funil de vendas
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        <div className="flex-1">
          <GlobalSearch onLeadSelect={handleLeadSelect} />
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <LeadFilters
            onFiltersChange={handleFiltersChange}
            activeFilters={activeFilters}
          />
          
          <Button 
            variant="outline" 
            onClick={handleOportunidadeClick}
            className="flex items-center gap-2"
          >
            <Target className="h-4 w-4" />
            Oportunidade
          </Button>
          
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="h-8 px-2"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-2"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          <SubscriptionProtectedWrapper
            feature="create_lead"
            fallback={
              <Button onClick={handleCreateLead} disabled className="opacity-50">
                <Plus className="h-4 w-4 mr-2" />
                Novo Lead
              </Button>
            }
          >
            <Button onClick={handleCreateLead}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Lead
            </Button>
          </SubscriptionProtectedWrapper>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center">Carregando leads...</div>
      ) : error ? (
        <div className="text-center text-red-500">Erro ao carregar leads: {error.message}</div>
      ) : !data || data.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Nenhum lead encontrado</p>
        </div>
      ) : (
        <SubscriptionProtectedWrapper 
          feature="kanban_operations"
          fallback={<BlockedContent feature="kanban_operations" />}
        >
          {viewMode === 'kanban' ? (
            <KanbanView
              leads={transformedLeads}
              statuses={kanbanStatuses}
              onLeadUpdated={refetch}
              onViewDetails={handleEditLead}
              originalLeads={filteredData || []}
            />
          ) : (
            <LeadsListView
              leads={filteredData || []}
              onViewDetails={handleEditLead}
              onEditStatus={handleEditLead}
              onDeleteLead={handleDeleteLead}
              getStatusColor={getStatusColor}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
            />
          )}
        </SubscriptionProtectedWrapper>
      )}

      {showNewLeadForm && (
        <NewLeadForm
          open={showNewLeadForm}
          onOpenChange={setShowNewLeadForm}
        />
      )}

      {editingLead && (
        <EditLeadForm
          lead={editingLead}
          open={!!editingLead}
          onOpenChange={(open) => !open && setEditingLead(null)}
          onLeadUpdated={handleLeadUpdated}
        />
      )}

      {deletingLead && (
        <DeleteLeadDialog
          open={!!deletingLead}
          onOpenChange={(open) => !open && setDeletingLead(null)}
          leadName={deletingLead.name}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {lossReasonLead && (
        <LossReasonDialog
          open={!!lossReasonLead}
          onOpenChange={(open) => !open && setLossReasonLead(null)}
          onReasonSelected={handleLossReasonConfirm}
          onCancel={handleLossReasonCancel}
        />
      )}
    </div>
  );
}
