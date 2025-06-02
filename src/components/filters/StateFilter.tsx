
import { Checkbox } from "@/components/ui/checkbox";

interface StateFilterProps {
  stateOptions: Array<{ value: string; label: string }>;
  activeFilters: string[];
  onStateChange: (state: string, checked: boolean) => void;
}

export function StateFilter({ stateOptions, activeFilters, onStateChange }: StateFilterProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Estado</h4>
      <div className="space-y-2">
        {stateOptions.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={`state-${option.value}`}
              checked={activeFilters.includes(option.value)}
              onCheckedChange={(checked) => 
                onStateChange(option.value, checked as boolean)
              }
            />
            <label 
              htmlFor={`state-${option.value}`} 
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
