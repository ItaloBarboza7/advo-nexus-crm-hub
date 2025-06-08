
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Calendar, BarChart3 } from "lucide-react";

interface ViewToggleDropdownProps {
  currentView: 'weekly' | 'monthly';
  onViewChange: (view: 'weekly' | 'monthly') => void;
  label?: string;
}

export function ViewToggleDropdown({ 
  currentView, 
  onViewChange, 
  label = "Visualização" 
}: ViewToggleDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <BarChart3 className="h-4 w-4 mr-2" />
          {currentView === 'weekly' ? 'Semanal' : 'Mensal'}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
        <DropdownMenuItem 
          onClick={() => onViewChange('weekly')}
          className="cursor-pointer"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Visualização Semanal
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onViewChange('monthly')}
          className="cursor-pointer"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Visualização Mensal
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
