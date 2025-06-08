
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { AddLossReasonDialog } from "@/components/AddLossReasonDialog";
import { useLossReasons } from "@/hooks/useLossReasons";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function LossReasonsSection() {
  const { lossReasons, loading, refreshData } = useLossReasons();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  const handleDeleteLossReason = async (reasonId: string) => {
    console.log(`🗑️ LossReasonsSection - Iniciando exclusão do motivo de perda: ${reasonId}`);
    
    try {
      const { error } = await supabase
        .from('loss_reasons')
        .delete()
        .eq('id', reasonId);

      if (error) {
        console.error('❌ LossReasonsSection - Erro ao excluir motivo de perda:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o motivo de perda.",
          variant: "destructive"
        });
        throw error;
      }

      console.log(`✅ LossReasonsSection - Motivo de perda excluído com sucesso: ${reasonId}`);
      
      toast({
        title: "Sucesso",
        description: "Motivo de perda excluído com sucesso.",
      });

      refreshData();
    } catch (error) {
      console.error('❌ LossReasonsSection - Erro inesperado ao excluir motivo:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Motivos de Perda</CardTitle>
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
          <CardTitle>Motivos de Perda</CardTitle>
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
            {lossReasons.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum motivo de perda cadastrado.</p>
            ) : (
              lossReasons.map((reason) => (
                <div key={reason.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">{reason.reason}</span>
                  <DeleteButton
                    onDelete={() => handleDeleteLossReason(reason.id)}
                    itemName={reason.reason}
                    itemType="motivo de perda"
                    size="sm"
                  />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AddLossReasonDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onReasonAdded={() => {
          refreshData();
          setShowAddDialog(false);
        }}
      />
    </>
  );
}
