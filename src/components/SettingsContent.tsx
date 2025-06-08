import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users, Building, Columns, UserPlus, Settings } from "lucide-react";
import { AddMemberModal } from "@/components/AddMemberModal";
import { useToast } from "@/hooks/use-toast";

export function SettingsContent() {
  const [activeTab, setActiveTab] = useState("team");
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: "Maria Silva", email: "maria@empresa.com", role: "Gerente", avatar: "MS" },
    { id: 2, name: "João Santos", email: "joao@empresa.com", role: "Vendedor", avatar: "JS" },
    { id: 3, name: "Ana Costa", email: "ana@empresa.com", role: "Vendedor", avatar: "AC" },
  ]);
  const { toast } = useToast();

  const kanbanColumns = [
    { id: 1, name: "Novo", order: 1, color: "#3B82F6" },
    { id: 2, name: "Proposta", order: 2, color: "#F59E0B" },
    { id: 3, name: "Reunião", order: 3, color: "#8B5CF6" },
    { id: 4, name: "Contrato Fechado", order: 4, color: "#10B981" },
    { id: 5, name: "Perdido", order: 5, color: "#EF4444" },
    { id: 6, name: "Finalizado", order: 6, color: "#6B7280" },
  ];

  const leadOptions = [
    { id: 1, category: "Fonte", option: "Website" },
    { id: 2, category: "Fonte", option: "LinkedIn" },
    { id: 3, category: "Fonte", option: "Indicação" },
    { id: 4, category: "Interesse", option: "Consultoria Jurídica" },
    { id: 5, category: "Interesse", option: "Contratos" },
    { id: 6, category: "Interesse", option: "Compliance" },
  ];

  const tabs = [
    { id: "team", title: "Equipe", icon: Users },
    { id: "kanban", title: "Quadro Kanban", icon: Columns },
    { id: "company", title: "Empresa", icon: Building },
    { id: "leads", title: "Opções de Leads", icon: UserPlus },
    { id: "dashboard", title: "Dashboard", icon: Building },
    { id: "actions", title: "Editar Ações", icon: Settings },
  ];

  const handleAddMember = (newMember: any) => {
    setTeamMembers(prev => [...prev, newMember]);
  };

  const handleEditActions = () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A configuração de ações será implementada em breve.",
    });
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
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
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
        <Button className="bg-blue-600 hover:bg-blue-700">
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
                <div>
                  <h4 className="font-medium text-gray-900">{column.name}</h4>
                  <p className="text-sm text-gray-600">Ordem: {column.order}</p>
                </div>
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
          </Card>
        ))}
      </div>
    </div>
  );

  const renderCompanyTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Informações da Empresa</h3>
      <Card className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Empresa</label>
              <Input placeholder="LeadsCRM" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ</label>
              <Input placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
              <Input placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
              <Input placeholder="contato@empresa.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
            <Input placeholder="Rua das Empresas, 123 - São Paulo, SP" />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Salvar Informações
          </Button>
        </div>
      </Card>
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
        {activeTab === "team" && renderTeamTab()}
        {activeTab === "kanban" && renderKanbanTab()}
        {activeTab === "company" && renderCompanyTab()}
        {activeTab === "leads" && renderLeadsTab()}
        {activeTab === "dashboard" && renderDashboardTab()}
        {activeTab === "actions" && renderActionsTab()}
      </Card>

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onMemberAdded={handleAddMember}
      />
    </div>
  );
}
