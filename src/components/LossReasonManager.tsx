
import { DeleteButton } from "@/components/DeleteButton";

interface LossReasonManagerProps {
  lossReason: { id: string; reason: string };
  onDeleted: (lossReasonId: string, lossReasonName: string) => Promise<boolean>;
}

export function LossReasonManager({ lossReason, onDeleted }: LossReasonManagerProps) {
  const handleDelete = async () => {
    console.log('🔥 [LossReasonManager] Solicitando exclusão do motivo:', lossReason.reason);
    
    try {
      // Chamar a função de callback que irá lidar com a exclusão
      const success = await onDeleted(lossReason.id, lossReason.reason);
      console.log('✅ [LossReasonManager] Resultado da exclusão:', success);
      // Note: DeleteButton expects Promise<void>, so we don't return the success value
    } catch (error) {
      console.error('❌ [LossReasonManager] Erro durante exclusão:', error);
      throw error;
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
