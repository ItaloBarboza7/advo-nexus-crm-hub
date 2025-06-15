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
  const [isAddLossReasonDialogOpen, setIsAddLossReasonDialogOpen] = useState(false);
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

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
    deleteLossReason,
    refreshData: refreshLossReasons
  } = useLossReasonsGlobal();

  const { toast } = useToast();

  // Função para carregar membros da equipe
  const fetchTeamMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('parent_user_id', user.id);

      if (error) throw error;

      const members = profiles.map(profile => ({
        id: profile.user_id, // Member's user_id from auth.users
        profile_id: profile.id, // The UUID of the profile row itself
        name: profile.name,
        email: profile.email,
        role: profile.title,
        avatar: profile.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'N/A',
      }));

      setTeamMembers(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast({
        title: "Erro ao buscar membros",
        description: (error as Error).message || "Não foi possível carregar os membros da equipe.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMembers(false);
    }
  };

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
    if (activeTab === "team") {
      fetchTeamMembers();
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

  const handleAddMember = () => {
    fetchTeamMembers();
  };

  const handleEditMember = (member: any) => {
    setEditingMember(member);
    setIsEditMemberModalOpen(true);
  };

  const handleUpdateMember = async (updatedMember: any) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          name: updatedMember.name,
          email: updatedMember.email,
          title: updatedMember.role,
        })
        .eq('user_id', updatedMember.id);

      if (error) throw error;
      
      // The modal currently calls onMemberUpdated, which triggers this function.
      // We are overriding the local state update with a DB call.
      // The toast from EditMemberModal will still fire.
      
      fetchTeamMembers(); // Refetch to display updated data
    } catch(error) {
      console.error("Error updating member:", error);
      toast({
        title: "Erro ao atualizar membro",
        description: "Ocorreu um erro ao atualizar os dados do membro.",
        variant: "destructive",
      });
    }
    setEditingMember(null);
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-member', {
        body: { memberId },
      });

      if (error) {
        throw new Error(error.message);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Membro removido com sucesso",
        description: `O membro ${memberName} foi removido permanentemente.`,
      });

      fetchTeamMembers();
    } catch (error) {
      console.error("Error deleting member:", error);
      toast({
        title: "Erro ao remover membro",
        description: (error as Error).message || "Não foi possível remover o membro da equipe.",
        variant: "destructive",
      });
    }
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

  const renderDashboardTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Configurações do Dashboard</h3>
        <p className="text-sm text-gray-600">Gerencie a visibilidade dos componentes do dashboard</p>
      </div>
      
      <Card className="p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Componentes Disponíveis</h4>
        <div className="space-y-4">
          {components.map((component) => (
            <div key={component.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <h5 className="font-medium text-gray-900">{component.name}</h5>
                <p className="text-sm text-gray-600">{component.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${component.visible ? 'text-green-600' : 'text-gray-600'}`}>
                  {component.visible ? 'Visível' : 'Oculto'}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleToggleComponentVisibility(component.id)}
                >
                  {component.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderCompanyTab = () => {
    // Extrair os campos do companyInfo
    let extracted = {
      cep: "",
      address: "",
      neighborhood: "",
      city: "",
      state: "",
    };
    if (companyInfo && companyInfo.address) {
      extracted = parseCompanyAddressFields(companyInfo.address);
    }
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Configurações e Pagamento</h3>
        
        {/* Company Information */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Informações da Empresa</h4>
            <Button 
              variant="outline"
              onClick={() => setIsEditCompanyModalOpen(true)}
              disabled={isLoadingCompany}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
          
          {isLoadingCompany ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Carregando informações da empresa...</p>
            </div>
          ) : companyInfo ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome/Razão Social
                  </label>
                  <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-md">
                    {companyInfo.company_name}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF/CNPJ
                  </label>
                  <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-md">
                    {companyInfo.cnpj}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-md">
                    {companyInfo.phone}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail
                  </label>
                  <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-md">
                    {companyInfo.email}
                  </div>
                </div>
                {/* NOVOS CAMPOS EXTRAPOLADOS */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CEP
                  </label>
                  <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-md">
                    {extracted.cep}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endereço
                  </label>
                  <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-md">
                    {extracted.address}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bairro
                  </label>
                  <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-md">
                    {extracted.neighborhood}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cidade
                  </label>
                  <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-md">
                    {extracted.city}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-md">
                    {extracted.state}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Nenhuma informação da empresa encontrada.</p>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setIsEditCompanyModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Informações
              </Button>
            </div>
          )}
        </Card>

        {/* Subscription and Payment Panel (Stripe) */}
        <SubscriptionAndPaymentPanel />
      </div>
    );
  };

  const renderTeamTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Membros da Equipe</h3>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setIsAddMemberModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Membro
        </Button>
      </div>
      {isLoadingMembers ? (
        <Card className="p-6 text-center">
          <p className="text-gray-500">Carregando membros da equipe...</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {teamMembers.length > 0 ? teamMembers.map((member) => (
            <Card key={member.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-semibold">
                    {member.avatar}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{member.name}</h4>
                    <p className="text-sm text-gray-600">{member.email}</p>
                  </div>
                  <Badge variant="outline">{member.role}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditMember(member)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <DeleteButton
                    onDelete={() => handleDeleteMember(member.id, member.name)}
                    itemName={member.name}
                    itemType="membro da equipe"
                    size="sm"
                    variant="outline"
                  />
                </div>
              </div>
            </Card>
          )) : (
            <Card className="p-6 text-center">
              <p className="text-gray-500">Nenhum membro na equipe ainda. Adicione o primeiro!</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );

  const renderKanbanTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Colunas do Kanban</h3>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setIsAddColumnDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Coluna
        </Button>
      </div>
      
      {isLoadingColumns ? (
        <Card className="p-6 text-center">
          <p className="text-gray-500">Carregando colunas...</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {kanbanColumns.map((column) => (
            <Card key={column.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: column.color }}
                  ></div>
                  <div className="flex-1">
                    {editingColumn === column.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingColumnName}
                          onChange={(e) => setEditingColumnName(e.target.value)}
                          className="max-w-xs"
                          placeholder="Nome da coluna"
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleSaveColumnName(column.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleCancelEditColumn}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <h4 className="font-medium text-gray-900">{column.name}</h4>
                        <p className="text-sm text-gray-600">Posição: {column.order_position}</p>
                      </div>
                    )}
                  </div>
                </div>
                {editingColumn !== column.id && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditColumnName(column.id, column.name)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!column.is_default && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteColumn(column.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderConfigurationsTab = () => {
    console.log('🔄 SettingsContent - Renderizando aba Configurações/Ações');
    console.log(`📊 SettingsContent - Estados de loading: optionsLoading=${optionsLoading}, lossReasonsLoading=${lossReasonsLoading}`);
    console.log(`📊 SettingsContent - Dados carregados: actionGroups=${actionGroups.length}, actionTypes=${actionTypes.length}, leadSources=${leadSources.length}, lossReasons=${lossReasons.length}`);
    
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Configurações do Sistema</h3>
        
        {/* Grupos e Tipos de Ação - Painel Unificado */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Grupos e Tipos de Ação</h4>
            <div className="flex gap-2">
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setIsAddActionGroupDialogOpen(true)}
                disabled={optionsLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Grupo
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setIsAddActionTypeDialogOpen(true)}
                disabled={optionsLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Tipo
              </Button>
            </div>
          </div>
          
          {optionsLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Carregando grupos e tipos de ação...</p>
            </div>
          ) : (
            <ScrollArea className="h-96 w-full rounded-md border p-4">
              <Accordion type="single" collapsible className="w-full">
                {actionGroups.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Nenhum grupo de ação encontrado.</p>
                  </div>
                ) : (
                  actionGroups.map((group) => {
                    const groupActionTypes = actionTypes.filter(type => type.action_group_id === group.id);
                    
                    return (
                      <AccordionItem key={group.id} value={group.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full mr-4">
                            <div className="flex items-center gap-3">
                              <div>
                                <h5 className="font-medium text-gray-900 text-left">{group.description || group.name}</h5>
                                <p className="text-sm text-gray-600 text-left">{groupActionTypes.length} tipos de ação</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteActionGroup(group.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pl-4">
                            {groupActionTypes.length === 0 ? (
                              <p className="text-sm text-gray-500 italic">Nenhum tipo de ação encontrado para este grupo</p>
                            ) : (
                              groupActionTypes.map((type) => (
                                <div key={type.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <h6 className="font-medium text-gray-900">
                                        {type.name.split('-').map(word => 
                                          word.charAt(0).toUpperCase() + word.slice(1)
                                        ).join(' ')}
                                      </h6>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleDeleteActionType(type.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })
                )}
              </Accordion>
            </ScrollArea>
          )}
        </Card>

        {/* Fontes de Leads */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Fontes de Leads</h4>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setIsAddLeadSourceDialogOpen(true)}
              disabled={optionsLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Fonte
            </Button>
          </div>
          
          {optionsLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Carregando fontes de leads...</p>
            </div>
          ) : (
            <ScrollArea className="h-64 w-full rounded-md border p-4">
              <div className="space-y-3">
                {leadSources.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Nenhuma fonte de lead encontrada.</p>
                  </div>
                ) : (
                  leadSources.map((source) => (
                    <div key={source.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{source.label}</h5>
                        </div>
                        <div className="flex gap-2">
                          <DeleteButton
                            onDelete={() => handleDeleteLeadSource(source.id)}
                            itemName={source.label}
                            itemType="fonte"
                            size="sm"
                            variant="outline"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </Card>

        {/* SIMPLIFIED LOSS REASONS PANEL */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Tipos de Perdas</h4>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setIsAddLossReasonDialogOpen(true)}
              disabled={lossReasonsLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Motivo
            </Button>
          </div>
          
          {lossReasonsLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Carregando motivos de perda...</p>
            </div>
          ) : (
            <ScrollArea className="h-64 w-full rounded-md border p-4">
              <div className="space-y-3">
                {lossReasons.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Nenhum motivo de perda encontrado.</p>
                    <Button 
                      variant="outline"
                      onClick={refreshLossReasons}
                      className="mt-2"
                    >
                      🔄 Tentar Novamente
                    </Button>
                  </div>
                ) : (
                  lossReasons.map((reason) => (
                    <div key={reason.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div>
                            <h5 className="font-medium text-gray-900">{reason.reason}</h5>
                            {reason.is_fixed && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                Sistema
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!reason.is_fixed && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteLossReason(reason.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </Card>
      </div>
    );
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
        isOpen={isAddLossReasonDialogOpen}
        onClose={() => setIsAddLossReasonDialogOpen(false)}
        onReasonAdded={refreshLossReasons}
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
