
import { Checkbox } from "@/components/ui/checkbox";

interface LossReasonFilterProps {
  lossReasons: Array<{ id: string; reason: string; is_fixed: boolean }>;
  activeFilters: string[];
  onLossReasonChange: (lossReason: string, checked: boolean) => void;
}

export function LossReasonFilter({ lossReasons, activeFilters, onLossReasonChange }: LossReasonFilterProps) {
  console.log(`🔍 LossReasonFilter - Renderizando ${lossReasons.length} motivos de perda`);
  console.log(`📋 LossReasonFilter - Motivos:`, lossReasons.map(r => r.reason));
  console.log(`🏷️ LossReasonFilter - Filtros ativos:`, activeFilters);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Motivo da Perda</h4>
      <div className="space-y-2">
        {lossReasons.length === 0 ? (
          <p className="text-xs text-gray-500 italic">Nenhum motivo de perda encontrado</p>
        ) : (
          lossReasons.map((reason) => (
            <div key={reason.id} className="flex items-center space-x-2">
              <Checkbox
                id={`loss-reason-${reason.id}`}
                checked={activeFilters.includes(reason.reason)}
                onCheckedChange={(checked) => {
                  console.log(`☑️ LossReasonFilter - Alterando filtro "${reason.reason}": ${checked}`);
                  onLossReasonChange(reason.reason, checked as boolean);
                }}
              />
              <label 
                htmlFor={`loss-reason-${reason.id}`} 
                className="text-sm text-gray-600 cursor-pointer flex items-center gap-1"
              >
                {reason.reason}
                {reason.is_fixed && <span className="text-xs text-blue-500">(Sistema)</span>}
              </label>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
