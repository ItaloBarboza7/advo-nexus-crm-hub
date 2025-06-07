
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface RecommendationItemProps {
  title: string;
  description: string | React.ReactNode;
  icon: React.ReactNode;
  onComplete: () => void;
}

export function RecommendationItem({ title, description, icon, onComplete }: RecommendationItemProps) {
  return (
    <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className="flex-shrink-0 bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 tracking-tight">{title}</h3>
            <div className="text-gray-700 leading-relaxed text-sm">
              {description}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onComplete}
          className="ml-4 flex-shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-medium"
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Implementado
        </Button>
      </div>
    </div>
  );
}
