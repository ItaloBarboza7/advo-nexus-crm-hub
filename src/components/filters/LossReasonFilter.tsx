
import { Checkbox } from "@/components/ui/checkbox";

interface LossReasonFilterProps {
  lossReasons: Array<{ id: string; reason: string; is_fixed: boolean }>;
  activeFilters: string[];
  onLossReasonChange: (lossReason: string, checked: boolean) => void;
}

export function LossReasonFilter({ lossReasons, activeFilters, onLossReasonChange }: LossReasonFilterProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Motivo da Perda</h4>
      <div className="space-y-2">
        {lossReasons.map((reason) => (
          <div key={reason.id} className="flex items-center space-x-2">
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
        ))}
      </div>
    </div>
  );
}
