
import { Checkbox } from "@/components/ui/checkbox";

interface ActionTypeFilterProps {
  actionTypeOptions: Array<{ value: string; label: string }>;
  activeFilters: string[];
  onActionTypeChange: (actionType: string, checked: boolean) => void;
}

export function ActionTypeFilter({ actionTypeOptions, activeFilters, onActionTypeChange }: ActionTypeFilterProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Tipo de Ação</h4>
      <div className="space-y-2">
        {actionTypeOptions.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={`action-${option.value}`}
              checked={activeFilters.includes(option.value)}
              onCheckedChange={(checked) => 
                onActionTypeChange(option.value, checked as boolean)
              }
            />
            <label 
              htmlFor={`action-${option.value}`} 
              className="text-sm text-gray-600 cursor-pointer"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
