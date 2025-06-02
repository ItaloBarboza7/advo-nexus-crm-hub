
import { Card } from "@/components/ui/card";
import { GroupedLeadsList } from "@/components/GroupedLeadsList";
import { Lead } from "@/types/lead";

interface LeadsSectionProps {
  filteredLeads: Lead[];
  selectedCategory: string;
  isLoading: boolean;
  shouldShowStateChart: boolean;
  onViewDetails: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
}

export function LeadsSection({
  filteredLeads,
  selectedCategory,
  isLoading,
  shouldShowStateChart,
  onViewDetails,
  onEditLead
}: LeadsSectionProps) {
  if (shouldShowStateChart) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="p-12 text-center">
        <div className="text-gray-500">
          <p>Carregando leads...</p>
        </div>
      </Card>
    );
  }

  return (
    <GroupedLeadsList 
      leads={filteredLeads}
      selectedCategory={selectedCategory}
      onViewDetails={onViewDetails}
      onEditLead={onEditLead}
    />
  );
}
