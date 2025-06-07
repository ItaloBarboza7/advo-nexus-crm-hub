
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface RecommendationItemProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onComplete: () => void;
}

export function RecommendationItem({ title, description, icon, onComplete }: RecommendationItemProps) {
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className="flex-shrink-0">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 leading-relaxed">{description}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onComplete}
          className="ml-4 flex-shrink-0 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Concluído
        </Button>
      </div>
    </div>
  );
}
