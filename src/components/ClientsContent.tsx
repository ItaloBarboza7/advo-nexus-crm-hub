import { useState } from "react";
import { KanbanView } from "./KanbanView";
import { LeadsListView } from "./LeadsListView";
import { NewLeadForm } from "./NewLeadForm";
import { LeadFilters, FilterOptions } from "./LeadFilters";
import { GlobalSearch } from "./GlobalSearch";
import { Button } from "./ui/button";
import { Plus, Grid3X3, List } from "lucide-react";
import { Lead } from "@/types/lead";
import { DeleteLeadDialog } from "./DeleteLeadDialog";
import { LossReasonDialog } from "./LossReasonDialog";
import { useSubscriptionControl } from "@/hooks/useSubscriptionControl";
import { SubscriptionProtectedWrapper } from "./SubscriptionProtectedWrapper";
import { BlockedContent } from "./BlockedContent";
import { useToast } from "@/hooks/use-toast";
import { useLeadDialogs } from "@/hooks/useLeadDialogs";
import { LeadDialogs } from "./analysis/LeadDialogs";
import { useKanbanColumns } from "@/hooks/useKanbanColumns";
import { useEnhancedLeadsData } from "@/hooks/useEnhancedLeadsData";
import { useSimpleLeadOperations } from "@/hooks/useSimpleLeadOperations";

export function ClientsContent() {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
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
  const [isOpportunityMode, setIsOpportunityMode] = useState(false);

  const { canAccessFeature } = useSubscriptionControl();
  const { toast } = useToast();
  const { columns, isLoading: columnsLoading } = useKanbanColumns();
  
  // Use the enhanced leads data hook
  const { leads, isLoading, updateLead, refreshData } = useEnhancedLeadsData();
  
  // Use unified simple operations for delete operations only
  const { deleteLead } = useSimpleLeadOperations();
  
  const {
    selectedLead,
    isDetailsDialogOpen,
    setIsDetailsDialogOpen,
    isEditFormOpen,
    setIsEditFormOpen,
    handleViewDetails,
    handleEditLead,
    handleLeadUpdated
  } = useLeadDialogs();

  const filteredData = leads?.filter((lead) => {
    // Search filter
    const nameMatch = lead.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const statusMatch = activeFilters.status.length === 0 || activeFilters.status.includes(lead.status);
    
    // Source filter
    const sourceMatch = activeFilters.source.length === 0 || !lead.source || activeFilters.source.includes(lead.source);
    
    // State filter
    const stateMatch = activeFilters.state.length === 0 || !lead.state || activeFilters.state.includes(lead.state);
    
    // Action type filter
    const actionTypeMatch = activeFilters.actionType.length === 0 || !lead.action_type || activeFilters.actionType.includes(lead.action_type);
    
    // Value range filter
    const valueMatch = (!activeFilters.valueRange.min || (lead.value && lead.value >= activeFilters.valueRange.min)) &&
                      (!activeFilters.valueRange.max || (lead.value && lead.value <= activeFilters.valueRange.max));
    
    // Opportunity filter - only show leads in specific statuses when opportunity mode is active
    const opportunityMatch = !isOpportunityMode || ["Novo", "Proposta", "Reunião"].includes(lead.status);
    
    return nameMatch && statusMatch && sourceMatch && stateMatch && actionTypeMatch && valueMatch && opportunityMatch;
  });

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

  // Map columns to KanbanView status format, filtering based on opportunity mode
  const kanbanStatuses = columns
    .filter(column => !isOpportunityMode || ["Novo", "Proposta", "Reunião"].includes(column.name))
    .map(column => ({
      id: column.name,
      title: column.name,
      color: column.color || "bg-gray-100 text-gray-800"
    }));

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
    setIsOpportunityMode(!isOpportunityMode);
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
    const lead = filteredData?.find(l => l.id === leadId);
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
      const lead = filteredData?.find(l => l.id === leadId);
      if (lead) {
        setLossReasonLead(lead);
        return;
      }
    }
    
    const success = await updateLead(leadId, { status: newStatus, loss_reason: lossReason });
    if (!success) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do lead.",
        variant: "destructive",
      });
    }
  };

  // Enhanced callback for new lead creation with verification
  const handleNewLeadCreated = async () => {
    console.log('🎉 ClientsContent - New lead created callback triggered');
    setShowNewLeadForm(false);
    
    // Enhanced refresh with verification support
    await refreshData({ 
      forceRefresh: true, 
      source: 'new_lead_created'
    });
    
    console.log('✅ ClientsContent - Data refresh completed after lead creation');
  };

  const handleLeadUpdatedWrapper = () => {
    console.log('🔄 ClientsContent - Lead updated, refreshing data');
    refreshData({ forceRefresh: true, source: 'lead_updated' });
    handleLeadUpdated();
  };

  const handleFiltersChange = (filters: FilterOptions) => {
    setActiveFilters(filters);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLead) return;
    
    console.log('🗑️ ClientsContent - Confirming deletion of lead:', deletingLead.id);
    
    // Use the unified simple deleteLead function
    const success = await deleteLead(deletingLead.id);
    
    if (success) {
      console.log('✅ ClientsContent - Lead deleted successfully, refreshing data');
      setDeletingLead(null);
      refreshData({ forceRefresh: true, source: 'lead_deleted' });
    }
    // The toast is already shown by the hook useSimpleLeadOperations
  };

  const handleLossReasonConfirm = (reason: string) => {
    if (lossReasonLead) {
      handleStatusChange(lossReasonLead.id, "Perdido", reason);
      setLossReasonLead(null);
    }
  };

  const handleLossReasonCancel = () => {
    setLossReasonLead(null);
  };

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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-2"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="h-8 px-2"
            >
              <Grid3X3 className="h-4 w-4" />
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

      <div className="flex items-center gap-4 p-4 border rounded-lg bg-background">
        <div className="w-full max-w-md">
          <GlobalSearch onLeadSelect={handleViewDetails} />
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <LeadFilters
            onFiltersChange={handleFiltersChange}
            activeFilters={activeFilters}
          />
          
          <Button 
            variant={isOpportunityMode ? "default" : "outline"}
            onClick={handleOportunidadeClick}
            className="flex items-center gap-2"
          >
            Oportunidade
          </Button>
        </div>
      </div>

      {isLoading || columnsLoading ? (
        <div className="text-center">Carregando leads...</div>
      ) : !filteredData || filteredData.length === 0 ? (
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
              onLeadUpdated={() => refreshData({ forceRefresh: true, source: 'kanban_update' })}
              onViewDetails={handleViewDetails}
              originalLeads={filteredData || []}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <LeadsListView
              leads={filteredData || []}
              onViewDetails={handleViewDetails}
              onEditStatus={handleEditLead}
              onDeleteLead={handleDeleteLead}
              getStatusColor={getStatusColor}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
            />
          )}
        </SubscriptionProtectedWrapper>
      )}

      <NewLeadForm
        open={showNewLeadForm}
        onOpenChange={setShowNewLeadForm}
        onLeadCreated={handleNewLeadCreated}
      />

      <LeadDialogs
        selectedLead={selectedLead}
        isDetailsDialogOpen={isDetailsDialogOpen}
        setIsDetailsDialogOpen={setIsDetailsDialogOpen}
        isEditFormOpen={isEditFormOpen}
        setIsEditFormOpen={setIsEditFormOpen}
        onEditLead={handleEditLead}
        onLeadUpdated={handleLeadUpdatedWrapper}
      />

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
