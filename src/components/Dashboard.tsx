import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, LayoutGrid, List, BarChart3, Settings, Bug } from "lucide-react";
import { useEnhancedLeadsData } from "@/hooks/useEnhancedLeadsData";
import { useKanbanColumns } from "@/hooks/useKanbanColumns";
import { useKanbanColumnManager } from "@/hooks/useKanbanColumnManager";
import { useEnhancedTenantLeadOperations } from "@/hooks/useEnhancedTenantLeadOperations";
import { NewLeadForm } from "@/components/NewLeadForm";
import { KanbanView } from "@/components/KanbanView";
import { LeadsListView } from "@/components/LeadsListView";
import { DashboardContent } from "@/components/DashboardContent";
import { SettingsContent } from "@/components/SettingsContent";
import { LeadDetailsDialog } from "@/components/LeadDetailsDialog";
import { AddColumnDialog } from "@/components/AddColumnDialog";
import { EnhancedLeadDebugPanel } from "@/components/EnhancedLeadDebugPanel";
import { DeleteLeadDialog } from "@/components/DeleteLeadDialog";
import { StatusChangeForm } from "@/components/StatusChangeForm";
import { Lead } from "@/types/lead";
import { useToast } from "@/hooks/use-toast";

export function Dashboard() {
  const [activeView, setActiveView] = useState("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewLeadDialogOpen, setIsNewLeadDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStatusChangeFormOpen, setIsStatusChangeFormOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingLead, setIsDeletingLead] = useState(false);
  
  // Enhanced hooks
  const { 
    leads, 
    isLoading, 
    refreshData, 
    updateLead,
    cacheInfo,
    isPolling,
    hasRealtimeConnection 
  } = useEnhancedLeadsData();
  
  const { columns } = useKanbanColumns();
  const { toast } = useToast();
  const { deleteLead } = useEnhancedTenantLeadOperations();
  
  const {
    columns: kanbanColumns,
    isAddColumnDialogOpen,
    maxOrder,
    handleOpenAddColumnDialog,
    handleCloseAddColumnDialog,
    handleColumnAdded
  } = useKanbanColumnManager();

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    const term = searchTerm.toLowerCase();
    return leads.filter(lead => 
      lead.name.toLowerCase().includes(term) ||
      lead.email?.toLowerCase().includes(term) ||
      lead.phone.toLowerCase().includes(term) ||
      lead.source?.toLowerCase().includes(term) ||
      lead.status.toLowerCase().includes(term) ||
      lead.action_group?.toLowerCase().includes(term) ||
      lead.action_type?.toLowerCase().includes(term)
    );
  }, [leads, searchTerm]);

  const transformedLeads = useMemo(() => {
    return filteredLeads.map(lead => ({
      id: lead.id,
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone,
      company: lead.description || '',
      source: lead.source || '',
      status: lead.status,
      interest: lead.action_group || 'Outros',
      value: lead.value ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(Number(lead.value)) : 'R$ 0,00',
      lastContact: new Intl.DateTimeFormat('pt-BR').format(new Date(lead.created_at)),
      avatar: lead.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      originalId: lead.id,
      numericValue: lead.value ? Number(lead.value) : 0,
      description: lead.description,
      state: lead.state,
      action_group: lead.action_group,
      action_type: lead.action_type
    }));
  }, [filteredLeads]);

  const statusConfigs = useMemo(() => {
    return columns.map(column => ({
      id: column.name,
      title: column.name,
      color: column.color
    }));
  }, [columns]);

  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailsDialogOpen(true);
  };

  const handleEditStatus = (lead: Lead) => {
    setSelectedLead(lead);
    setIsStatusChangeFormOpen(true);
  };

  const handleDeleteLead = (leadId: string, leadName: string) => {
    console.log(`🗑️ Dashboard - Initiating deletion of lead: ${leadName} (${leadId})`);
    setLeadToDelete({ id: leadId, name: leadName });
    setIsDeleteDialogOpen(true);
  };

  const handleLeadUpdated = async () => {
    console.log("🔄 Dashboard - Lead updated, refreshing data");
    await refreshData({ forceRefresh: true, source: 'lead_updated' });
  };

  const handleNewLeadCreated = async () => {
    console.log("🎉 Dashboard - New lead created callback triggered");
    const startTime = Date.now();
    
    setIsNewLeadDialogOpen(false);
    
    // Enhanced refresh with aggressive cache invalidation and verification
    try {
      console.log("🔄 Dashboard - Starting enhanced refresh after lead creation");
      
      await refreshData({ 
        forceRefresh: true, 
        source: 'new_lead_created'
      });
      
      const refreshTime = Date.now() - startTime;
      console.log(`✅ Dashboard - Enhanced refresh completed in ${refreshTime}ms`);
      
      toast({
        title: "Sucesso",
        description: "Lead criado com sucesso!",
      });
    } catch (error) {
      console.error("❌ Dashboard - Error during post-creation refresh:", error);
      toast({
        title: "Aviso",
        description: "Lead criado, mas pode levar alguns segundos para aparecer na lista.",
        variant: "default"
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return;
    
    console.log(`🗑️ Dashboard - Confirming deletion of lead: ${leadToDelete.name}`);
    setIsDeletingLead(true);
    
    try {
      const success = await deleteLead(leadToDelete.id);
      
      if (success) {
        // Close dialog immediately on success
        setIsDeleteDialogOpen(false);
        setLeadToDelete(null);
        
        // Enhanced refresh with immediate verification
        console.log("🔄 Dashboard - Starting refresh after lead deletion");
        await refreshData({ forceRefresh: true, source: 'lead_deleted' });
        
        console.log(`✅ Dashboard - Lead "${leadToDelete.name}" deleted successfully`);
        
        toast({
          title: "Sucesso",
          description: "Lead excluído com sucesso!",
        });
      } else {
        console.log(`❌ Dashboard - Failed to delete lead "${leadToDelete.name}"`);
      }
    } catch (error) {
      console.error('❌ Dashboard - Error deleting lead:', error);
    } finally {
      setIsDeletingLead(false);
    }
  };

  const handleDeleteCancel = () => {
    console.log("❌ Dashboard - Canceling lead deletion");
    setLeadToDelete(null);
    setIsDeleteDialogOpen(false);
    setIsDeletingLead(false);
  };

  const getStatusColor = (status: string) => {
    const column = columns.find(col => col.name === status);
    if (!column) return "bg-gray-100 text-gray-800";
    
    const colorMap: { [key: string]: string } = {
      '#3B82F6': 'bg-blue-100 text-blue-800',
      '#10B981': 'bg-green-100 text-green-800',
      '#F59E0B': 'bg-yellow-100 text-yellow-800',
      '#EF4444': 'bg-red-100 text-red-800',
      '#8B5CF6': 'bg-purple-100 text-purple-800',
      '#06B6D4': 'bg-cyan-100 text-cyan-800',
    };
    
    return colorMap[column.color] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(dateString));
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sistema CRM</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                <span>Gerencie seus leads de forma eficiente</span>
                {cacheInfo && (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    Cache: {Math.round((Date.now() - cacheInfo.timestamp) / 1000)}s ago
                  </span>
                )}
                {isPolling && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Polling ativo
                  </span>
                )}
                {hasRealtimeConnection && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    Real-time conectado
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsDebugPanelOpen(!isDebugPanelOpen)}
                variant="outline"
                size="sm"
              >
                <Bug className="h-4 w-4 mr-2" />
                Debug
              </Button>
              <Button onClick={() => setIsNewLeadDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Lead
              </Button>
            </div>
          </div>
        </div>

        {isDebugPanelOpen && <EnhancedLeadDebugPanel />}

        <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <TabsList className="grid w-full lg:w-auto grid-cols-4 lg:grid-cols-4">
                <TabsTrigger value="kanban" className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Lista
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configurações
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Buscar leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full lg:w-64"
                />
                {activeView === "kanban" && (
                  <Button 
                    variant="outline" 
                    onClick={handleOpenAddColumnDialog}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Coluna
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <TabsContent value="kanban" className="mt-0">
              <KanbanView
                leads={transformedLeads}
                statuses={statusConfigs}
                onLeadUpdated={handleLeadUpdated}
                onViewDetails={handleViewDetails}
                originalLeads={filteredLeads}
              />
            </TabsContent>

            <TabsContent value="list" className="mt-0">
              <LeadsListView
                leads={filteredLeads}
                onViewDetails={handleViewDetails}
                onEditStatus={handleEditStatus}
                onDeleteLead={handleDeleteLead}
                getStatusColor={getStatusColor}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
              />
            </TabsContent>

            <TabsContent value="dashboard" className="mt-0">
              <DashboardContent />
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <SettingsContent />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <NewLeadForm
        open={isNewLeadDialogOpen}
        onOpenChange={setIsNewLeadDialogOpen}
        onLeadCreated={handleNewLeadCreated}
      />

      <LeadDetailsDialog
        lead={selectedLead}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      />

      <AddColumnDialog
        isOpen={isAddColumnDialogOpen}
        onClose={handleCloseAddColumnDialog}
        onAddColumn={handleColumnAdded}
        maxOrder={maxOrder}
        columns={kanbanColumns}
      />

      <DeleteLeadDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        leadName={leadToDelete?.name || ""}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeletingLead}
      />

      <StatusChangeForm
        lead={selectedLead}
        open={isStatusChangeFormOpen}
        onOpenChange={setIsStatusChangeFormOpen}
        onStatusChanged={handleLeadUpdated}
      />
    </div>
  );
}
