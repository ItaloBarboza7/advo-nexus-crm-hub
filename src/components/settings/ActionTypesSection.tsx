
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { AddActionTypeDialog } from "@/components/AddActionTypeDialog";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function ActionTypesSection() {
  const { actionGroupOptions, getActionTypeOptions, loading, refreshData } = useFilterOptions();
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  const handleDeleteActionType = async (typeName: string) => {
    try {
      const { error } = await supabase
        .from('action_types')
        .delete()
        .eq('name', typeName);

      if (error) {
        console.error('Erro ao excluir tipo de ação:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o tipo de ação.",
          variant: "destructive"
        });
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Tipo de ação excluído com sucesso.",
      });

      refreshData();
    } catch (error) {
      console.error('Erro inesperado ao excluir tipo:', error);
      throw error;
    }
  };

  const actionTypes = selectedGroup ? getActionTypeOptions(selectedGroup) : [];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Ação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Tipos de Ação</CardTitle>
          <Button 
            onClick={() => setShowAddDialog(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!selectedGroup}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione um grupo de ação:
              </label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um grupo de ação" />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-lg z-50">
                  {actionGroupOptions.map((group) => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedGroup && (
              <div className="space-y-2">
                {actionTypes.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhum tipo de ação cadastrado para este grupo.</p>
                ) : (
                  actionTypes.map((type) => (
                    <div key={type.value} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">{type.label}</span>
                      <DeleteButton
                        onDelete={() => handleDeleteActionType(type.value)}
                        itemName={type.label}
                        itemType="tipo de ação"
                        size="sm"
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AddActionTypeDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onTypeAdded={() => {
          refreshData();
          setShowAddDialog(false);
        }}
        selectedGroupName={selectedGroup}
      />
    </>
  );
}
