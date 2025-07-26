
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Grid3x3, List, Users, BarChart3 } from "lucide-react";
import { KanbanView } from "@/components/KanbanView";
import { LeadsListView } from "@/components/LeadsListView";
import { NewLeadForm } from "@/components/NewLeadForm";
import { LeadDetailsDialog } from "@/components/LeadDetailsDialog";
import { useSecureTenantData } from "@/hooks/useSecureTenantData";
import { Lead } from "@/types/lead";

type ViewType = "kanban" | "list";

interface TransformedLead {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: string;
  interest: string;
  value: string;
  lastContact: string;
  avatar: string;
  originalId: string;
  numericValue: number;
}

interface StatusConfig {
  id: string;
  title: string;
  color: string;
}

export function SecureTenantDashboard() {
  const { leads, columns, isLoading, error, fetchData, createLead, updateLead } = useSecureTenantData();
  const [currentView, setCurrentView] = useState<ViewType>("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewLeadFormOpen, setIsNewLeadFormOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadDetailsOpen, setIsLeadDetailsOpen] = useState(false);

  // Transform columns to status config
  const statusConfigs: StatusConfig[] = useMemo(() => {
    return columns.map(col => ({
      id: col.name,
      title: col.name,
      color: col.color
    }));
  }, [columns]);

  // Transform leads for the views
  const transformedLeads: TransformedLead[] = useMemo(() => {
    return leads
      .filter(lead => 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        lead.phone.includes(searchTerm)
      )
      .map((lead, index) => ({
        id: index + 1,
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone,
        company: lead.state || '',
        source: lead.source || '',
        status: lead.status,
        interest: lead.action_group || 'Outros',
        value: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(lead.value || 0),
        lastContact: new Date(lead.created_at).toLocaleDateString('pt-BR'),
        avatar: lead.name.charAt(0).toUpperCase(),
        originalId: lead.id,
        numericValue: lead.value || 0
      }));
  }, [leads, searchTerm]);

  const handleLeadUpdated = () => {
    console.log("🔄 SecureTenantDashboard - Lead updated, refreshing data...");
    fetchData();
  };

  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setIsLeadDetailsOpen(true);
  };

  const handleNewLead = async (leadData: any) => {
    const success = await createLead(leadData);
    if (success) {
      setIsNewLeadFormOpen(false);
    }
  };

  // Loading state
  if (isLoading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Erro ao carregar dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{error}</p>
            <Button onClick={fetchData} className="w-full">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Gerencie seus leads e acompanhe o pipeline de vendas</p>
        </div>
        <Button onClick={() => setIsNewLeadFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Lead
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos Fechados</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leads.filter(lead => lead.status === "Contrato Fechado").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leads.filter(lead => !["Novo", "Perdido", "Finalizado", "Contrato Fechado"].includes(lead.status)).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(leads.reduce((sum, lead) => sum + (lead.value || 0), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={currentView === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentView("kanban")}
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            Kanban
          </Button>
          <Button
            variant={currentView === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentView("list")}
          >
            <List className="h-4 w-4 mr-2" />
            Lista
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {currentView === "kanban" ? (
        <KanbanView
          leads={transformedLeads}
          statuses={statusConfigs}
          onLeadUpdated={handleLeadUpdated}
          onViewDetails={handleViewDetails}
          originalLeads={leads}
        />
      ) : (
        <LeadsListView
          leads={transformedLeads}
          onLeadUpdated={handleLeadUpdated}
          onViewDetails={handleViewDetails}
          originalLeads={leads}
        />
      )}

      {/* Dialogs */}
      <NewLeadForm
        open={isNewLeadFormOpen}
        onOpenChange={setIsNewLeadFormOpen}
        onLeadCreated={handleNewLead}
      />

      {selectedLead && (
        <LeadDetailsDialog
          lead={selectedLead}
          open={isLeadDetailsOpen}
          onOpenChange={setIsLeadDetailsOpen}
          onLeadUpdated={handleLeadUpdated}
        />
      )}
    </div>
  );
}
