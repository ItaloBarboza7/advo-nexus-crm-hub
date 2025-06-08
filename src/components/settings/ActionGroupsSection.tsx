
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { AddActionGroupDialog } from "@/components/AddActionGroupDialog";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function ActionGroupsSection() {
  const { actionGroupOptions, loading, refreshData } = useFilterOptions();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  const handleDeleteActionGroup = async (groupName: string) => {
    try {
      const { error } = await supabase
        .from('action_groups')
        .delete()
        .eq('name', groupName);

      if (error) {
        console.error('Erro ao excluir grupo de ação:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o grupo de ação.",
          variant: "destructive"
        });
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Grupo de ação excluído com sucesso.",
      });

      refreshData();
    } catch (error) {
      console.error('Erro inesperado ao excluir grupo:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Grupos de Ação</CardTitle>
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
          <CardTitle>Grupos de Ação</CardTitle>
          <Button 
            onClick={() => setShowAddDialog(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {actionGroupOptions.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum grupo de ação cadastrado.</p>
            ) : (
              actionGroupOptions.map((group) => (
                <div key={group.value} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">{group.label}</span>
                  <DeleteButton
                    onDelete={() => handleDeleteActionGroup(group.value)}
                    itemName={group.label}
                    itemType="grupo de ação"
                    size="sm"
                  />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AddActionGroupDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onGroupAdded={() => {
          refreshData();
          setShowAddDialog(false);
        }}
      />
    </>
  );
}
