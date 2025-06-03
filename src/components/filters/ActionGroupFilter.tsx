
import { Checkbox } from "@/components/ui/checkbox";

interface ActionGroupFilterProps {
  actionGroupOptions: Array<{ value: string; label: string }>;
  activeFilters: string[];
  onActionGroupChange: (actionGroup: string, checked: boolean) => void;
}

export function ActionGroupFilter({ actionGroupOptions, activeFilters, onActionGroupChange }: ActionGroupFilterProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Grupo de Ação</h4>
      <div className="space-y-2">
        {actionGroupOptions.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={`action-group-${option.value}`}
              checked={activeFilters.includes(option.value)}
              onCheckedChange={(checked) => 
                onActionGroupChange(option.value, checked as boolean)
              }
            />
            <label 
              htmlFor={`action-group-${option.value}`} 
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
