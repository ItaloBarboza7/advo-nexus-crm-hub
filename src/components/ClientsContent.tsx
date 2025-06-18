import { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, LayoutGrid, List, Users, Settings } from "lucide-react";
import { KanbanView } from "@/components/KanbanView";
import { NewLeadForm } from "@/components/NewLeadForm";
import { LeadDetailsDialog } from "@/components/LeadDetailsDialog";
import { StatusChangeForm } from "@/components/StatusChangeForm";
import { EditLeadForm } from "@/components/EditLeadForm";
import { LeadFilters, FilterOptions } from "@/components/LeadFilters";
import { LeadsListView } from "@/components/LeadsListView";
import { DeleteLeadDialog } from "@/components/DeleteLeadDialog";
import { AddColumnDialog } from "@/components/AddColumnDialog";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { useLeadsData } from "@/hooks/useLeadsData";
import { useKanbanColumns } from "@/hooks/useKanbanColumns";
import { useKanbanColumnManager } from "@/hooks/useKanbanColumnManager";
import { useTenantSchema } from "@/hooks/useTenantSchema";
import { supabase } from "@/integrations/supabase/client";

export function ClientsContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [isNewLeadFormOpen, setIsNewLeadFormOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isStatusFormOpen, setIsStatusFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showOnlyOpportunities, setShowOnlyOpportunities] = useState(false);
  
  // Memoize filters to prevent recreation
  const [filters, setFilters] = useState<FilterOptions>(() => ({
    status: [],
    source: [],
    valueRange: { min: null, max: null },
    state: [],
    actionType: []
  }));
  
  const { toast } = useToast();
  const { actionGroupOptions } = useFilterOptions();
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();

  const { leads, isLoading, refreshData, updateLead } = useLeadsData();
  const { columns: kanbanColumns, refreshColumns, isLoading: kanbanLoading } = useKanbanColumns();
  
  // Novo hook para gerenciar adição de colunas
  const {
    isAddColumnDialogOpen,
    maxOrder,
    handleOpenAddColumnDialog,
    handleCloseAddColumnDialog,
    handleColumnAdded
  } = useKanbanColumnManager();

  // Memoize validActionGroupNames to prevent recreation
  const validActionGroupNames = useMemo(() => {
    return actionGroupOptions.map(option => option.value);
  }, [actionGroupOptions]);

  // Memoize handlers to prevent recreation
  const handleNewLeadClick = useCallback(() => {
    console.log("📝 ClientsContent - Abrindo formulário de novo lead");
    setIsNewLeadFormOpen(true);
  }, []);

  const handleNewLeadFormClose = useCallback((open: boolean) => {
    console.log("❌ ClientsContent - Fechando formulário de novo lead:", open);
    setIsNewLeadFormOpen(open);
  }, []);

  const handleLeadCreated = useCallback(() => {
    console.log("✅ ClientsContent - Lead criado, atualizando lista");
    refreshData();
  }, [refreshData]);

  const deleteLead = useCallback(async (leadId: string) => {
    try {
      console.log(`🗑️ ClientsContent - Deletando lead ${leadId} do esquema do tenant...`);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return;
      }

      const { error } = await supabase.rpc('exec_sql' as any, {
        sql: `DELETE FROM ${schema}.leads WHERE id = '${leadId}'`
      });

      if (error) {
        console.error('❌ Erro ao excluir lead:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o lead.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Lead excluído com sucesso.",
      });

      refreshData();
    } catch (error) {
      console.error('❌ Erro inesperado ao excluir lead:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao excluir o lead.",
        variant: "destructive"
      });
    }
  }, [tenantSchema, ensureTenantSchema, toast, refreshData]);

  const handleViewDetails = useCallback((lead: Lead) => {
    console.log("🔍 ClientsContent - handleViewDetails chamado com lead:", lead.name);
    setSelectedLead(lead);
    setIsDetailsDialogOpen(true);
  }, []);

  const handleEditLead = useCallback((lead: Lead) => {
    console.log("✏️ ClientsContent - handleEditLead chamado com lead:", lead.name);
    setSelectedLead(lead);
    setIsEditFormOpen(true);
    setIsDetailsDialogOpen(false);
  }, []);

  const handleEditStatus = useCallback((lead: Lead) => {
    console.log("🔄 ClientsContent - handleEditStatus chamado com lead:", lead.name);
    setSelectedLead(lead);
    setIsStatusFormOpen(true);
  }, []);

  const handleDeleteLead = useCallback((leadId: string, leadName: string) => {
    setLeadToDelete({ id: leadId, name: leadName });
    setIsDeleteDialogOpen(true);
  }, []);

  const confirmDeleteLead = useCallback(() => {
    if (leadToDelete) {
      deleteLead(leadToDelete.id);
      setLeadToDelete(null);
    }
  }, [leadToDelete, deleteLead]);

  const handleKanbanDataUpdated = useCallback(() => {
    console.log("🔄 ClientsContent - Dados do Kanban foram atualizados, refreshing dados...");
    refreshData();
  }, [refreshData]);

  // Memoize filtered leads to prevent unnecessary recalculations
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = searchTerm === "" || 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.phone && lead.phone.includes(searchTerm)) ||
        (lead.description && lead.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.state && lead.state.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = filters.status.length === 0 || filters.status.includes(lead.status);
      const matchesSource = filters.source.length === 0 || (lead.source && filters.source.includes(lead.source));
      const matchesState = filters.state.length === 0 || (lead.state && filters.state.includes(lead.state));

      const currentActionGroup = lead.action_group && lead.action_group.trim() !== "" 
        ? lead.action_group 
        : "Outros";
      
      const actionGroupFinal = validActionGroupNames.includes(currentActionGroup) ? currentActionGroup : "Outros";
      const matchesActionType = filters.actionType.length === 0 || filters.actionType.includes(actionGroupFinal);
      
      const leadValue = lead.value || 0;
      const matchesValueMin = filters.valueRange.min === null || leadValue >= filters.valueRange.min;
      const matchesValueMax = filters.valueRange.max === null || leadValue <= filters.valueRange.max;

      return matchesSearch && matchesStatus && matchesSource && matchesState && matchesActionType && matchesValueMin && matchesValueMax;
    });
  }, [leads, searchTerm, filters, validActionGroupNames]);

  // Memoize kanban statuses to prevent recreation - AGORA USANDO APENAS DADOS DO TENANT
  const kanbanStatuses = useMemo(() => {
    console.log("🔧 ClientsContent - Criando kanbanStatuses com colunas DO TENANT:", kanbanColumns.map(c => c.name));
    return kanbanColumns.map(column => ({
      id: column.name,
      title: column.name,
      color: `bg-blue-100 text-blue-800`
    }));
  }, [kanbanColumns]);

  const opportunityStatuses = useMemo(() => ["Novo", "Proposta", "Reunião"], []);
  
  const filteredKanbanStatuses = useMemo(() => {
    return showOnlyOpportunities
      ? kanbanStatuses.filter(status => opportunityStatuses.includes(status.id))
      : kanbanStatuses;
  }, [kanbanStatuses, showOnlyOpportunities, opportunityStatuses]);

  // Memoize helper functions to prevent recreation
  const getStatusColor = useCallback((status: string) => {
    const column = kanbanColumns.find(col => col.name === status);
    return column ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
  }, [kanbanColumns]);

  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }, []);

  const formatCurrency = useCallback((value: number | null) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }, []);

  // Memoize transformed leads to prevent unnecessary recalculations
  const transformedLeads = useMemo(() => {
    return filteredLeads.map(lead => {
      const actionGroupRaw = lead.action_group && lead.action_group.trim() !== "" ? lead.action_group : "Outros";
      const actionGroup = validActionGroupNames.includes(actionGroupRaw) ? actionGroupRaw : "Outros";
      return {
        id: parseInt(lead.id.replace(/-/g, '').slice(0, 8), 16),
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone,
        company: lead.state || 'Não informado',
        source: lead.source || 'Não informado',
        status: lead.status,
        interest: actionGroup,
        value: formatCurrency(lead.value),
        lastContact: formatDate(lead.created_at),
        avatar: getInitials(lead.name),
        originalId: lead.id,
        numericValue: lead.value || 0
      };
    });
  }, [filteredLeads, validActionGroupNames, formatCurrency, formatDate, getInitials]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads</h1>
          <p className="text-gray-600">
            Gerencie seus leads e oportunidades de vendas (dados privados do tenant)
            {filteredLeads.length !== leads.length && (
              <span className="ml-2 text-blue-600 font-medium">
                ({filteredLeads.length} de {leads.length} leads)
              </span>
            )}
          </p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleNewLeadClick}
          disabled={isNewLeadFormOpen}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Lead
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, email, telefone, estado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <LeadFilters
            onFiltersChange={setFilters}
            activeFilters={filters}
          />
          <div className="flex gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4 mr-2" />
              Lista
            </Button>
            <Button
              variant={viewMode === "kanban" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban
            </Button>
            {viewMode === "kanban" && (
              <>
                <Button
                  variant={showOnlyOpportunities ? "default" : "outline"}
                  size="sm"
                  className={showOnlyOpportunities ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                  onClick={() => setShowOnlyOpportunities(v => !v)}
                >
                  Oportunidades
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAddColumnDialog}
                  title="Adicionar nova coluna do Kanban (privada do tenant)"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Colunas
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {isLoading || kanbanLoading ? (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            <p>Carregando leads do tenant...</p>
          </div>
        </Card>
      ) : viewMode === "kanban" ? (
        <KanbanView 
          leads={transformedLeads} 
          statuses={filteredKanbanStatuses} 
          onLeadUpdated={handleKanbanDataUpdated}
          onViewDetails={handleViewDetails}
          originalLeads={filteredLeads}
        />
      ) : (
        <LeadsListView
          leads={filteredLeads}
          onViewDetails={handleViewDetails}
          onEditStatus={handleEditStatus}
          onDeleteLead={handleDeleteLead}
          getStatusColor={getStatusColor}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
        />
      )}

      {filteredLeads.length === 0 && !isLoading && !kanbanLoading && (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhum lead encontrado no tenant</h3>
            <p>
              {searchTerm || filters.status.length > 0 || filters.source.length > 0 || filters.state.length > 0 || filters.actionType.length > 0 || filters.valueRange.min !== null || filters.valueRange.max !== null
                ? "Tente ajustar os filtros de busca." 
                : "Comece criando seu primeiro lead."
              }
            </p>
          </div>
        </Card>
      )}

      <NewLeadForm 
        open={isNewLeadFormOpen} 
        onOpenChange={handleNewLeadFormClose}
        onLeadCreated={handleLeadCreated}
      />

      <LeadDetailsDialog
        lead={selectedLead}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        onEditLead={handleEditLead}
      />

      <StatusChangeForm
        lead={selectedLead}
        open={isStatusFormOpen}
        onOpenChange={setIsStatusFormOpen}
        onStatusChanged={handleKanbanDataUpdated}
      />

      <EditLeadForm
        lead={selectedLead}
        open={isEditFormOpen}
        onOpenChange={setIsEditFormOpen}
        onLeadUpdated={handleKanbanDataUpdated}
      />

      <DeleteLeadDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        leadName={leadToDelete?.name || ""}
        onConfirm={confirmDeleteLead}
      />

      <AddColumnDialog
        isOpen={isAddColumnDialogOpen}
        onClose={handleCloseAddColumnDialog}
        onAddColumn={handleColumnAdded}
        maxOrder={maxOrder}
      />
    </div>
  );
}
