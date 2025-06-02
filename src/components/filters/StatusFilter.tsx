
import { Checkbox } from "@/components/ui/checkbox";

interface StatusFilterProps {
  statusOptions: Array<{ value: string; label: string }>;
  activeFilters: string[];
  onStatusChange: (status: string, checked: boolean) => void;
}

export function StatusFilter({ statusOptions, activeFilters, onStatusChange }: StatusFilterProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Status</h4>
      <div className="space-y-2">
        {statusOptions.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={`status-${option.value}`}
              checked={activeFilters.includes(option.value)}
              onCheckedChange={(checked) => 
                onStatusChange(option.value, checked as boolean)
              }
            />
            <label 
              htmlFor={`status-${option.value}`} 
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
