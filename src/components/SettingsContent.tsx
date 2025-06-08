
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, GripVertical, Users, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddColumnDialog } from "@/components/AddColumnDialog";
import { useKanbanColumns } from "@/hooks/useKanbanColumns";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useFilterOptions } from "@/hooks/useFilterOptions";

interface ActionGroup {
  value: string;
  label: string;
}

interface ActionType {
  value: string;
  label: string;
  group: string;
}

export function SettingsContent() {
  const [isAddColumnDialogOpen, setIsAddColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [actionGroups, setActionGroups] = useState<ActionGroup[]>([]);
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [editingActionGroup, setEditingActionGroup] = useState<string | null>(null);
  const [editingActionType, setEditingActionType] = useState<string | null>(null);
  const [editActionGroupValue, setEditActionGroupValue] = useState("");
  const [editActionTypeValue, setEditActionTypeValue] = useState("");
  const [newActionGroup, setNewActionGroup] = useState("");
  const [newActionType, setNewActionType] = useState("");
  const [selectedGroupForNewType, setSelectedGroupForNewType] = useState("");
  
  const { toast } = useToast();
  const { 
    columns, 
    isLoading, 
    addColumn, 
    updateColumn, 
    deleteColumn, 
    reorderColumns 
  } = useKanbanColumns();
  const { actionGroupOptions, getActionTypeOptions } = useFilterOptions();

  // Load existing action groups and types from the filter options
  useEffect(() => {
    setActionGroups(actionGroupOptions);
    
    // Create action types from all groups
    const allTypes: ActionType[] = [];
    actionGroupOptions.forEach(group => {
      const types = getActionTypeOptions(group.value);
      types.forEach(type => {
        allTypes.push({
          value: type.value,
          label: type.label,
          group: group.value
        });
      });
    });
    setActionTypes(allTypes);
  }, [actionGroupOptions, getActionTypeOptions]);

  const handleEditColumn = async (columnId: string) => {
    if (!editValue.trim()) {
      toast({
        title: "Erro",
        description: "O nome da coluna não pode estar vazio.",
        variant: "destructive"
      });
      return;
    }

    const success = await updateColumn(columnId, { name: editValue.trim() });
    if (success) {
      setEditingColumn(null);
      setEditValue("");
    }
  };

  const handleDeleteColumn = async (columnId: string, columnName: string) => {
    if (columns.find(col => col.id === columnId)?.is_default) {
      toast({
        title: "Erro",
        description: "Não é possível excluir colunas padrão.",
        variant: "destructive"
      });
      return;
    }

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir a coluna "${columnName}"?\n\nTodos os leads desta coluna serão movidos para "Finalizado".`
    );
    
    if (confirmDelete) {
      await deleteColumn(columnId);
    }
  };

  const startEditingColumn = (column: any) => {
    setEditingColumn(column.id);
    setEditValue(column.name);
  };

  const cancelEditingColumn = () => {
    setEditingColumn(null);
    setEditValue("");
  };

  const handleAddActionGroup = () => {
    if (!newActionGroup.trim()) return;
    
    const newGroup: ActionGroup = {
      value: newActionGroup.trim().toLowerCase().replace(/\s+/g, '-'),
      label: newActionGroup.trim()
    };
    
    setActionGroups(prev => [...prev, newGroup]);
    setNewActionGroup("");
    
    toast({
      title: "Sucesso",
      description: "Grupo de ação adicionado com sucesso.",
    });
  };

  const handleEditActionGroup = (group: ActionGroup) => {
    setEditingActionGroup(group.value);
    setEditActionGroupValue(group.label);
  };

  const handleSaveActionGroup = () => {
    if (!editActionGroupValue.trim()) return;
    
    setActionGroups(prev => 
      prev.map(group => 
        group.value === editingActionGroup 
          ? { ...group, label: editActionGroupValue.trim() }
          : group
      )
    );
    
    setEditingActionGroup(null);
    setEditActionGroupValue("");
    
    toast({
      title: "Sucesso",
      description: "Grupo de ação atualizado com sucesso.",
    });
  };

  const handleDeleteActionGroup = (groupValue: string) => {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir este grupo de ação?\n\nTodos os tipos de ação relacionados também serão removidos.`
    );
    
    if (confirmDelete) {
      setActionGroups(prev => prev.filter(group => group.value !== groupValue));
      setActionTypes(prev => prev.filter(type => type.group !== groupValue));
      
      toast({
        title: "Sucesso",
        description: "Grupo de ação excluído com sucesso.",
      });
    }
  };

  const handleAddActionType = () => {
    if (!newActionType.trim() || !selectedGroupForNewType) return;
    
    const newType: ActionType = {
      value: newActionType.trim().toLowerCase().replace(/\s+/g, '-'),
      label: newActionType.trim(),
      group: selectedGroupForNewType
    };
    
    setActionTypes(prev => [...prev, newType]);
    setNewActionType("");
    setSelectedGroupForNewType("");
    
    toast({
      title: "Sucesso",
      description: "Tipo de ação adicionado com sucesso.",
    });
  };

  const handleEditActionType = (type: ActionType) => {
    setEditingActionType(type.value);
    setEditActionTypeValue(type.label);
  };

  const handleSaveActionType = () => {
    if (!editActionTypeValue.trim()) return;
    
    setActionTypes(prev => 
      prev.map(type => 
        type.value === editingActionType 
          ? { ...type, label: editActionTypeValue.trim() }
          : type
      )
    );
    
    setEditingActionType(null);
    setEditActionTypeValue("");
    
    toast({
      title: "Sucesso",
      description: "Tipo de ação atualizado com sucesso.",
    });
  };

  const handleDeleteActionType = (typeValue: string) => {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir este tipo de ação?`
    );
    
    if (confirmDelete) {
      setActionTypes(prev => prev.filter(type => type.value !== typeValue));
      
      toast({
        title: "Sucesso",
        description: "Tipo de ação excluído com sucesso.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações</h1>
        <p className="text-gray-600">
          Gerencie as configurações do sistema e personalize o fluxo de trabalho
        </p>
      </div>

      {/* Kanban Columns Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Colunas do Kanban
          </CardTitle>
          <CardDescription>
            Gerencie as colunas do quadro Kanban para organizar seus leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Arraste as colunas para reordenar ou clique para editar
            </p>
            <Button 
              onClick={() => setIsAddColumnDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Coluna
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-4">
              <p className="text-gray-500">Carregando colunas...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {columns.map((column, index) => (
                <div
                  key={column.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border"
                >
                  <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                  
                  <div className="flex-1">
                    {editingColumn === column.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1"
                          onKeyPress={(e) => e.key === 'Enter' && handleEditColumn(column.id)}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleEditColumn(column.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditingColumn}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{column.name}</span>
                        {column.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            Padrão
                          </Badge>
                        )}
                        <span className="text-sm text-gray-500">
                          Posição: {index + 1}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditingColumn(column)}
                      disabled={editingColumn !== null}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteColumn(column.id, column.name)}
                      disabled={column.is_default || editingColumn !== null}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurar Ações
          </CardTitle>
          <CardDescription>
            Gerencie os grupos de ação e tipos de ação disponíveis para os leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Collapsible open={isActionsOpen} onOpenChange={setIsActionsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <span className="text-left">
                  <strong>Configurações de Ações</strong>
                  <p className="text-sm text-gray-600">
                    Clique para expandir e configurar grupos e tipos de ação
                  </p>
                </span>
                {isActionsOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-6 mt-6">
              {/* Action Groups */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Grupos de Ação</h3>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Novo grupo de ação..."
                      value={newActionGroup}
                      onChange={(e) => setNewActionGroup(e.target.value)}
                      className="w-48"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddActionGroup()}
                    />
                    <Button
                      size="sm"
                      onClick={handleAddActionGroup}
                      disabled={!newActionGroup.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid gap-2">
                  {actionGroups.map((group) => (
                    <div key={group.value} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                      {editingActionGroup === group.value ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editActionGroupValue}
                            onChange={(e) => setEditActionGroupValue(e.target.value)}
                            className="flex-1"
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveActionGroup()}
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveActionGroup}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingActionGroup(null);
                              setEditActionGroupValue("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <span className="font-medium">{group.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditActionGroup(group)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteActionGroup(group.value)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Types */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Tipos de Ação</h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedGroupForNewType}
                      onChange={(e) => setSelectedGroupForNewType(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Selecione o grupo</option>
                      {actionGroups.map((group) => (
                        <option key={group.value} value={group.value}>
                          {group.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Novo tipo de ação..."
                      value={newActionType}
                      onChange={(e) => setNewActionType(e.target.value)}
                      className="w-48"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddActionType()}
                    />
                    <Button
                      size="sm"
                      onClick={handleAddActionType}
                      disabled={!newActionType.trim() || !selectedGroupForNewType}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid gap-2">
                  {actionTypes.map((type) => (
                    <div key={type.value} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                      {editingActionType === type.value ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editActionTypeValue}
                            onChange={(e) => setEditActionTypeValue(e.target.value)}
                            className="flex-1"
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveActionType()}
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveActionType}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingActionType(null);
                              setEditActionTypeValue("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{type.label}</span>
                              <Badge variant="outline" className="text-xs">
                                {actionGroups.find(g => g.value === type.group)?.label || type.group}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditActionType(type)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteActionType(type.value)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <AddColumnDialog
        open={isAddColumnDialogOpen}
        onOpenChange={setIsAddColumnDialogOpen}
        onColumnAdded={addColumn}
      />
    </div>
  );
}
