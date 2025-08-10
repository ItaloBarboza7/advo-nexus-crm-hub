import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Edit, Trash2, Users, Building, Columns, UserPlus, Settings, X, Check, Eye, EyeOff } from "lucide-react";
import { AddMemberModal } from "@/components/AddMemberModal";
import { EditMemberModal } from "@/components/EditMemberModal";
import { AddColumnDialog } from "@/components/AddColumnDialog";
import { AddActionGroupDialog } from "@/components/AddActionGroupDialog";
import { AddActionTypeDialog } from "@/components/AddActionTypeDialog";
import { AddLeadSourceDialog } from "@/components/AddLeadSourceDialog";
import { AddLossReasonDialog } from "@/components/AddLossReasonDialog";
import { EditCompanyModal } from "@/components/EditCompanyModal";
import { DeleteButton } from "@/components/DeleteButton";
import { supabase } from "@/integrations/supabase/client";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { useLossReasonsGlobal } from "@/hooks/useLossReasonsGlobal";
import { useTenantSchema } from "@/hooks/useTenantSchema";
import { SubscriptionAndPaymentPanel } from "@/components/SubscriptionAndPaymentPanel";
import { useKanbanColumnManager } from "@/hooks/useKanbanColumnManager";
import { TeamGoalsSettings } from "@/components/TeamGoalsSettings";

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

  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");

  // Use the new hook for Kanban column management
  const {
    columns: kanbanColumns,
    isAddColumnDialogOpen,
    maxOrder,
    handleOpenAddColumnDialog,
    handleCloseAddColumnDialog,
    handleColumnAdded
  } = useKanbanColumnManager();

  // Hook para configurações do dashboard
  const { components, toggleComponentVisibility } = useDashboardSettings();

  // Hook para informações da empresa
  const { companyInfo, isLoading: isLoadingCompany, updateCompanyInfo } = useCompanyInfo();

  // Hook para esquema do tenant
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();

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
    } finally {
      setIsLoadingMembers(false);
    }
  };

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
    console.log(`[SettingsContent] Membro atualizado via modal:`, updatedMember);
    
    // A atualização já foi feita pela Edge Function no EditMemberModal
    // Agora só precisamos atualizar a lista local e recarregar os dados
    setEditingMember(null);
    
    // Recarregar a lista de membros para refletir as mudanças
    fetchTeamMembers();
    
    // Toast já foi exibido no EditMemberModal
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

      fetchTeamMembers();
    } catch (error) {
      console.error("Error deleting member:", error);
    }
  };

  const handleChangePaymentMethod = () => {
    // Functionality will be implemented soon
  };

  const handleEditColumnName = (columnId: string, currentName: string) => {
    setEditingColumn(columnId);
    setEditingColumnName(currentName);
  };

  const handleSaveColumnName = async (columnId: string) => {
    if (!editingColumnName.trim()) {
      return;
    }

    try {
      console.log(`💾 SettingsContent - Atualizando nome da coluna ${columnId} SOMENTE no esquema do tenant...`);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return;
      }

      // SEMPRE usar o esquema do tenant - nunca a tabela global
      const { error } = await supabase.rpc('exec_sql' as any, {
        sql: `UPDATE ${schema}.kanban_columns SET name = '${editingColumnName.trim()}' WHERE id = '${columnId}'`
      });

      if (error) {
        console.error('❌ Erro ao atualizar coluna do tenant:', error);
        return;
      }

      setEditingColumn(null);
      setEditingColumnName("");

      console.log('✅ SettingsContent - Nome da coluna atualizado com sucesso no esquema do tenant');

      // Refresh columns after update
      handleColumnAdded();
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar coluna do tenant:', error);
    }
  };

  const handleCancelEditColumn = () => {
    setEditingColumn(null);
    setEditingColumnName("");
  };

  const handleDeleteColumn = async (columnId: string) => {
    try {
      console.log(`🗑️ SettingsContent - Deletando coluna ${columnId} SOMENTE do esquema do tenant...`);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return;
      }

      // Deleta a coluna no esquema do tenant
      const { error } = await supabase.rpc('exec_sql' as any, {
        sql: `DELETE FROM ${schema}.kanban_columns WHERE id = '${columnId}'`
      });

      if (error) {
        console.error('❌ Erro ao excluir coluna do tenant:', error);
        return;
      }

      console.log('✅ SettingsContent - Coluna excluída com sucesso do esquema do tenant');

      // Refresh columns after deletion
      handleColumnAdded();
    } catch (error) {
      console.error('❌ Erro inesperado ao excluir coluna do tenant:', error);
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

        {/* Subscription Plan */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Plano de Assinatura</h4>
          </div>
          
          <div className="space-y-4">
            <div>
              <h5 className="font-bold mb-2">Plano selecionado</h5>
              <SubscriptionAndPaymentPanel />
            </div>
          </div>
        </Card>
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
          onClick={handleOpenAddColumnDialog}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Coluna
        </Button>
      </div>
      
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
                  leadSources.map((source: any) => (
                    <div key={source.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 flex items-center gap-2">
                          <h5 className="font-medium text-gray-900">{source.label}</h5>
                          {!source.user_id && (
                            <span className="ml-2 text-xs text-gray-400">(padrão)</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <DeleteButton
                            onDelete={() => handleDeleteLeadSource(source.id)}
                            itemName={source.label}
                            itemType="fonte de lead"
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

        {/* NOVO: Painel de Metas da Equipe */}
        <TeamGoalsSettings />
      </div>
    );
  };

  // --- Handler atualizado para deletar/ocultar fonte de lead ---
  const handleDeleteLeadSource = async (sourceId: string) => {
    // Descobre a fonte no array atual para verificar user_id
    const source = leadSources.find((s: any) => s.id === sourceId);
    if (!source) {
      return;
    }
    if (!source.user_id) {
      // Global: oculta para o tenant usando hidden_default_items
      const { error } = await supabase
        .from('hidden_default_items')
        .insert({
          item_id: source.id,
          item_type: 'lead_source',
          // user_id será setado automaticamente pelo trigger/função
        });
      if (error) {
        console.error('Erro ao ocultar fonte global:', error);
        return;
      }
      refreshData();
      return;
    }
    // Fonte do tenant: deleta normalmente
    const { error } = await supabase
      .from('lead_sources')
      .delete()
      .eq('id', source.id);
    if (error) {
      console.error('Erro ao excluir fonte de lead:', error);
      return;
    }
    refreshData();
  };

  // --- Handler atualizado para deletar/ocultar grupo de ação (global ou do tenant) ---
  const handleDeleteActionGroup = async (groupId: string) => {
    // Descobre o grupo no array atual para verificar user_id
    const group = actionGroups.find((g: any) => g.id === groupId);
    if (!group) {
      return;
    }
    if (!group.user_id) {
      // Global: oculta para o tenant usando hidden_default_items
      const { error } = await supabase
        .from('hidden_default_items')
        .insert({
          item_id: group.id,
          item_type: 'action_group',
        });
      if (error) {
        console.error('Erro ao ocultar grupo global:', error);
        return;
      }
      refreshData();
      return;
    }
    // Grupo do tenant: deleta normalmente
    try {
      const { error } = await supabase
        .from('action_groups')
        .delete()
        .eq('id', group.id);

      if (error) {
        console.error('Erro ao excluir grupo de ação:', error);
        return;
      }
      refreshData();
    } catch (error) {
      console.error('Erro inesperado ao excluir grupo de ação:', error);
    }
  };

  // --- Handler atualizado para deletar/ocultar tipo de ação (global ou do tenant) ---
  const handleDeleteActionType = async (typeId: string) => {
    // Descobre o tipo no array atual para verificar user_id
    const type = actionTypes.find((t: any) => t.id === typeId);
    if (!type) {
      return;
    }
    if (!type.user_id) {
      // Global: oculta para o tenant usando hidden_default_items
      const { error } = await supabase
        .from('hidden_default_items')
        .insert({
          item_id: type.id,
          item_type: 'action_type',
        });
      if (error) {
        console.error('Erro ao ocultar tipo global:', error);
        return;
      }
      refreshData();
      return;
    }
    // Tipo do tenant: deleta normalmente
    try {
      const { error } = await supabase
        .from('action_types')
        .delete()
        .eq('id', type.id);

      if (error) {
        console.error('Erro ao excluir tipo de ação:', error);
        return;
      }
      refreshData();
    } catch (error) {
      console.error('Erro inesperado ao excluir tipo de ação:', error);
    }
  };

  // --- ADDED: Handler para deletar motivo de perda ---
  const handleDeleteLossReason = async (reasonId: string) => {
    try {
      await deleteLossReason(reasonId);
      refreshLossReasons();
    } catch (error) {
      console.error('Erro ao excluir motivo de perda:', error);
    }
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
        onClose={handleCloseAddColumnDialog}
        onAddColumn={handleColumnAdded}
        maxOrder={maxOrder}
        columns={kanbanColumns}
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
