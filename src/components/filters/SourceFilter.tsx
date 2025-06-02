
import { Checkbox } from "@/components/ui/checkbox";

interface SourceFilterProps {
  sourceOptions: Array<{ value: string; label: string }>;
  activeFilters: string[];
  onSourceChange: (source: string, checked: boolean) => void;
}

export function SourceFilter({ sourceOptions, activeFilters, onSourceChange }: SourceFilterProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Fonte</h4>
      <div className="space-y-2">
        {sourceOptions.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={`source-${option.value}`}
              checked={activeFilters.includes(option.value)}
              onCheckedChange={(checked) => 
                onSourceChange(option.value, checked as boolean)
              }
            />
            <label 
              htmlFor={`source-${option.value}`} 
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
