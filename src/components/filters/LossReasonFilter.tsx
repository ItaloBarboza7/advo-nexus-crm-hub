
import { Checkbox } from "@/components/ui/checkbox";
import { LossReasonManager } from "@/components/LossReasonManager";

interface LossReasonFilterProps {
  lossReasons: Array<{ id: string; reason: string }>;
  activeFilters: string[];
  onLossReasonChange: (lossReason: string, checked: boolean) => void;
  onDeleteLossReason?: (lossReasonId: string, lossReasonName: string) => Promise<boolean>;
  onAddLossReason?: (reason: string) => Promise<boolean>;
}

export function LossReasonFilter({ 
  lossReasons, 
  activeFilters, 
  onLossReasonChange,
  onDeleteLossReason,
  onAddLossReason
}: LossReasonFilterProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Motivo da Perda</h4>
      <div className="space-y-2">
        {lossReasons.map((reason) => (
          <div key={reason.id} className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2 flex-1">
              <Checkbox
                id={`loss-reason-${reason.id}`}
                checked={activeFilters.includes(reason.reason)}
                onCheckedChange={(checked) => 
                  onLossReasonChange(reason.reason, checked as boolean)
                }
              />
              <label 
                htmlFor={`loss-reason-${reason.id}`} 
                className="text-sm text-gray-600 cursor-pointer"
              >
                {reason.reason}
              </label>
            </div>
            {onDeleteLossReason && (
              <LossReasonManager
                lossReason={reason}
                onDeleted={onDeleteLossReason}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
