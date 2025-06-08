
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DeleteButton } from "@/components/DeleteButton";

interface LossReasonManagerProps {
  lossReason: { id: string; reason: string };
  onDeleted: () => void;
}

export function LossReasonManager({ lossReason, onDeleted }: LossReasonManagerProps) {
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      console.log('🔥 [LossReasonManager] Iniciando exclusão do motivo:', lossReason.reason);

      const { error } = await supabase
        .from('loss_reasons')
        .delete()
        .eq('id', lossReason.id);

      if (error) {
        console.error('❌ [LossReasonManager] Erro ao excluir motivo de perda:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o motivo de perda.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ [LossReasonManager] Motivo de perda excluído com sucesso');
      
      toast({
        title: "Sucesso",
        description: `Motivo "${lossReason.reason}" excluído com sucesso.`,
      });

      // Notificar o componente pai para atualizar a lista
      onDeleted();
    } catch (error) {
      console.error('❌ [LossReasonManager] Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  return (
    <DeleteButton
      onDelete={handleDelete}
      itemName={lossReason.reason}
      itemType="motivo de perda"
    />
  );
}
