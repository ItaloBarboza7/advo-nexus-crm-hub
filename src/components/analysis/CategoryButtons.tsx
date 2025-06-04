
import { Button } from "@/components/ui/button";
import { MapPin, FileText } from "lucide-react";

interface CategoryButtonsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryButtons({ selectedCategory, onCategoryChange }: CategoryButtonsProps) {
  // Extrair a categoria principal e subcategoria
  const mainCategory = selectedCategory.split('-')[0];
  const subCategory = selectedCategory.includes('-') ? selectedCategory.split('-')[1] : null;

  // Card Novos Contratos - mostrar apenas "Novos Contratos" e "Estados"
  if (mainCategory === "contratos") {
    return (
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategory === "contratos" ? "default" : "outline"}
          onClick={() => onCategoryChange("contratos")}
        >
          Novos Contratos
        </Button>
        <Button
          variant={selectedCategory === "contratos-estados" ? "default" : "outline"}
          onClick={() => onCategoryChange("contratos-estados")}
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
          variant={selectedCategory === "oportunidades" ? "default" : "outline"}
          onClick={() => onCategoryChange("oportunidades")}
        >
          Oportunidades
        </Button>
        <Button
          variant={selectedCategory === "oportunidades-estados" ? "default" : "outline"}
          onClick={() => onCategoryChange("oportunidades-estados")}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Estados
        </Button>
      </div>
    );
  }

  // Card Perdas - TROCADO: mostrar "Perdas", "Tipo de ação" e "Estados"
  if (mainCategory === "perdas") {
    return (
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategory === "perdas" ? "default" : "outline"}
          onClick={() => onCategoryChange("perdas")}
        >
          Perdas
        </Button>
        <Button
          variant={selectedCategory === "perdas-tipo-acao" ? "default" : "outline"}
          onClick={() => onCategoryChange("perdas-tipo-acao")}
        >
          <FileText className="h-4 w-4 mr-2" />
          Tipo de ação
        </Button>
        <Button
          variant={selectedCategory === "perdas-estados" ? "default" : "outline"}
          onClick={() => onCategoryChange("perdas-estados")}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Estados
        </Button>
      </div>
    );
  }

  // Botões para categoria "all" - CORRIGIDO: manter na mesma página
  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant={selectedCategory === "all" ? "default" : "outline"}
        onClick={() => onCategoryChange("all")}
      >
        Todos
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
