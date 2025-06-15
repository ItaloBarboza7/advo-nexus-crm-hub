import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, LayoutGrid, List, Users } from "lucide-react";
import { KanbanView } from "@/components/KanbanView";
import { NewLeadForm } from "@/components/NewLeadForm";
import { LeadDetailsDialog } from "@/components/LeadDetailsDialog";
import { StatusChangeForm } from "@/components/StatusChangeForm";
import { EditLeadForm } from "@/components/EditLeadForm";
import { LeadFilters, FilterOptions } from "@/components/LeadFilters";
import { LeadsListView } from "@/components/LeadsListView";
import { DeleteLeadDialog } from "@/components/DeleteLeadDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";
import { useActionGroupsAndTypes } from "@/hooks/useActionGroupsAndTypes";

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order_position: number;
  is_default: boolean;
}

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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    status: [],
    source: [],
    valueRange: { min: null, max: null },
    state: [],
    actionType: []
  });
  const { toast } = useToast();
  const { validActionGroupNames } = useActionGroupsAndTypes();

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar leads:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os leads.",
          variant: "destructive"
        });
        return;
      }

      // Transform the data to match our Lead type by adding missing fields
      const transformedLeads: Lead[] = (data || []).map(lead => ({
        ...lead,
        company: undefined, // Handle optional fields that don't exist in database
        interest: undefined,
        lastContact: undefined,
        avatar: undefined
      }));

      setLeads(transformedLeads);
    } catch (error) {
      console.error('Erro inesperado ao buscar leads:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao carregar os leads.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKanbanColumns = async () => {
    try {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('order_position', { ascending: true });

      if (error) {
        console.error('Erro ao carregar colunas do Kanban:', error);
        return;
      }

      setKanbanColumns(data || []);
    } catch (error) {
      console.error('Erro inesperado ao carregar colunas:', error);
    }
  };

  const deleteLead = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) {
        console.error('Erro ao excluir lead:', error);
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

      fetchLeads();
    } catch (error) {
      console.error('Erro inesperado ao excluir lead:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao excluir o lead.",
        variant: "destructive"
      });
    }
  };

  const handleViewDetails = (lead: Lead) => {
    console.log("🔍 ClientsContent - handleViewDetails chamado com lead:", lead.name);
    setSelectedLead(lead);
    setIsDetailsDialogOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    console.log("✏️ ClientsContent - handleEditLead chamado com lead:", lead.name);
    console.log("📋 Lead completo:", lead);
    setSelectedLead(lead);
    setIsEditFormOpen(true);
    // Fechar o dialog de detalhes se estiver aberto
    setIsDetailsDialogOpen(false);
  };

  const handleEditStatus = (lead: Lead) => {
    console.log("🔄 ClientsContent - handleEditStatus chamado com lead:", lead.name);
    setSelectedLead(lead);
    setIsStatusFormOpen(true);
  };

  const handleDeleteLead = (leadId: string, leadName: string) => {
    setLeadToDelete({ id: leadId, name: leadName });
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteLead = () => {
    if (leadToDelete) {
      deleteLead(leadToDelete.id);
      setLeadToDelete(null);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchKanbanColumns();
  }, []);

  // Aplicar filtros e busca
  const filteredLeads = leads.filter(lead => {
    // Filtro de busca por texto
    const matchesSearch = searchTerm === "" || 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.phone && lead.phone.includes(searchTerm)) ||
      (lead.description && lead.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.state && lead.state.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtros específicos
    const matchesStatus = filters.status.length === 0 || filters.status.includes(lead.status);
    const matchesSource = filters.source.length === 0 || (lead.source && filters.source.includes(lead.source));
    const matchesState = filters.state.length === 0 || (lead.state && filters.state.includes(lead.state));

    // GARANTE tratamento consistente para leads SEM action_group: tratam como "Outros"
    const currentActionGroup = lead.action_group && lead.action_group.trim() !== "" 
      ? lead.action_group 
      : "Outros";
    
    // Agora também valida se o action group realmente existe
    const actionGroupFinal = validActionGroupNames.includes(currentActionGroup) ? currentActionGroup : "Outros";
    
    const matchesActionType = filters.actionType.length === 0 || filters.actionType.includes(actionGroupFinal);
    
    // Filtro de faixa de valor
    const leadValue = lead.value || 0;
    const matchesValueMin = filters.valueRange.min === null || leadValue >= filters.valueRange.min;
    const matchesValueMax = filters.valueRange.max === null || leadValue <= filters.valueRange.max;

    return matchesSearch && matchesStatus && matchesSource && matchesState && matchesActionType && matchesValueMin && matchesValueMax;
  });

  // Converter colunas do banco para o formato esperado pelo KanbanView
  const kanbanStatuses = kanbanColumns.map(column => ({
    id: column.name,
    title: column.name,
    color: `bg-blue-100 text-blue-800` // Pode ser customizado baseado na cor da coluna
  }));

  const getStatusColor = (status: string) => {
    const column = kanbanColumns.find(col => col.name === status);
    return column ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Transform leads for KanbanView component
  const transformedLeads = filteredLeads.map(lead => {
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
      // interest mostra corretamente "Outros" para grupo inválido
      interest: actionGroup,
      value: formatCurrency(lead.value),
      lastContact: formatDate(lead.created_at),
      avatar: getInitials(lead.name),
      originalId: lead.id,
      numericValue: lead.value || 0
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads</h1>
          <p className="text-gray-600">
            Gerencie seus leads e oportunidades de vendas
            {filteredLeads.length !== leads.length && (
              <span className="ml-2 text-blue-600 font-medium">
                ({filteredLeads.length} de {leads.length} leads)
              </span>
            )}
          </p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setIsNewLeadFormOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Lead
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4">
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
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            <p>Carregando leads...</p>
          </div>
        </Card>
      ) : viewMode === "kanban" ? (
        <KanbanView 
          leads={transformedLeads} 
          statuses={kanbanStatuses} 
          onLeadUpdated={fetchLeads}
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

      {filteredLeads.length === 0 && !isLoading && (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhum lead encontrado</h3>
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
        onOpenChange={setIsNewLeadFormOpen}
        onLeadCreated={fetchLeads}
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
        onStatusChanged={fetchLeads}
        kanbanColumns={kanbanColumns}
      />

      <EditLeadForm
        lead={selectedLead}
        open={isEditFormOpen}
        onOpenChange={setIsEditFormOpen}
        onLeadUpdated={fetchLeads}
      />

      <DeleteLeadDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        leadName={leadToDelete?.name || ""}
        onConfirm={confirmDeleteLead}
      />
    </div>
  );
}
