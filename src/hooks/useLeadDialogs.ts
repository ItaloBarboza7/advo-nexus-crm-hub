
import { useState } from "react";
import { Lead } from "@/types/lead";

export function useLeadDialogs() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  const handleViewDetails = (lead: Lead) => {
    console.log("🔍 handleViewDetails chamado com lead:", lead.name);
    setSelectedLead(lead);
    setIsDetailsDialogOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    console.log("✏️ handleEditLead chamado com lead:", lead.name);
    console.log("📋 Lead completo:", lead);
    setSelectedLead(lead);
    setIsEditFormOpen(true);
    setIsDetailsDialogOpen(false);
  };

  return {
    selectedLead,
    isDetailsDialogOpen,
    setIsDetailsDialogOpen,
    isEditFormOpen,
    setIsEditFormOpen,
    handleViewDetails,
    handleEditLead
  };
}
