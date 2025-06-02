
import { LeadDetailsDialog } from "@/components/LeadDetailsDialog";
import { EditLeadForm } from "@/components/EditLeadForm";
import { Lead } from "@/types/lead";

interface LeadDialogsProps {
  selectedLead: Lead | null;
  isDetailsDialogOpen: boolean;
  setIsDetailsDialogOpen: (open: boolean) => void;
  isEditFormOpen: boolean;
  setIsEditFormOpen: (open: boolean) => void;
  onEditLead: (lead: Lead) => void;
  onLeadUpdated: () => void;
}

export function LeadDialogs({
  selectedLead,
  isDetailsDialogOpen,
  setIsDetailsDialogOpen,
  isEditFormOpen,
  setIsEditFormOpen,
  onEditLead,
  onLeadUpdated
}: LeadDialogsProps) {
  return (
    <>
      <LeadDetailsDialog
        lead={selectedLead}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        onEditLead={onEditLead}
      />

      <EditLeadForm
        lead={selectedLead}
        open={isEditFormOpen}
        onOpenChange={setIsEditFormOpen}
        onLeadUpdated={onLeadUpdated}
      />
    </>
  );
}
