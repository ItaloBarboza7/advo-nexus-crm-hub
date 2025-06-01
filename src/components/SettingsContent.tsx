
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users, Building, Columns, UserPlus } from "lucide-react";

export function SettingsContent() {
  const [activeTab, setActiveTab] = useState("team");

  const teamMembers = [
    { id: 1, name: "Maria Silva", email: "maria@empresa.com", role: "Gerente", avatar: "MS" },
    { id: 2, name: "João Santos", email: "joao@empresa.com", role: "Vendedor", avatar: "JS" },
    { id: 3, name: "Ana Costa", email: "ana@empresa.com", role: "Vendedor", avatar: "AC" },
  ];

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
  ];

  const renderTeamTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Membros da Equipe</h3>
        <Button className="bg-blue-600 hover:bg-blue-700">
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
      </Card>
    </div>
  );
}
