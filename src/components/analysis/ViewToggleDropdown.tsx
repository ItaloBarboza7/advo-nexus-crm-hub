
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
  isActive?: boolean;
}

export function ViewToggleDropdown({ 
  currentView, 
  onViewChange, 
  label = "Visualização",
  isActive = false
}: ViewToggleDropdownProps) {
  console.log(`🔍 ViewToggleDropdown (${label}) - currentView: ${currentView}, onViewChange: ${!!onViewChange}`);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={isActive ? "default" : "outline"} 
          size="sm" 
          className={`h-8 transition-all duration-200 ${
            isActive 
              ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20" 
              : "hover:bg-muted/50"
          }`}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          {currentView === 'weekly' ? 'Semanal' : 'Mensal'}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
        <DropdownMenuItem 
          onClick={() => {
            console.log(`🎯 ViewToggleDropdown (${label}) - Clicando em weekly`);
            onViewChange('weekly');
          }}
          className="cursor-pointer"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Visualização Semanal
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => {
            console.log(`🎯 ViewToggleDropdown (${label}) - Clicando em monthly`);
            onViewChange('monthly');
          }}
          className="cursor-pointer"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Visualização Mensal
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
