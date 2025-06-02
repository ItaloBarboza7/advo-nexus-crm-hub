
import { LossReasonsChart } from "@/components/LossReasonsChart";
import { ActionTypesChart } from "@/components/ActionTypesChart";
import { StateStatsChart } from "@/components/StateStatsChart";
import { Lead } from "@/types/lead";

interface ChartsSectionProps {
  leads: Lead[];
  selectedCategory: string;
  shouldShowChart: boolean;
  shouldShowLossReasonsChart: boolean;
  shouldShowActionTypesChart: boolean;
  shouldShowStateChart: boolean;
  hasLeadPassedThroughStatus: (leadId: string, statuses: string[]) => boolean;
}

export function ChartsSection({
  leads,
  selectedCategory,
  shouldShowChart,
  shouldShowLossReasonsChart,
  shouldShowActionTypesChart,
  shouldShowStateChart,
  hasLeadPassedThroughStatus
}: ChartsSectionProps) {
  if (!shouldShowChart) {
    return null;
  }

  return (
    <>
      {shouldShowLossReasonsChart && (
        <LossReasonsChart leads={leads} />
      )}
      
      {shouldShowActionTypesChart && (
        <ActionTypesChart 
          leads={leads} 
          selectedCategory={selectedCategory}
        />
      )}

      {shouldShowStateChart && (
        <StateStatsChart 
          leads={leads} 
          selectedCategory={selectedCategory}
          hasLeadPassedThroughStatus={hasLeadPassedThroughStatus}
        />
      )}
    </>
  );
}
