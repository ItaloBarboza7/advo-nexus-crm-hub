
import { LeadDetailsDialog } from "@/components/LeadDetailsDialog";
import { EditLeadForm } from "@/components/EditLeadForm";
import { Lead } from "@/types/lead";
import { useLeadsData } from "@/hooks/useLeadsData";

interface LeadDialogsProps {
  selectedLead: Lead | null;
  isDetailsDialogOpen: boolean;
  setIsDetailsDialogOpen: (open: boolean) => void;
  isEditFormOpen: boolean;
  setIsEditFormOpen: (open: boolean) => void;
  onEditLead: (lead: Lead) => void;
  onLeadUpdated: () => void;
  lossReasons?: Array<{ id: string; reason: string }>;
  onAddLossReason?: (reason: string) => Promise<boolean>;
}

export function LeadDialogs({
  selectedLead,
  isDetailsDialogOpen,
  setIsDetailsDialogOpen,
  isEditFormOpen,
  setIsEditFormOpen,
  onEditLead,
  onLeadUpdated,
  lossReasons: externalLossReasons,
  onAddLossReason: externalOnAddLossReason
}: LeadDialogsProps) {
  // Se não receber os dados como props, usar o hook centralizado
  const { lossReasons: centralLossReasons, addLossReason: centralAddLossReason } = useLeadsData();
  
  const lossReasons = externalLossReasons || centralLossReasons;
  const onAddLossReason = externalOnAddLossReason || centralAddLossReason;

  console.log("🎯 LeadDialogs - Motivos de perda disponíveis:", lossReasons?.length || 0);

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
        lossReasons={lossReasons}
        onAddLossReason={onAddLossReason}
      />
    </>
  );
}
