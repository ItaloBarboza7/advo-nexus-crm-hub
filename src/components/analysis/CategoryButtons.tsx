
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

interface CategoryButtonsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryButtons({ selectedCategory, onCategoryChange }: CategoryButtonsProps) {
  // Extrair a categoria principal e subcategoria
  const mainCategory = selectedCategory.split('-')[0];

  const handleCategoryClick = (category: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onCategoryChange(category);
  };

  // Função para verificar se um botão deve estar ativo
  const isButtonActive = (buttonCategory: string) => {
    // Para botões principais (contratos, oportunidades, perdas)
    if (!buttonCategory.includes('-')) {
      return selectedCategory === buttonCategory || 
             (selectedCategory.startsWith(buttonCategory + '-') && 
              !selectedCategory.includes('-estados') && 
              !selectedCategory.includes('-grupo-acao'));
    }
    // Para botões de estados
    return selectedCategory === buttonCategory;
  };

  // Card Novos Contratos - mostrar apenas "Novos Contratos" e "Estados"
  if (mainCategory === "contratos") {
    return (
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={isButtonActive("contratos") ? "default" : "outline"}
          onClick={(e) => handleCategoryClick("contratos", e)}
        >
          Novos Contratos
        </Button>
        <Button
          variant={selectedCategory === "contratos-estados" ? "default" : "outline"}
          onClick={(e) => handleCategoryClick("contratos-estados", e)}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Estados
        </Button>
      </div>
    );
  }

  // Card Oportunidades - mostrar apenas "Oportunidades" e "Estados"
  if (mainCategory === "oportunidades") {
    return (
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={isButtonActive("oportunidades") ? "default" : "outline"}
          onClick={(e) => handleCategoryClick("oportunidades", e)}
        >
          Oportunidades
        </Button>
        <Button
          variant={selectedCategory === "oportunidades-estados" ? "default" : "outline"}
          onClick={(e) => handleCategoryClick("oportunidades-estados", e)}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Estados
        </Button>
      </div>
    );
  }

  // Card Perdas - mostrar apenas "Perdas" e "Estados"
  if (mainCategory === "perdas") {
    return (
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={isButtonActive("perdas") ? "default" : "outline"}
          onClick={(e) => handleCategoryClick("perdas", e)}
        >
          Perdas
        </Button>
        <Button
          variant={selectedCategory === "perdas-estados" ? "default" : "outline"}
          onClick={(e) => handleCategoryClick("perdas-estados", e)}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Estados
        </Button>
      </div>
    );
  }

  // Botões para categoria "all"
  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant={selectedCategory === "all" ? "default" : "outline"}
        onClick={(e) => handleCategoryClick("all", e)}
      >
        Todos
      </Button>
      <Button
        variant={selectedCategory === "estados" ? "default" : "outline"}
        onClick={(e) => handleCategoryClick("estados", e)}
      >
        <MapPin className="h-4 w-4 mr-2" />
        Estados
      </Button>
    </div>
  );
}
