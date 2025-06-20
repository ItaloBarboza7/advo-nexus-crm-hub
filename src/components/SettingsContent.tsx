import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Building2, Users, CreditCard, Settings } from "lucide-react";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { EditCompanyModal } from "./EditCompanyModal";
import { AddMemberModal } from "./AddMemberModal";
import { EditMemberModal } from "./EditMemberModal";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function SettingsContent() {
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const { companyInfo, isLoading } = useCompanyInfo();

  const members: Member[] = [
    {
      id: "1",
      name: "João Silva",
      email: "joao@example.com",
      role: "admin",
    },
    {
      id: "2",
      name: "Maria Souza",
      email: "maria@example.com",
      role: "member",
    },
  ];

  const handleOpenEditMemberModal = (member: any) => {
    setSelectedMember(member);
    setIsEditMemberModalOpen(true);
  };

  const handleCloseEditMemberModal = () => {
    setSelectedMember(null);
    setIsEditMemberModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">
          Gerencie as configurações da sua conta e empresa.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informações da Empresa
            </CardTitle>
            <CardDescription>
              Gerencie os dados da sua empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : companyInfo ? (
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium">Nome/Razão Social</p>
                  <p className="text-sm text-muted-foreground">{companyInfo.company_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">CNPJ</p>
                  <p className="text-sm text-muted-foreground">{companyInfo.cnpj}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">E-mail</p>
                  <p className="text-sm text-muted-foreground">{companyInfo.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Telefone</p>
                  <p className="text-sm text-muted-foreground">{companyInfo.phone}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma informação cadastrada
              </p>
            )}
            <Button 
              onClick={() => setIsCompanyModalOpen(true)}
              className="w-full"
            >
              {companyInfo ? "Editar Informações" : "Cadastrar Informações"}
            </Button>
          </CardContent>
        </Card>

        {/* Members Management Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membros
            </CardTitle>
            <CardDescription>
              Gerencie os membros da sua equipe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditMemberModal(member)}
                  >
                    Editar
                  </Button>
                </div>
              ))}
            </div>
            <Button
              onClick={() => setIsMemberModalOpen(true)}
              className="w-full"
            >
              Adicionar Membro
            </Button>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Plano
            </CardTitle>
            <CardDescription>
              Gerencie sua assinatura e forma de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Plano Atual</p>
              <p className="text-sm text-muted-foreground">Premium</p>
            </div>
            <Button className="w-full">Gerenciar Assinatura</Button>
          </CardContent>
        </Card>

        {/* Account Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações da Conta
            </CardTitle>
            <CardDescription>
              Altere sua senha e outras configurações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Senha</p>
              <p className="text-sm text-muted-foreground">
                Altere sua senha para manter sua conta segura
              </p>
            </div>
            <Button className="w-full">Alterar Senha</Button>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <EditCompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
      />

      <AddMemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
      />

      <EditMemberModal
        isOpen={isEditMemberModalOpen}
        onClose={handleCloseEditMemberModal}
        member={selectedMember}
      />
    </div>
  );
}
