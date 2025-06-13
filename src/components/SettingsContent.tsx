
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Kanban, User, Trash2, Plus, GripVertical } from "lucide-react";
import { EditCompanyModal } from "./EditCompanyModal";
import { UserProfileModal } from "./UserProfileModal";
import { AddColumnDialog } from "./AddColumnDialog";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { useKanbanColumns } from "@/hooks/useKanbanColumns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function SettingsContent() {
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);
  
  const { companyInfo, isLoading: companyLoading, updateCompanyInfo } = useCompanyInfo();
  const { columns, isLoading: columnsLoading, refreshColumns } = useKanbanColumns();
  const { toast } = useToast();

  const handleDeleteColumn = async (columnId: string) => {
    try {
      const { error } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', columnId);

      if (error) {
        console.error('Erro ao deletar coluna:', error);
        toast({
          title: "Erro",
          description: "Não foi possível deletar a coluna.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Coluna deletada com sucesso.",
      });

      refreshColumns();
    } catch (error) {
      console.error('Erro inesperado ao deletar coluna:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const handleReorderColumns = async () => {
    try {
      // Ordenar as colunas por order_position e recriar a sequência começando do 1
      const sortedColumns = [...columns].sort((a, b) => a.order_position - b.order_position);
      
      const updatePromises = sortedColumns.map((column, index) => {
        const newPosition = index + 1;
        return supabase
          .from('kanban_columns')
          .update({ order_position: newPosition })
          .eq('id', column.id);
      });

      const results = await Promise.all(updatePromises);
      
      // Verificar se houve erros
      const hasErrors = results.some(result => result.error);
      
      if (hasErrors) {
        toast({
          title: "Erro",
          description: "Não foi possível reordenar todas as colunas.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Ordem das colunas atualizada com sucesso.",
      });

      refreshColumns();
    } catch (error) {
      console.error('Erro ao reordenar colunas:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao reordenar as colunas.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas configurações e preferências do sistema.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Perfil do Usuário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Perfil do Usuário
            </CardTitle>
            <CardDescription>
              Gerencie suas informações pessoais e preferências de conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsProfileModalOpen(true)}>
              Editar Perfil
            </Button>
          </CardContent>
        </Card>

        {/* Informações da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Empresa
            </CardTitle>
            <CardDescription>
              Gerencie as informações da sua empresa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {companyLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Carregando...</span>
              </div>
            ) : companyInfo ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Nome/Razão Social:</span>
                    <p className="text-gray-600">{companyInfo.company_name}</p>
                  </div>
                  <div>
                    <span className="font-medium">CPF/CNPJ:</span>
                    <p className="text-gray-600">{companyInfo.cnpj}</p>
                  </div>
                  <div>
                    <span className="font-medium">Telefone:</span>
                    <p className="text-gray-600">{companyInfo.phone}</p>
                  </div>
                  <div>
                    <span className="font-medium">E-mail:</span>
                    <p className="text-gray-600">{companyInfo.email}</p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium">Endereço:</span>
                    <p className="text-gray-600">{companyInfo.address}</p>
                  </div>
                </div>
                <Button onClick={() => setIsCompanyModalOpen(true)}>
                  Editar Informações
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-600">Nenhuma informação da empresa cadastrada.</p>
                <Button onClick={() => setIsCompanyModalOpen(true)}>
                  Cadastrar Informações
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configurações do Quadro Kanban */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Kanban className="h-5 w-5" />
              Quadro Kanban
            </CardTitle>
            <CardDescription>
              Gerencie as colunas do seu quadro Kanban.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Colunas do Kanban</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReorderColumns}
                    disabled={columnsLoading}
                  >
                    <GripVertical className="h-4 w-4 mr-1" />
                    Reordenar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsAddColumnOpen(true)}
                    disabled={columnsLoading}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Coluna
                  </Button>
                </div>
              </div>

              {columnsLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">Carregando colunas...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {columns.map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium bg-white px-2 py-1 rounded border">
                          {column.order_position}
                        </span>
                        <span className="font-medium">{column.name}</span>
                        {column.is_default && (
                          <Badge variant="secondary">Padrão</Badge>
                        )}
                      </div>
                      {!column.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteColumnId(column.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  {columns.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      Nenhuma coluna configurada ainda.
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modais */}
      <EditCompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        companyInfo={companyInfo}
        onSave={updateCompanyInfo}
        isLoading={companyLoading}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <AddColumnDialog
        open={isAddColumnOpen}
        onOpenChange={setIsAddColumnOpen}
        onColumnAdded={refreshColumns}
      />

      <ConfirmDeleteDialog
        open={!!deleteColumnId}
        onOpenChange={() => setDeleteColumnId(null)}
        onConfirm={() => {
          if (deleteColumnId) {
            handleDeleteColumn(deleteColumnId);
            setDeleteColumnId(null);
          }
        }}
        itemName="esta coluna"
        itemType="a coluna do Kanban"
      />
    </div>
  );
}
