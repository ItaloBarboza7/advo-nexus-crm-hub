
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

interface CategoryButtonsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryButtons({ selectedCategory, onCategoryChange }: CategoryButtonsProps) {
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
