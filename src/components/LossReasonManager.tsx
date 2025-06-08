
import { DeleteButton } from "@/components/DeleteButton";

interface LossReasonManagerProps {
  lossReason: { id: string; reason: string };
  onDeleted: () => void;
}

export function LossReasonManager({ lossReason, onDeleted }: LossReasonManagerProps) {
  const handleDelete = async () => {
    console.log('🔥 [LossReasonManager] Solicitando exclusão do motivo:', lossReason.reason);
    
    // Chamar a função de callback que irá lidar com a exclusão
    // através da fonte centralizada (useLeadsData)
    onDeleted();
  };

  return (
    <DeleteButton
      onDelete={handleDelete}
      itemName={lossReason.reason}
      itemType="motivo de perda"
    />
  );
}
