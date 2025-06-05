
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, FileText, ChevronDown } from "lucide-react";

interface ActionToggleDropdownProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function ActionToggleDropdown({ selectedCategory, onCategoryChange }: ActionToggleDropdownProps) {
  const mainCategory = selectedCategory.split('-')[0];
  
  // Só mostrar o dropdown se estivermos em uma categoria válida (contratos, oportunidades, perdas)
  if (!["contratos", "oportunidades", "perdas"].includes(mainCategory)) {
    return null;
  }

  const isGroupView = selectedCategory.includes("-grupo-acao");
  const currentLabel = isGroupView ? "Grupo de Ação" : "Tipo de Ação";
  const CurrentIcon = isGroupView ? Users : FileText;

  const handleOptionSelect = (viewType: 'tipo' | 'grupo') => {
    const suffix = viewType === 'grupo' ? '-grupo-acao' : '';
    onCategoryChange(`${mainCategory}${suffix}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CurrentIcon className="h-4 w-4" />
          {currentLabel}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-50 bg-white dark:bg-gray-800">
        <DropdownMenuItem 
          onClick={() => handleOptionSelect('tipo')}
          className="gap-2 cursor-pointer"
        >
          <FileText className="h-4 w-4" />
          Tipo de Ação
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleOptionSelect('grupo')}
          className="gap-2 cursor-pointer"
        >
          <Users className="h-4 w-4" />
          Grupo de Ação
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
