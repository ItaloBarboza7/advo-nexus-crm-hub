
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Edit, Trash2, Users, Building, Columns, UserPlus, Settings, CreditCard, X, Check } from "lucide-react";
import { AddMemberModal } from "@/components/AddMemberModal";
import { EditMemberModal } from "@/components/EditMemberModal";
import { AddColumnDialog } from "@/components/AddColumnDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFilterOptions } from "@/hooks/useFilterOptions";

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order_position: number;
  is_default: boolean;
}

export function SettingsContent() {
  const [activeTab, setActiveTab] = useState("company");
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [isAddColumnDialogOpen, setIsAddColumnDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: "Maria Silva", email: "maria@empresa.com", role: "Atendimento - SDR", avatar: "MS" },
    { id: 2, name: "João Santos", email: "joao@empresa.com", role: "Fechamento - Closer", avatar: "JS" },
    { id: 3, name: "Ana Costa", email: "ana@empresa.com", role: "Atendimento - SDR", avatar: "AC" },
  ]);

  // Simulating admin check - in real implementation this would come from auth context
  const isAdmin = true; // This should be replaced with actual admin check logic

  const [companyInfo, setCompanyInfo] = useState({
    name: "",
    cnpj: "",
    phone: "",
    email: "",
    address: ""
  });

  // Estados para gerenciar colunas do Kanban
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [isLoadingColumns, setIsLoadingColumns] = useState(true);

  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");

  // Usar o hook para obter os dados sincronizados
  const { 
    actionGroups, 
    actionTypes, 
    leadSources, 
    loading: optionsLoading,
    refreshData 
  } = useFilterOptions();

  // Estados para edição inline
  const [editingActionGroup, setEditingActionGroup] = useState<string | null>(null);
  const [editingActionType, setEditingActionType] = useState<string | null>(null);
  const [editingLeadSource, setEditingLeadSource] = useState<string | null>(null);
  const [editingActionGroupName, setEditingActionGroupName] = useState("");
  const [editingActionTypeName, setEditingActionTypeName] = useState("");
  const [editingLeadSourceName, setEditingLeadSourceName] = useState("");

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

  useEffect(() => {
    fetchKanbanColumns();
  }, []);

  // Define tabs based on admin status
  const allTabs = [
    { id: "company", title: "Empresa", icon: Building },
    { id: "team", title: "Equipe", icon: Users },
    { id: "kanban", title: "Quadro Kanban", icon: Columns },
    { id: "dashboard", title: "Dashboard", icon: Building },
    { id: "configurations", title: "Configurações", icon: Settings },
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

  const handleSaveCompanyInfo = () => {
    // Validate required fields
    if (!companyInfo.name || !companyInfo.cnpj || !companyInfo.phone || !companyInfo.email || !companyInfo.address) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Informações salvas",
      description: "As informações da empresa foram salvas com sucesso.",
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

  const handleAddColumn = async (columnData: { name: string; color: string; order: number }) => {
    try {
      // Reordenar colunas existentes se necessário
      const columnsToUpdate = kanbanColumns.filter(col => col.order_position >= columnData.order);
      
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
            return;
          }
        }
      }

      // Inserir nova coluna
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
        return;
      }

      // Recarregar as colunas
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
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    try {
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

      // Atualizar lista local
      setKanbanColumns(prev => prev.filter(col => col.id !== columnId));

      toast({
        title: "Sucesso",
        description: "Coluna excluída com sucesso.",
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

  // Funções para gerenciar grupos de ação
  const handleEditActionGroup = (groupId: string, currentName: string) => {
    setEditingActionGroup(groupId);
    setEditingActionGroupName(currentName);
  };

  const handleSaveActionGroup = async () => {
    if (!editingActionGroupName.trim() || !editingActionGroup) {
      toast({
        title: "Erro",
        description: "O nome do grupo não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('action_groups')
        .update({ description: editingActionGroupName.trim() })
        .eq('id', editingActionGroup);

      if (error) {
        console.error('Erro ao atualizar grupo:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o grupo.",
          variant: "destructive"
        });
        return;
      }

      await refreshData();
      setEditingActionGroup(null);
      setEditingActionGroupName("");

      toast({
        title: "Sucesso",
        description: "Nome do grupo atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteActionGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('action_groups')
        .delete()
        .eq('id', groupId);

      if (error) {
        console.error('Erro ao excluir grupo:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o grupo.",
          variant: "destructive"
        });
        return;
      }

      await refreshData();
      toast({
        title: "Sucesso",
        description: "Grupo de ação excluído com sucesso.",
      });
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  // Funções para gerenciar tipos de ação
  const handleEditActionType = (typeId: string, currentName: string) => {
    setEditingActionType(typeId);
    setEditingActionTypeName(currentName);
  };

  const handleSaveActionType = async () => {
    if (!editingActionTypeName.trim() || !editingActionType) {
      toast({
        title: "Erro",
        description: "O nome do tipo não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('action_types')
        .update({ name: editingActionTypeName.toLowerCase().replace(/\s+/g, '-') })
        .eq('id', editingActionType);

      if (error) {
        console.error('Erro ao atualizar tipo:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o tipo.",
          variant: "destructive"
        });
        return;
      }

      await refreshData();
      setEditingActionType(null);
      setEditingActionTypeName("");

      toast({
        title: "Sucesso",
        description: "Nome do tipo atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteActionType = async (typeId: string) => {
    try {
      const { error } = await supabase
        .from('action_types')
        .delete()
        .eq('id', typeId);

      if (error) {
        console.error('Erro ao excluir tipo:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o tipo.",
          variant: "destructive"
        });
        return;
      }

      await refreshData();
      toast({
        title: "Sucesso",
        description: "Tipo de ação excluído com sucesso.",
      });
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  // Funções para gerenciar fontes de leads
  const handleEditLeadSource = (sourceId: string, currentLabel: string) => {
    setEditingLeadSource(sourceId);
    setEditingLeadSourceName(currentLabel);
  };

  const handleSaveLeadSource = async () => {
    if (!editingLeadSourceName.trim() || !editingLeadSource) {
      toast({
        title: "Erro",
        description: "O nome da fonte não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('lead_sources')
        .update({ label: editingLeadSourceName.trim() })
        .eq('id', editingLeadSource);

      if (error) {
        console.error('Erro ao atualizar fonte:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar a fonte.",
          variant: "destructive"
        });
        return;
      }

      await refreshData();
      setEditingLeadSource(null);
      setEditingLeadSourceName("");

      toast({
        title: "Sucesso",
        description: "Fonte atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLeadSource = async (sourceId: string) => {
    try {
      const { error } = await supabase
        .from('lead_sources')
        .delete()
        .eq('id', sourceId);

      if (error) {
        console.error('Erro ao excluir fonte:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir a fonte.",
          variant: "destructive"
        });
        return;
      }

      await refreshData();
      toast({
        title: "Sucesso",
        description: "Fonte excluída com sucesso.",
      });
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const renderCompanyTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Configurações e Pagamento</h3>
      
      {/* Company Information */}
      <Card className="p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Informações da Empresa</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Empresa <span className="text-red-500">*</span>
              </label>
              <Input 
                placeholder="LeadsCRM" 
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CNPJ <span className="text-red-500">*</span>
              </label>
              <Input 
                placeholder="00.000.000/0001-00" 
                value={companyInfo.cnpj}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, cnpj: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone <span className="text-red-500">*</span>
              </label>
              <Input 
                placeholder="(11) 99999-9999" 
                value={companyInfo.phone}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mail <span className="text-red-500">*</span>
              </label>
              <Input 
                placeholder="contato@empresa.com" 
                type="email"
                value={companyInfo.email}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Endereço <span className="text-red-500">*</span>
            </label>
            <Input 
              placeholder="Rua das Empresas, 123 - São Paulo, SP" 
              value={companyInfo.address}
              onChange={(e) => setCompanyInfo(prev => ({ ...prev, address: e.target.value }))}
              required
            />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveCompanyInfo}>
            Salvar Informações
          </Button>
        </div>
      </Card>

      {/* Subscription and Payment Panel */}
      <Card className="p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Assinatura e Pagamento
        </h4>
        
        <div className="space-y-6">
          {/* Plan Information */}
          <div>
            <h5 className="font-medium text-gray-900 mb-3">Plano Atual</h5>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h6 className="font-medium text-gray-900">Plano Premium</h6>
                  <p className="text-sm text-gray-600">Valor mensal: R$ 99,90</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Ativo</Badge>
              </div>
            </div>
          </div>

          {/* Card Information */}
          <div>
            <h5 className="font-medium text-gray-900 mb-3">Cartão Cadastrado</h5>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">**** **** **** 1234</p>
                  <p className="text-sm text-gray-600">Visa - Exp: 12/26</p>
                </div>
              </div>
            </div>
          </div>

          {/* Change Payment Method Button */}
          <div className="pt-4 border-t">
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleChangePaymentMethod}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Alterar Forma de Pagamento
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

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
      <div className="space-y-4">
        {teamMembers.map((member) => (
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
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDeleteMember(member.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
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

  const renderDashboardTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Configurações do Dashboard</h3>
        <p className="text-sm text-gray-600">Gerencie a visibilidade dos componentes do dashboard</p>
      </div>
      
      <Card className="p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Componentes Disponíveis</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h5 className="font-medium text-gray-900">Gráfico de Leads por Status</h5>
              <p className="text-sm text-gray-600">Mostra a distribuição dos leads por status</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600">Visível</span>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h5 className="font-medium text-gray-900">Estatísticas de Conversão</h5>
              <p className="text-sm text-gray-600">Métricas de conversão de leads</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600">Visível</span>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h5 className="font-medium text-gray-900">Atividades Recentes</h5>
              <p className="text-sm text-gray-600">Lista das últimas atividades do sistema</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600">Visível</span>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h5 className="font-medium text-gray-900">Comparação Individual</h5>
              <p className="text-sm text-gray-600">Gráfico de comparação de performance individual</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Oculto</span>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h5 className="font-medium text-gray-900">Metas da Equipe</h5>
              <p className="text-sm text-gray-600">Progresso das metas mensais da equipe</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600">Visível</span>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <Button className="bg-blue-600 hover:bg-blue-700">
            Salvar Configurações
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderConfigurationsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Configurações do Sistema</h3>
      
      {optionsLoading ? (
        <Card className="p-6 text-center">
          <p className="text-gray-500">Carregando configurações...</p>
        </Card>
      ) : (
        <>
          {/* Grupos e Tipos de Ação - Painel Unificado */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900">Grupos e Tipos de Ação</h4>
              <div className="flex gap-2">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Grupo
                </Button>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Tipo
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-96 w-full rounded-md border p-4">
              <Accordion type="single" collapsible className="w-full">
                {actionGroups.map((group) => {
                  const groupActionTypes = actionTypes.filter(type => type.action_group_id === group.id);
                  
                  return (
                    <AccordionItem key={group.id} value={group.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full mr-4">
                          <div className="flex items-center gap-3">
                            {editingActionGroup === group.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editingActionGroupName}
                                  onChange={(e) => setEditingActionGroupName(e.target.value)}
                                  className="max-w-xs"
                                  placeholder="Nome do grupo"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button 
                                  size="sm" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveActionGroup();
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingActionGroup(null);
                                    setEditingActionGroupName("");
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <h5 className="font-medium text-gray-900 text-left">{group.description || group.name}</h5>
                                <p className="text-sm text-gray-600 text-left">{groupActionTypes.length} tipos de ação</p>
                              </div>
                            )}
                          </div>
                          {editingActionGroup !== group.id && (
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditActionGroup(group.id, group.description || group.name);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
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
                          )}
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
                                    {editingActionType === type.id ? (
                                      <div className="flex items-center gap-2">
                                        <Input
                                          value={editingActionTypeName}
                                          onChange={(e) => setEditingActionTypeName(e.target.value)}
                                          className="max-w-xs"
                                          placeholder="Nome do tipo"
                                        />
                                        <Button size="sm" onClick={handleSaveActionType}>
                                          <Check className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          onClick={() => {
                                            setEditingActionType(null);
                                            setEditingActionTypeName("");
                                          }}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div>
                                        <h6 className="font-medium text-gray-900">
                                          {type.name.split('-').map(word => 
                                            word.charAt(0).toUpperCase() + word.slice(1)
                                          ).join(' ')}
                                        </h6>
                                      </div>
                                    )}
                                  </div>
                                  {editingActionType !== type.id && (
                                    <div className="flex gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleEditActionType(type.id, type.name)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleDeleteActionType(type.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </ScrollArea>
          </Card>

          {/* Fontes de Leads */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900">Fontes de Leads</h4>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Nova Fonte
              </Button>
            </div>
            <ScrollArea className="h-64 w-full rounded-md border p-4">
              <div className="space-y-3">
                {leadSources.map((source) => (
                  <div key={source.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {editingLeadSource === source.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingLeadSourceName}
                              onChange={(e) => setEditingLeadSourceName(e.target.value)}
                              className="max-w-xs"
                              placeholder="Nome da fonte"
                            />
                            <Button size="sm" onClick={handleSaveLeadSource}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setEditingLeadSource(null);
                                setEditingLeadSourceName("");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <h5 className="font-medium text-gray-900">{source.label}</h5>
                            <p className="text-sm text-gray-600">ID: {source.name}</p>
                          </div>
                        )}
                      </div>
                      {editingLeadSource !== source.id && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditLeadSource(source.id, source.label)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteLeadSource(source.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </>
      )}
    </div>
  );

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
        {activeTab === "team" && renderTeamTab()}
        {activeTab === "kanban" && renderKanbanTab()}
        {activeTab === "dashboard" && renderDashboardTab()}
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
    </div>
  );
}
