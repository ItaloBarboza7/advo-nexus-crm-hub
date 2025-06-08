
import { DeleteButton } from "@/components/DeleteButton";

interface LossReasonManagerProps {
  lossReason: { id: string; reason: string };
  onDeleted: (lossReasonId: string, lossReasonName: string) => Promise<boolean>;
}

export function LossReasonManager({ lossReason, onDeleted }: LossReasonManagerProps) {
  const handleDelete = async () => {
    console.log('🔥 [LossReasonManager] Solicitando exclusão do motivo:', lossReason.reason);
    
    // Chamar a função de callback que irá lidar com a exclusão
    // passando os parâmetros necessários
    await onDeleted(lossReason.id, lossReason.reason);
  };

  return (
    <DeleteButton
      onDelete={handleDelete}
      itemName={lossReason.reason}
      itemType="motivo de perda"
    />
  );
}
