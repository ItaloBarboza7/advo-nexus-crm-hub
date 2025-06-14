import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Edit, Trash2, Users, Building, Columns, UserPlus, Settings, CreditCard, X, Check, Eye, EyeOff } from "lucide-react";
import { AddMemberModal } from "@/components/AddMemberModal";
import { EditMemberModal } from "@/components/EditMemberModal";
import { AddColumnDialog } from "@/components/AddColumnDialog";
import { AddActionGroupDialog } from "@/components/AddActionGroupDialog";
import { AddActionTypeDialog } from "@/components/AddActionTypeDialog";
import { AddLeadSourceDialog } from "@/components/AddLeadSourceDialog";
import { AddLossReasonDialog } from "@/components/AddLossReasonDialog";
import { EditCompanyModal } from "@/components/EditCompanyModal";
import { DeleteButton } from "@/components/DeleteButton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { useLossReasonsGlobal } from "@/hooks/useLossReasonsGlobal";
import { SubscriptionAndPaymentPanel } from "@/components/SubscriptionAndPaymentPanel";

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order_position: number;
  is_default: boolean;
}

interface DashboardComponent {
  id: string;
  name: string;
  description: string;
  visible: boolean;
}

export function SettingsContent() {
  const [activeTab, setActiveTab] = useState("company");
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [isAddColumnDialogOpen, setIsAddColumnDialogOpen] = useState(false);
  const [isAddActionGroupDialogOpen, setIsAddActionGroupDialogOpen] = useState(false);
  const [isAddActionTypeDialogOpen, setIsAddActionTypeDialogOpen] = useState(false);
  const [isAddLeadSourceDialogOpen, setIsAddLeadSourceDialogOpen] = useState(false);
  const [isAddLossReasonModalOpen, setIsAddLossReasonModalOpen] = useState(false);
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: "Maria Silva", email: "maria@empresa.com", role: "Atendimento - SDR", avatar: "MS" },
    { id: 2, name: "João Santos", email: "joao@empresa.com", role: "Fechamento - Closer", avatar: "JS" },
    { id: 3, name: "Ana Costa", email: "ana@empresa.com", role: "Atendimento - SDR", avatar: "AC" },
  ]);

  // Simulating admin check - in real implementation this would come from auth context
  const isAdmin = true; // This should be replaced with actual admin check logic

  // Estados para gerenciar colunas do Kanban
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [isLoadingColumns, setIsLoadingColumns] = useState(true);

  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");

  // Hook para configurações do dashboard
  const { components, toggleComponentVisibility } = useDashboardSettings();

  // Hook para informações da empresa
  const { companyInfo, isLoading: isLoadingCompany, updateCompanyInfo } = useCompanyInfo();

  // Usar o hook para obter os dados sincronizados
  const { 
    actionGroups = [], 
    actionTypes = [], 
    leadSources = [], 
    loading: optionsLoading,
    refreshData 
  } = useFilterOptions();

  // Hook global para motivos de perda
  const { 
    lossReasons, 
    loading: lossReasonsLoading, 
    updateLossReason,
    deleteLossReason,
    refreshData: refreshLossReasons
  } = useLossReasonsGlobal();

  // Estados para edição inline
  const [editingActionGroup, setEditingActionGroup] = useState<string | null>(null);
  const [editingActionType, setEditingActionType] = useState<string | null>(null);
  const [editingLeadSource, setEditingLeadSource] = useState<string | null>(null);
  const [editingLossReason, setEditingLossReason] = useState<string | null>(null);
  const [editingActionGroupName, setEditingActionGroupName] = useState("");
  const [editingActionTypeName, setEditingActionTypeName] = useState("");
  const [editingLeadSourceName, setEditingLeadSourceName] = useState("");
  const [editingLossReasonName, setEditingLossReasonName] = useState("");

  const { toast } = useToast();

  // Carregar colunas do banco de dados
  const fetchKanbanColumns = async () => {
    try {
      setIsLoadingColumns(true);
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('order_position', { ascending: true });

      if (error) {
        console.error('Erro ao carregar colunas do Kanban:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as colunas do Kanban.",
          variant: "destructive"
        });
        return;
      }
      setKanbanColumns(data || []);
      console.log(
        '[fetchKanbanColumns] Carregadas do banco:',
        (data || []).map(c => ({ id: c.id, name: c.name, order: c.order_position }))
      );
    } catch (error) {
      console.error('Erro inesperado ao carregar colunas:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao carregar as colunas.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingColumns(false);
    }
  };

  // Função robusta para normalizar a ordem das colunas do Kanban (corrigida)
  const normalizeKanbanOrder = async () => {
    setIsLoadingColumns(true);
    try {
      // Busca atualizado do banco para garantir a situação real
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('order_position', { ascending: true });

      if (error || !data) {
        console.error('Erro ao buscar colunas para normalizar ordem:', error);
        setIsLoadingColumns(false);
        return;
      }

      // Ordenação garantida só com colunas existentes
      for (let idx = 0; idx < data.length; idx++) {
        const col = data[idx];
        const newOrder = idx + 1;
        if (col.order_position !== newOrder) {
          console.log(`[NORMALIZAR] Atualizando coluna "${col.name}" [id: ${col.id}] de ${col.order_position} para ${newOrder}`);
          await supabase
            .from('kanban_columns')
            .update({ order_position: newOrder })
            .eq('id', col.id);
        }
      }

      // Após atualizar tudo, pega do banco novamente para garantir o estado certo na UI
      const { data: updated, error: fetchError } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('order_position', { ascending: true });

      if (fetchError || !updated) {
        console.error('Erro ao buscar colunas após normalização:', fetchError);
        setIsLoadingColumns(false);
        return;
      }

      setKanbanColumns(updated);
      console.log('[NORMALIZAR] NOVA ordem final:', updated.map(c => ({
        id: c.id,
        name: c.name,
        order_position: c.order_position,
      })));
      console.log('🔄 Finalizou normalização das colunas do Kanban');
    } catch (error) {
      console.error('Erro ao normalizar ordem das colunas:', error);
    } finally {
      setIsLoadingColumns(false);
    }
  };

  useEffect(() => {
    fetchKanbanColumns();
  }, []);

  // Atualizar dados quando o componente for montado ou a aba de configurações for ativada
  useEffect(() => {
    console.log(`🔄 SettingsContent - Componente montado/aba alterada: ${activeTab}`);
    if (activeTab === "configurations") {
      console.log(`🔄 SettingsContent - Aba "configurations" ativa, forçando refresh dos motivos de perda...`);
      refreshLossReasons();
    }
  }, [activeTab, refreshLossReasons]);

  // Define tabs based on admin status - Dashboard movido para segunda posição
  const allTabs = [
    { id: "company", title: "Empresa", icon: Building },
    { id: "dashboard", title: "Dashboard", icon: Building },
    { id: "team", title: "Equipe", icon: Users },
    { id: "kanban", title: "Quadro Kanban", icon: Columns },
    { id: "configurations", title: "Ações", icon: Settings },
  ];

  const tabs = isAdmin ? allTabs : allTabs.filter(tab => tab.id !== "company");

  const handleAddMember = (newMember: any) => {
    setTeamMembers(prev => [...prev, newMember]);
  };

  const handleEditMember = (member: any) => {
    setEditingMember(member);
    setIsEditMemberModalOpen(true);
  };

  const handleUpdateMember = (updatedMember: any) => {
    setTeamMembers(prev => prev.map(member => 
      member.id === updatedMember.id ? updatedMember : member
    ));
    setEditingMember(null);
  };

  const handleDeleteMember = (memberId: number) => {
    setTeamMembers(prev => prev.filter(member => member.id !== memberId));
    toast({
      title: "Membro removido",
      description: "O membro foi removido da equipe com sucesso.",
    });
  };

  const handleChangePaymentMethod = () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A alteração da forma de pagamento será implementada em breve.",
    });
  };

  const handleEditColumnName = (columnId: string, currentName: string) => {
    setEditingColumn(columnId);
    setEditingColumnName(currentName);
  };

  const handleSaveColumnName = async (columnId: string) => {
    if (!editingColumnName.trim()) {
      toast({
        title: "Erro",
        description: "O nome da coluna não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('kanban_columns')
        .update({ name: editingColumnName.trim() })
        .eq('id', columnId);

      if (error) {
        console.error('Erro ao atualizar coluna:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o nome da coluna.",
          variant: "destructive"
        });
        return;
      }

      // Atualizar na lista local
      setKanbanColumns(prev => prev.map(col => 
        col.id === columnId ? { ...col, name: editingColumnName.trim() } : col
      ));

      setEditingColumn(null);
      setEditingColumnName("");

      toast({
        title: "Sucesso",
        description: "Nome da coluna atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Erro inesperado ao atualizar coluna:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao atualizar a coluna.",
        variant: "destructive"
      });
    }
  };

  const handleCancelEditColumn = () => {
    setEditingColumn(null);
    setEditingColumnName("");
  };

  // Updated handleAddColumn: robust slot logic, force refresh after insert
  const handleAddColumn = async (columnData: { name: string; color: string; order: number }) => {
    try {
      setIsLoadingColumns(true);
      // Fetch latest columns for accurate placement!
      const { data: fresh, error: fetchErr } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('order_position', { ascending: true });
      if (fetchErr) {
        console.error('Erro ao buscar colunas para adicionar nova:', fetchErr);
        toast({
          title: "Erro",
          description: "Não foi possível acessar as colunas existentes.",
          variant: "destructive"
        });
        setIsLoadingColumns(false);
        return;
      }
      const currCols = fresh || [];

      // Normalize order (just in case)
      for (let idx = 0; idx < currCols.length; idx++) {
        if (currCols[idx].order_position !== idx + 1) {
          await supabase
            .from('kanban_columns')
            .update({ order_position: idx + 1 })
            .eq('id', currCols[idx].id);
        }
      }

      // Prepare columns that will shift right
      const columnsToUpdate = currCols.filter(col => col.order_position >= columnData.order);

      if (columnsToUpdate.length > 0) {
        // Update each column individually to increment their order position
        for (const column of columnsToUpdate) {
          const { error: updateError } = await supabase
            .from('kanban_columns')
            .update({ order_position: column.order_position + 1 })
            .eq('id', column.id);

          if (updateError) {
            console.error('Erro ao reordenar coluna:', updateError);
            toast({
              title: "Erro",
              description: "Não foi possível reordenar as colunas existentes.",
              variant: "destructive"
            });
            setIsLoadingColumns(false);
            return;
          }
        }
      }

      // Inserir nova coluna no slot correto (order_position)
      const { error: insertError } = await supabase
        .from('kanban_columns')
        .insert({
          name: columnData.name,
          color: columnData.color,
          order_position: columnData.order,
          is_default: false
        });

      if (insertError) {
        console.error('Erro ao criar coluna:', insertError);
        toast({
          title: "Erro",
          description: "Não foi possível criar a nova coluna.",
          variant: "destructive"
        });
        setIsLoadingColumns(false);
        return;
      }

      // Refresh from DB to establish reality (no ghosts!)
      await fetchKanbanColumns();
      toast({
        title: "Sucesso",
        description: "Nova coluna criada com sucesso.",
      });
    } catch (error) {
      console.error('Erro inesperado ao criar coluna:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao criar a coluna.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingColumns(false);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    try {
      // Deleta a coluna no banco
      const { error } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', columnId);

      if (error) {
        console.error('Erro ao excluir coluna:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir a coluna.",
          variant: "destructive"
        });
        return;
      }

      // Após exclusão, normaliza toda ordem no banco e recarrega estado
      await normalizeKanbanOrder();

      toast({
        title: "Sucesso",
        description: "Coluna excluída e ordem atualizada.",
      });
    } catch (error) {
      console.error('Erro inesperado ao excluir coluna:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao excluir a coluna.",
        variant: "destructive"
      });
    }
  };

  // Função utilitária para extrair campos do address concatenado
  function parseCompanyAddressFields(addr: string) {
    // Exemplo: "Rua dos Testes, 123, Bairro do Centro, Cidade Teste, Estado Teste, CEP: 12345-000"
    const result = {
      cep: "",
      address: "",
      neighborhood: "",
      city: "",
      state: "",
    };

    try {
      // Separar por vírgulas
      const parts = addr.split(",");
      // O último campo normalmente é "CEP: XXXXX-XXX"
      if (parts.length > 0) {
        const cepMatch = parts[parts.length - 1].match(/CEP[:\s]+([0-9\-]+)/i);
        if (cepMatch) {
          result.cep = cepMatch[1].trim();
          parts.pop(); // remove o CEP
        }
      }
      // Agora, os campos:
      // [address, neighborhood, city, state]
      if (parts[0]) result.address = parts[0].trim();
      if (parts[1]) result.neighborhood = parts[1].trim();
      if (parts[2]) result.city = parts[2].trim();
      if (parts[3]) result.state = parts[3].trim();
    } catch {
      // Caso não consiga fazer o parsing, deixa os campos vazios
    }
    return result;
  }

  // Função para gerenciar visibilidade dos componentes do dashboard
  const handleToggleComponentVisibility = (componentId: string) => {
    toggleComponentVisibility(componentId);
    
    const component = components.find(comp => comp.id === componentId);
    if (component) {
      toast({
        title: "Visibilidade alterada",
        description: `${component.name} foi ${component.visible ? 'ocultado' : 'exibido'}.`,
      });
    }
  };

  const handleCancelEditLossReason = () => {
    setEditingLossReason(null);
    setEditingLossReasonName("");
  };

  // Explicit handler to satisfy Promise<void> type for the dialog
  const handleRefreshLossReasons = async (): Promise<void> => {
    await refreshLossReasons();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações</h1>
        <p className="text-gray-600">Gerencie configurações do sistema, equipe e empresa</p>
      </div>

      {/* Tabs */}
      <Card className="p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2"
            >
              <tab.icon className="h-4 w-4" />
              {tab.title}
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "company" && renderCompanyTab()}
        {activeTab === "dashboard" && renderDashboardTab()}
        {activeTab === "team" && renderTeamTab()}
        {activeTab === "kanban" && renderKanbanTab()}
        {activeTab === "configurations" && renderConfigurationsTab()}
      </Card>

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onMemberAdded={handleAddMember}
      />

      <EditMemberModal
        isOpen={isEditMemberModalOpen}
        onClose={() => setIsEditMemberModalOpen(false)}
        member={editingMember}
        onMemberUpdated={handleUpdateMember}
      />

      <AddColumnDialog
        isOpen={isAddColumnDialogOpen}
        onClose={() => setIsAddColumnDialogOpen(false)}
        onAddColumn={handleAddColumn}
        maxOrder={kanbanColumns.length > 0 ? Math.max(...kanbanColumns.map(col => col.order_position)) : 0}
      />

      <AddActionGroupDialog
        isOpen={isAddActionGroupDialogOpen}
        onClose={() => setIsAddActionGroupDialogOpen(false)}
        onGroupAdded={refreshData}
      />

      <AddActionTypeDialog
        isOpen={isAddActionTypeDialogOpen}
        onClose={() => setIsAddActionTypeDialogOpen(false)}
        onTypeAdded={refreshData}
        actionGroups={actionGroups}
      />

      <AddLeadSourceDialog
        isOpen={isAddLeadSourceDialogOpen}
        onClose={() => setIsAddLeadSourceDialogOpen(false)}
        onSourceAdded={refreshData}
      />

      <AddLossReasonDialog
        isOpen={isAddLossReasonModalOpen}
        onClose={() => setIsAddLossReasonModalOpen(false)}
        onReasonAdded={handleRefreshLossReasons}
      />

      <EditCompanyModal
        isOpen={isEditCompanyModalOpen}
        onClose={() => setIsEditCompanyModalOpen(false)}
        companyInfo={companyInfo}
        onSave={updateCompanyInfo}
        isLoading={isLoadingCompany}
      />
    </div>
  );
}
