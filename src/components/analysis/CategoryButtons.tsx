
import { Button } from "@/components/ui/button";
import { MapPin, FileText } from "lucide-react";

interface CategoryButtonsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryButtons({ selectedCategory, onCategoryChange }: CategoryButtonsProps) {
  // Se a categoria selecionada for "perdas", mostrar apenas os botões específicos para perdas
  if (selectedCategory === "perdas") {
    return (
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="default"
          onClick={() => onCategoryChange("perdas")}
        >
          Perdas
        </Button>
        <Button
          variant={selectedCategory === "estados" ? "default" : "outline"}
          onClick={() => onCategoryChange("estados")}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Estados
        </Button>
        <Button
          variant={selectedCategory === "tipo-acao" ? "default" : "outline"}
          onClick={() => onCategoryChange("tipo-acao")}
        >
          <FileText className="h-4 w-4 mr-2" />
          Tipo de ação
        </Button>
      </div>
    );
  }

  // Botões padrão para outras categorias
  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant={selectedCategory === "all" ? "default" : "outline"}
        onClick={() => onCategoryChange("all")}
      >
        Todos
      </Button>
      <Button
        variant={selectedCategory === "contratos" ? "default" : "outline"}
        onClick={() => onCategoryChange("contratos")}
      >
        Novos Contratos
      </Button>
      <Button
        variant={selectedCategory === "oportunidades" ? "default" : "outline"}
        onClick={() => onCategoryChange("oportunidades")}
      >
        Oportunidades
      </Button>
      <Button
        variant={selectedCategory === "perdas" ? "default" : "outline"}
        onClick={() => onCategoryChange("perdas")}
      >
        Perdas
      </Button>
      <Button
        variant={selectedCategory === "estados" ? "default" : "outline"}
        onClick={() => onCategoryChange("estados")}
      >
        <MapPin className="h-4 w-4 mr-2" />
        Estados
      </Button>
    </div>
  );
}
