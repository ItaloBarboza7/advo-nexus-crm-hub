import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users, Building, Columns, UserPlus, Settings, CreditCard, X, Check } from "lucide-react";
import { AddMemberModal } from "@/components/AddMemberModal";
import { EditMemberModal } from "@/components/EditMemberModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function SettingsContent() {
  const [activeTab, setActiveTab] = useState("company");
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
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
  const [kanbanColumns, setKanbanColumns] = useState([
    { id: 1, name: "Novo", order: 1, color: "#3B82F6", isDefault: true },
    { id: 2, name: "Proposta", order: 2, color: "#F59E0B", isDefault: true },
    { id: 3, name: "Reunião", order: 3, color: "#8B5CF6", isDefault: true },
    { id: 4, name: "Contrato Fechado", order: 4, color: "#10B981", isDefault: true },
    { id: 5, name: "Perdido", order: 5, color: "#EF4444", isDefault: true },
    { id: 6, name: "Finalizado", order: 6, color: "#6B7280", isDefault: true },
  ]);

  const [editingColumn, setEditingColumn] = useState<number | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("#3B82F6");

  const { toast } = useToast();

  // Define tabs based on admin status
  const allTabs = [
    { id: "company", title: "Empresa", icon: Building },
    { id: "team", title: "Equipe", icon: Users },
    { id: "kanban", title: "Quadro Kanban", icon: Columns },
    { id: "leads", title: "Opções de Leads", icon: UserPlus },
    { id: "dashboard", title: "Dashboard", icon: Building },
    { id: "actions", title: "Editar Ações", icon: Settings },
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

  const handleEditActions = () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A configuração de ações será implementada em breve.",
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

  const handleEditColumnName = (columnId: number, currentName: string) => {
    setEditingColumn(columnId);
    setEditingColumnName(currentName);
  };

  const handleSaveColumnName = async (columnId: number) => {
    if (!editingColumnName.trim()) {
      toast({
        title: "Erro",
        description: "O nome da coluna não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Atualizar na lista local
      setKanbanColumns(prev => prev.map(col => 
        col.id === columnId ? { ...col, name: editingColumnName.trim() } : col
      ));

      // Aqui você poderia salvar no Supabase se necessário
      // const { error } = await supabase
      //   .from('kanban_columns')
      //   .update({ name: editingColumnName.trim() })
      //   .eq('id', columnId);

      setEditingColumn(null);
      setEditingColumnName("");

      toast({
        title: "Sucesso",
        description: "Nome da coluna atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar coluna:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o nome da coluna.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEditColumn = () => {
    setEditingColumn(null);
    setEditingColumnName("");
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      toast({
        title: "Erro",
        description: "O nome da coluna não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newColumn = {
        id: Math.max(...kanbanColumns.map(col => col.id)) + 1,
        name: newColumnName.trim(),
        order: kanbanColumns.length + 1,
        color: newColumnColor,
        isDefault: false
      };

      setKanbanColumns(prev => [...prev, newColumn]);

      // Aqui você poderia salvar no Supabase
      // const { error } = await supabase
      //   .from('kanban_columns')
      //   .insert(newColumn);

      setIsAddingColumn(false);
      setNewColumnName("");
      setNewColumnColor("#3B82F6");

      toast({
        title: "Sucesso",
        description: "Nova coluna criada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao criar coluna:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a nova coluna.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteColumn = async (columnId: number) => {
    try {
      setKanbanColumns(prev => prev.filter(col => col.id !== columnId));

      // Aqui você poderia deletar do Supabase
      // const { error } = await supabase
      //   .from('kanban_columns')
      //   .delete()
      //   .eq('id', columnId);

      toast({
        title: "Sucesso",
        description: "Coluna excluída com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao excluir coluna:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a coluna.",
        variant: "destructive",
      });
    }
  };

  const handleCancelAddColumn = () => {
    setIsAddingColumn(false);
    setNewColumnName("");
    setNewColumnColor("#3B82F6");
  };

  const leadOptions = [
    { id: 1, category: "Fonte", option: "Website" },
    { id: 2, category: "Fonte", option: "LinkedIn" },
    { id: 3, category: "Fonte", option: "Indicação" },
    { id: 4, category: "Interesse", option: "Consultoria Jurídica" },
    { id: 5, category: "Interesse", option: "Contratos" },
    { id: 6, category: "Interesse", option: "Compliance" },
  ];

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

  const renderActionsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Configuração de Ações</h3>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleEditActions}>
          <Settings className="h-4 w-4 mr-2" />
          Configurar Ações
        </Button>
      </div>
      
      <Card className="p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Grupos de Ação</h4>
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">Ligações</h5>
                <p className="text-sm text-gray-600">Ações relacionadas a chamadas telefônicas</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">WhatsApp</h5>
                <p className="text-sm text-gray-600">Ações relacionadas ao WhatsApp</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">E-mail</h5>
                <p className="text-sm text-gray-600">Ações relacionadas a e-mails</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo de Ação
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Tipos de Ação</h4>
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">Ligação realizada</h5>
                <p className="text-sm text-gray-600">Grupo: Ligações</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">Mensagem enviada</h5>
                <p className="text-sm text-gray-600">Grupo: WhatsApp</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">E-mail enviado</h5>
                <p className="text-sm text-gray-600">Grupo: E-mail</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Novo Tipo de Ação
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderKanbanTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Colunas do Kanban</h3>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setIsAddingColumn(true)}
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
                      <p className="text-sm text-gray-600">Ordem: {column.order}</p>
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
                  {!column.isDefault && (
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

        {/* Formulário para adicionar nova coluna */}
        {isAddingColumn && (
          <Card className="p-4 border-2 border-dashed border-blue-300">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Nova Coluna
                </label>
                <Input
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Digite o nome da nova coluna"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor da Coluna
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newColumnColor}
                    onChange={(e) => setNewColumnColor(e.target.value)}
                    className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">{newColumnColor}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddColumn}>
                  <Check className="h-4 w-4 mr-2" />
                  Criar Coluna
                </Button>
                <Button variant="outline" onClick={handleCancelAddColumn}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );

  const renderLeadsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Opções para Cadastro de Leads</h3>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nova Opção
        </Button>
      </div>
      <div className="space-y-4">
        {["Fonte", "Interesse"].map((category) => (
          <Card key={category} className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">{category}</h4>
            <div className="space-y-2">
              {leadOptions
                .filter(option => option.category === category)
                .map((option) => (
                  <div key={option.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{option.option}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        ))}
      </div>
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
        {activeTab === "leads" && renderLeadsTab()}
        {activeTab === "dashboard" && renderDashboardTab()}
        {activeTab === "actions" && renderActionsTab()}
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
    </div>
  );
}
