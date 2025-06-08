import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, Plus, X, Palette, Monitor, Database, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddMemberModal } from "@/components/AddMemberModal";
import { EditMemberModal } from "@/components/EditMemberModal";
import { UserProfileModal } from "@/components/UserProfileModal";
import { DashboardSettings } from "@/components/settings/DashboardSettings";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";

interface Member {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar: string;
  active: boolean;
}

export function SettingsContent() {
  const { toast } = useToast();
  const { updateSettings } = useDashboardSettings();
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'general' | 'integrations' | 'notifications'>('dashboard');

  const [members, setMembers] = useState<Member[]>([
    {
      id: 1,
      name: "João Silva",
      email: "joao@empresa.com",
      role: "Administrador",
      avatar: "/placeholder.svg",
      active: true,
    },
    {
      id: 2,
      name: "Maria Santos",
      email: "maria@empresa.com",
      role: "Vendedor",
      avatar: "/placeholder.svg",
      active: true,
    },
    {
      id: 3,
      name: "Pedro Costa",
      email: "pedro@empresa.com",
      role: "Vendedor",
      avatar: "/placeholder.svg",
      active: false,
    },
  ]);

  const handleAddMember = (memberData: { name: string; email: string; role: string }) => {
    const newMember: Member = {
      id: Date.now(),
      ...memberData,
      avatar: "/placeholder.svg",
      active: true,
    };
    setMembers([...members, newMember]);
    toast({
      title: "Membro adicionado",
      description: `${memberData.name} foi adicionado à equipe.`,
    });
  };

  const handleEditMember = (updatedMember: Member) => {
    setMembers(members.map(member => 
      member.id === updatedMember.id ? updatedMember : member
    ));
    toast({
      title: "Membro atualizado",
      description: `${updatedMember.name} foi atualizado com sucesso.`,
    });
  };

  const handleRemoveMember = (id: number) => {
    const member = members.find(m => m.id === id);
    setMembers(members.filter(member => member.id !== id));
    toast({
      title: "Membro removido",
      description: `${member?.name} foi removido da equipe.`,
      variant: "destructive",
    });
  };

  const handleToggleMemberStatus = (id: number) => {
    setMembers(members.map(member => 
      member.id === id ? { ...member, active: !member.active } : member
    ));
    const member = members.find(m => m.id === id);
    toast({
      title: member?.active ? "Membro desativado" : "Membro ativado",
      description: `${member?.name} foi ${member?.active ? 'desativado' : 'ativado'}.`,
    });
  };

  const openEditMemberModal = (member: Member) => {
    setSelectedMember(member);
    setIsEditMemberModalOpen(true);
  };

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Monitor },
    { id: 'team' as const, label: 'Equipe', icon: Users },
    { id: 'general' as const, label: 'Geral', icon: Settings },
    { id: 'integrations' as const, label: 'Integrações', icon: Database },
    { id: 'notifications' as const, label: 'Notificações', icon: Bell },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <DashboardSettings onSettingsChange={updateSettings} />
          </div>
        );
      
      case 'team':
        return (
          <div className="space-y-6">
            <Card className="p-6">
              <CardHeader className="p-0 mb-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                    <Users className="h-6 w-6 text-blue-600" />
                    Gerenciar Equipe
                  </CardTitle>
                  <Button 
                    onClick={() => setIsAddMemberModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Membro
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="space-y-4">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <img 
                          src={member.avatar} 
                          alt={member.name}
                          className="w-10 h-10 rounded-full object-cover bg-gray-200"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{member.name}</h4>
                            <Badge variant={member.active ? "default" : "secondary"}>
                              {member.active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{member.email}</p>
                          <p className="text-xs text-gray-500">{member.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={member.active}
                          onCheckedChange={() => handleToggleMemberStatus(member.id)}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditMemberModal(member)}
                        >
                          Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'general':
        return (
          <div className="space-y-6">
            <Card className="p-6">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                  <Settings className="h-6 w-6 text-blue-600" />
                  Configurações Gerais
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-0 space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="company-name">Nome da Empresa</Label>
                    <Input id="company-name" placeholder="Nome da sua empresa" />
                  </div>
                  <div>
                    <Label htmlFor="company-email">Email da Empresa</Label>
                    <Input id="company-email" type="email" placeholder="contato@empresa.com" />
                  </div>
                  <div>
                    <Label htmlFor="company-phone">Telefone da Empresa</Label>
                    <Input id="company-phone" placeholder="(11) 99999-9999" />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Preferências do Sistema</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Tema Escuro</Label>
                        <p className="text-sm text-gray-600">Alternar entre tema claro e escuro</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Notificações por Email</Label>
                        <p className="text-sm text-gray-600">Receber updates por email</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-6">
            <Card className="p-6">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                  <Database className="h-6 w-6 text-blue-600" />
                  Integrações
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Supabase</h4>
                        <p className="text-sm text-gray-600">Banco de dados e autenticação</p>
                      </div>
                      <Badge variant="default">Conectado</Badge>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">WhatsApp Business</h4>
                        <p className="text-sm text-gray-600">Integração para mensagens</p>
                      </div>
                      <Button variant="outline" size="sm">Conectar</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <Card className="p-6">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                  <Bell className="h-6 w-6 text-blue-600" />
                  Configurações de Notificação
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Novo Lead</Label>
                      <p className="text-sm text-gray-600">Notificar quando um novo lead for criado</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Status Alterado</Label>
                      <p className="text-sm text-gray-600">Notificar quando o status de um lead mudar</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Meta Atingida</Label>
                      <p className="text-sm text-gray-600">Notificar quando metas forem atingidas</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações</h1>
          <p className="text-gray-600">Gerencie as configurações do sistema e da equipe</p>
        </div>
        <Button 
          onClick={() => setIsUserProfileModalOpen(true)}
          variant="outline"
        >
          Meu Perfil
        </Button>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {renderTabContent()}

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onAddMember={handleAddMember}
      />

      <EditMemberModal
        isOpen={isEditMemberModalOpen}
        onClose={() => setIsEditMemberModalOpen(false)}
        member={selectedMember}
        onEditMember={handleEditMember}
      />

      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
      />
    </div>
  );
}
