
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, Settings, BarChart3 } from "lucide-react";
import { CompanyInfoModal } from "./CompanyInfoModal";
import { AddMemberModal } from "./AddMemberModal";
import { EditMemberModal } from "./EditMemberModal";
import { EditCompanyModal } from "./EditCompanyModal";
import { LossReasonsManager } from "./LossReasonsManager";
import { AddActionGroupDialog } from "./AddActionGroupDialog";
import { AddActionTypeDialog } from "./AddActionTypeDialog";
import { AddLeadSourceDialog } from "./AddLeadSourceDialog";
import { AddLossReasonDialog } from "./AddLossReasonDialog";
import { AddColumnDialog } from "./AddColumnDialog";
import { PurchaseModal } from "./PurchaseModal";
import { SubscriptionAndPaymentPanel } from "./SubscriptionAndPaymentPanel";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFilterOptions } from "@/hooks/useFilterOptions";

interface SettingsContentProps {
  onUserProfileUpdate?: () => void;
}

export function SettingsContent({ onUserProfileUpdate }: SettingsContentProps) {
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  
  // Dialog states for system configuration
  const [isActionGroupDialogOpen, setIsActionGroupDialogOpen] = useState(false);
  const [isActionTypeDialogOpen, setIsActionTypeDialogOpen] = useState(false);
  const [isLeadSourceDialogOpen, setIsLeadSourceDialogOpen] = useState(false);
  const [isLossReasonDialogOpen, setIsLossReasonDialogOpen] = useState(false);
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  
  const { companyInfo, isLoading: isCompanyLoading } = useCompanyInfo();
  const { toast } = useToast();
  const { actionGroups, refreshData } = useFilterOptions();

  const { data: userRole } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      return data?.role || 'owner';
    },
  });

  const { data: members, refetch: refetchMembers } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('parent_user_id', user.id);

      return data || [];
    },
  });

  const { data: kanbanColumns } = useQuery({
    queryKey: ['kanban-columns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('order_position');

      if (error) {
        console.error('Error fetching kanban columns:', error);
        return [];
      }

      return data || [];
    },
  });

  const handleEditMember = (member: any) => {
    setSelectedMember(member);
    setIsEditMemberModalOpen(true);
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este membro?')) {
      return;
    }

    try {
      const response = await fetch('https://xltugnmjbcowsuwzkkni.supabase.co/functions/v1/delete-member', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId }),
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir membro');
      }

      toast({
        title: "Membro excluído",
        description: "O membro foi excluído com sucesso.",
      });

      refetchMembers();
    } catch (error) {
      console.error('Erro ao excluir membro:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o membro.",
        variant: "destructive",
      });
    }
  };

  const handleCompanyUpdated = () => {
    if (onUserProfileUpdate) {
      onUserProfileUpdate();
    }
  };

  const handleDialogUpdate = () => {
    refreshData();
  };

  const maxOrder = kanbanColumns ? Math.max(...kanbanColumns.map(col => col.order_position), 0) : 0;

  return (
    <div className="space-y-6">
      {/* Seção de Informações da Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informações da Empresa
          </CardTitle>
          <CardDescription>
            Configure as informações básicas da sua empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isCompanyLoading ? (
            <p>Carregando informações da empresa...</p>
          ) : companyInfo ? (
            <div className="space-y-2">
              <p><strong>Empresa:</strong> {companyInfo.company_name}</p>
              <p><strong>CNPJ:</strong> {companyInfo.cnpj}</p>
              <p><strong>Email:</strong> {companyInfo.email}</p>
              <p><strong>Telefone:</strong> {companyInfo.phone}</p>
              <p><strong>Endereço:</strong> {companyInfo.address}</p>
              <Button 
                onClick={() => setIsCompanyModalOpen(true)}
                className="mt-4"
              >
                Editar Informações
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground mb-4">
                Nenhuma informação da empresa cadastrada
              </p>
              <Button onClick={() => setIsCompanyModalOpen(true)}>
                Adicionar Informações da Empresa
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção de Gerenciamento de Equipe */}
      {userRole !== 'member' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gerenciamento de Equipe
            </CardTitle>
            <CardDescription>
              Gerencie os membros da sua equipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={() => setIsAddMemberModalOpen(true)}>
                Adicionar Membro
              </Button>
              
              {members && members.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-medium">Membros da Equipe:</h4>
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        <p className="text-xs text-muted-foreground">{member.title || 'Sem cargo definido'}</p>
                      </div>
                      <div className="space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditMember(member)}
                        >
                          Editar
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteMember(member.user_id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhum membro adicionado ainda</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seção de Configurações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Sistema
          </CardTitle>
          <CardDescription>
            Configure grupos de ação, tipos de ação, fontes de leads e motivos de perda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={() => setIsActionGroupDialogOpen(true)}>
              Gerenciar Grupos de Ação
            </Button>
            <Button onClick={() => setIsActionTypeDialogOpen(true)}>
              Gerenciar Tipos de Ação
            </Button>
            <Button onClick={() => setIsLeadSourceDialogOpen(true)}>
              Gerenciar Fontes de Lead
            </Button>
            <Button onClick={() => setIsLossReasonDialogOpen(true)}>
              Gerenciar Motivos de Perda
            </Button>
            <Button onClick={() => setIsColumnDialogOpen(true)}>
              Gerenciar Colunas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Seção de Motivos de Perda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Gerenciar Motivos de Perda
          </CardTitle>
          <CardDescription>
            Configure e gerencie os motivos de perda de leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LossReasonsManager />
        </CardContent>
      </Card>

      {/* Seção de Assinatura e Pagamento */}
      <SubscriptionAndPaymentPanel />

      {/* Modais */}
      <CompanyInfoModal 
        isOpen={isCompanyModalOpen} 
        onClose={() => setIsCompanyModalOpen(false)}
        onCompanyUpdated={handleCompanyUpdated}
      />
      
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onMemberAdded={() => refetchMembers()}
      />

      <EditMemberModal
        isOpen={isEditMemberModalOpen}
        onClose={() => setIsEditMemberModalOpen(false)}
        member={selectedMember}
        onMemberUpdated={() => refetchMembers()}
      />

      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        planType="pro"
      />

      {/* System Configuration Dialogs */}
      <AddActionGroupDialog
        isOpen={isActionGroupDialogOpen}
        onClose={() => setIsActionGroupDialogOpen(false)}
        onGroupAdded={handleDialogUpdate}
      />

      <AddActionTypeDialog
        isOpen={isActionTypeDialogOpen}
        onClose={() => setIsActionTypeDialogOpen(false)}
        onTypeAdded={handleDialogUpdate}
        actionGroups={actionGroups}
      />

      <AddLeadSourceDialog
        isOpen={isLeadSourceDialogOpen}
        onClose={() => setIsLeadSourceDialogOpen(false)}
        onSourceAdded={handleDialogUpdate}
      />

      <AddLossReasonDialog
        isOpen={isLossReasonDialogOpen}
        onClose={() => setIsLossReasonDialogOpen(false)}
        onReasonAdded={handleDialogUpdate}
      />

      <AddColumnDialog
        isOpen={isColumnDialogOpen}
        onClose={() => setIsColumnDialogOpen(false)}
        onAddColumn={handleDialogUpdate}
        maxOrder={maxOrder}
        columns={kanbanColumns || []}
      />
    </div>
  );
}
