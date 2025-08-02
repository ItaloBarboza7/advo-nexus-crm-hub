import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KanbanView } from "./KanbanView";
import { LeadsListView } from "./LeadsListView";
import { NewLeadForm } from "./NewLeadForm";
import { EditLeadForm } from "./EditLeadForm";
import { LeadFilters } from "./LeadFilters";
import { GlobalSearch } from "./GlobalSearch";
import { Button } from "./ui/button";
import { Plus, Grid3X3, List, Download } from "lucide-react";
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
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedActionGroup, setSelectedActionGroup] = useState<string>("all");
  const [selectedActionType, setSelectedActionType] = useState<string>("all");
  const [selectedLossReason, setSelectedLossReason] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const { canAccessFeature } = useSubscriptionControl();
  const { toast } = useToast();

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["leads", searchTerm, selectedSource, selectedState, selectedStatus, selectedActionGroup, selectedActionType, selectedLossReason, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }

      if (selectedSource !== "all") {
        query = query.eq("source", selectedSource);
      }

      if (selectedState !== "all") {
        query = query.eq("state", selectedState);
      }

      if (selectedStatus !== "all") {
        query = query.eq("status", selectedStatus);
      }

      if (selectedActionGroup !== "all") {
        query = query.eq("action_group", selectedActionGroup);
      }

      if (selectedActionType !== "all") {
        query = query.eq("action_type", selectedActionType);
      }

      if (selectedLossReason !== "all") {
        query = query.eq("loss_reason", selectedLossReason);
      }

      if (dateRange.from) {
        query = query.gte("created_at", dateRange.from.toISOString());
      }

      if (dateRange.to) {
        query = query.lte("created_at", dateRange.to.toISOString());
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

  const handleDeleteLead = (lead: Lead) => {
    if (!canAccessFeature('delete_lead')) {
      toast({
        title: "Acesso Restrito",
        description: "Deletar leads requer uma assinatura ativa.",
        variant: "destructive",
      });
      return;
    }
    setDeletingLead(lead);
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
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar o status do lead.",
        variant: "destructive",
      });
    }
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

      <div className="space-y-4">
        <GlobalSearch 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        
        <LeadFilters
          selectedSource={selectedSource}
          setSelectedSource={setSelectedSource}
          selectedState={selectedState}
          setSelectedState={setSelectedState}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedActionGroup={selectedActionGroup}
          setSelectedActionGroup={setSelectedActionGroup}
          selectedActionType={selectedActionType}
          setSelectedActionType={setSelectedActionType}
          selectedLossReason={selectedLossReason}
          setSelectedLossReason={setSelectedLossReason}
          dateRange={dateRange}
          setDateRange={setDateRange}
        />
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
              leads={filteredData}
              onEditLead={handleEditLead}
              onDeleteLead={handleDeleteLead}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <LeadsListView
              leads={filteredData}
              onEditLead={handleEditLead}
              onDeleteLead={handleDeleteLead}
            />
          )}
        </SubscriptionProtectedWrapper>
      )}

      {/* Dialogs */}
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
        />
      )}

      {deletingLead && (
        <DeleteLeadDialog
          lead={deletingLead}
          open={!!deletingLead}
          onOpenChange={(open) => !open && setDeletingLead(null)}
        />
      )}

      {lossReasonLead && (
        <LossReasonDialog
          lead={lossReasonLead}
          open={!!lossReasonLead}
          onOpenChange={(open) => !open && setLossReasonLead(null)}
        />
      )}
    </div>
  );
}
