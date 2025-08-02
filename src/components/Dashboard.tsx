import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, LayoutGrid, List, BarChart3, Settings, Bug } from "lucide-react";
import { useLeadsData } from "@/hooks/useLeadsData";
import { useKanbanColumns } from "@/hooks/useKanbanColumns";
import { useKanbanColumnManager } from "@/hooks/useKanbanColumnManager";
import { NewLeadForm } from "@/components/NewLeadForm";
import { KanbanView } from "@/components/KanbanView";
import { LeadsListView } from "@/components/LeadsListView";
import { DashboardContent } from "@/components/DashboardContent";
import { SettingsContent } from "@/components/SettingsContent";
import { LeadDetailsDialog } from "@/components/LeadDetailsDialog";
import { AddColumnDialog } from "@/components/AddColumnDialog";
import { LeadDebugPanel } from "@/components/LeadDebugPanel";
import { Lead } from "@/types/lead";
import { useToast } from "@/hooks/use-toast";

export function Dashboard() {
  const [activeView, setActiveView] = useState("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewLeadDialogOpen, setIsNewLeadDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  
  const { leads, isLoading, refreshData } = useLeadsData();
  const { columns } = useKanbanColumns();
  const { toast } = useToast();
  
  const {
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
      numericValue: lead.value ? Number(lead.value) : 0
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

  const handleLeadUpdated = () => {
    refreshData();
  };

  const handleNewLeadSuccess = () => {
    setIsNewLeadDialogOpen(false);
    refreshData();
    toast({
      title: "Sucesso",
      description: "Lead criado com sucesso!",
    });
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
              <p className="text-gray-600">Gerencie seus leads de forma eficiente</p>
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

        {isDebugPanelOpen && <LeadDebugPanel />}

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
                onLeadUpdated={handleLeadUpdated}
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
        onSuccess={handleNewLeadSuccess}
      />

      <LeadDetailsDialog
        lead={selectedLead}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        onLeadUpdated={handleLeadUpdated}
      />

      <AddColumnDialog
        open={isAddColumnDialogOpen}
        onOpenChange={handleCloseAddColumnDialog}
        onColumnAdded={handleColumnAdded}
        maxOrder={maxOrder}
      />
    </div>
  );
}
