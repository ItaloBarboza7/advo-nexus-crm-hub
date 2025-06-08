
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Edit } from "lucide-react";
import { AddLeadSourceDialog } from "./AddLeadSourceDialog";
import { AddColumnDialog } from "./AddColumnDialog";
import { AddActionGroupDialog } from "./AddActionGroupDialog";
import { AddActionTypeDialog } from "./AddActionTypeDialog";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { useKanbanColumns } from "@/hooks/useKanbanColumns";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { EditCompanyModal } from "./EditCompanyModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function SettingsContent() {
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [isAddActionGroupOpen, setIsAddActionGroupOpen] = useState(false);
  const [isAddActionTypeOpen, setIsAddActionTypeOpen] = useState(false);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    itemName: string;
    itemType: string;
    onConfirm: () => void;
  }>({
    open: false,
    itemName: "",
    itemType: "",
    onConfirm: () => {},
  });

  const { toast } = useToast();

  const { 
    columns = [], 
    deleteColumn, 
    isLoading: columnsLoading,
    refreshColumns
  } = useKanbanColumns();

  const {
    leadSources = [],
    actionGroups = [],
    actionTypes = [],
    lossReasons = [],
    deleteLeadSource,
    deleteActionGroup,
    deleteActionType,
    deleteLossReason,
    isLoading: optionsLoading,
    refreshData
  } = useFilterOptions();

  const { companyInfo, isLoading: companyLoading, updateCompanyInfo } = useCompanyInfo();

  const handleDelete = (itemName: string, itemType: string, onConfirm: () => void) => {
    setConfirmDelete({
      open: true,
      itemName,
      itemType,
      onConfirm,
    });
  };

  const confirmDeleteAction = () => {
    confirmDelete.onConfirm();
    setConfirmDelete({
      open: false,
      itemName: "",
      itemType: "",
      onConfirm: () => {},
    });
  };

  const cancelDelete = () => {
    setConfirmDelete({
      open: false,
      itemName: "",
      itemType: "",
      onConfirm: () => {},
    });
  };

  const handleAddColumn = async (columnData: { name: string; color: string; order: number }) => {
    try {
      const { error } = await supabase
        .from('kanban_columns')
        .insert({
          name: columnData.name,
          color: columnData.color,
          order_position: columnData.order,
          is_default: false
        });

      if (error) {
        console.error('Erro ao criar coluna:', error);
        toast({
          title: "Erro",
          description: "Não foi possível criar a coluna.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Coluna criada com sucesso.",
      });

      refreshColumns();
      setIsAddColumnOpen(false);
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const maxOrder = columns.length > 0 ? Math.max(...columns.map(col => col.order_position)) : 0;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
      </div>

      <Tabs defaultValue="empresa" className="space-y-4">
        <TabsList>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="fontes">Fontes de Lead</TabsTrigger>
          <TabsTrigger value="colunas">Colunas do Kanban</TabsTrigger>
          <TabsTrigger value="acoes">Ações</TabsTrigger>
          <TabsTrigger value="motivos">Motivos de Perda</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Informações da Empresa</CardTitle>
                  <CardDescription>
                    Gerencie as informações básicas da sua empresa
                  </CardDescription>
                </div>
                <Button onClick={() => setIsEditCompanyOpen(true)} variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {companyLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando informações da empresa...</p>
                </div>
              ) : companyInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Nome da Empresa</Label>
                    <p className="text-sm mt-1">{companyInfo.company_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">CNPJ</Label>
                    <p className="text-sm mt-1">{companyInfo.cnpj}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
                    <p className="text-sm mt-1">{companyInfo.phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">E-mail</Label>
                    <p className="text-sm mt-1">{companyInfo.email}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-muted-foreground">Endereço</Label>
                    <p className="text-sm mt-1">{companyInfo.address}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Nenhuma informação da empresa encontrada</p>
                  <Button onClick={() => setIsEditCompanyOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Informações
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fontes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fontes de Lead</CardTitle>
                  <CardDescription>
                    Gerencie as fontes de onde seus leads podem vir
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAddSourceOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Fonte
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {optionsLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando fontes...</p>
                </div>
              ) : leadSources.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma fonte cadastrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leadSources.map((source) => (
                    <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{source.label}</p>
                        <p className="text-sm text-muted-foreground">Valor: {source.name}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(source.label, "fonte", () => deleteLeadSource(source.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colunas" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Colunas do Kanban</CardTitle>
                  <CardDescription>
                    Configure as colunas do seu quadro Kanban
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAddColumnOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Coluna
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {columnsLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando colunas...</p>
                </div>
              ) : columns.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma coluna cadastrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {columns.map((column) => (
                    <div key={column.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: column.color }}
                        />
                        <div>
                          <p className="font-medium">{column.name}</p>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm text-muted-foreground">Posição: {column.order_position}</p>
                            {column.is_default && (
                              <Badge variant="secondary" className="text-xs">Padrão</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {!column.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(column.name, "coluna", () => deleteColumn(column.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="acoes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Grupos de Ação</CardTitle>
                    <CardDescription>
                      Categorias principais de ações
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsAddActionGroupOpen(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {optionsLoading ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">Carregando...</p>
                  </div>
                ) : actionGroups.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">Nenhum grupo cadastrado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {actionGroups.map((group) => (
                      <div key={group.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium text-sm">{group.name}</p>
                          {group.description && (
                            <p className="text-xs text-muted-foreground">{group.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(group.name, "grupo de ação", () => deleteActionGroup(group.id))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tipos de Ação</CardTitle>
                    <CardDescription>
                      Ações específicas dentro dos grupos
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsAddActionTypeOpen(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {optionsLoading ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">Carregando...</p>
                  </div>
                ) : actionTypes.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">Nenhum tipo cadastrado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {actionTypes.map((type) => (
                      <div key={type.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium text-sm">{type.name}</p>
                          {type.action_group_id && (
                            <p className="text-xs text-muted-foreground">
                              Grupo: {actionGroups.find(g => g.id === type.action_group_id)?.name || 'N/A'}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(type.name, "tipo de ação", () => deleteActionType(type.id))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="motivos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Motivos de Perda</CardTitle>
              <CardDescription>
                Defina os motivos pelos quais um lead pode ser perdido
              </CardDescription>
            </CardHeader>
            <CardContent>
              {optionsLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando motivos...</p>
                </div>
              ) : lossReasons.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum motivo cadastrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lossReasons.map((reason) => (
                    <div key={reason.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <p className="font-medium">{reason.reason}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(reason.reason, "motivo de perda", () => deleteLossReason(reason.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddLeadSourceDialog 
        isOpen={isAddSourceOpen} 
        onClose={() => setIsAddSourceOpen(false)} 
        onSourceAdded={refreshData}
      />
      
      <AddColumnDialog 
        isOpen={isAddColumnOpen} 
        onClose={() => setIsAddColumnOpen(false)} 
        onAddColumn={handleAddColumn}
        maxOrder={maxOrder}
      />
      
      <AddActionGroupDialog 
        isOpen={isAddActionGroupOpen} 
        onClose={() => setIsAddActionGroupOpen(false)} 
        onGroupAdded={refreshData}
      />
      
      <AddActionTypeDialog 
        isOpen={isAddActionTypeOpen} 
        onClose={() => setIsAddActionTypeOpen(false)} 
        onTypeAdded={refreshData}
        actionGroups={actionGroups}
      />

      <EditCompanyModal
        isOpen={isEditCompanyOpen}
        onClose={() => setIsEditCompanyOpen(false)}
        companyInfo={companyInfo}
        onSave={updateCompanyInfo}
        isLoading={companyLoading}
      />

      <ConfirmDeleteDialog
        open={confirmDelete.open}
        onConfirm={confirmDeleteAction}
        onOpenChange={cancelDelete}
        itemName={confirmDelete.itemName}
        itemType={confirmDelete.itemType}
      />
    </div>
  );
}
