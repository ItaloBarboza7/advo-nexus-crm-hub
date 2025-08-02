
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

  const handleLeadUpdated = () => {
    setIsEditFormOpen(false);
    setSelectedLead(null);
  };

  const handleDetailsClose = (open: boolean) => {
    setIsDetailsDialogOpen(open);
    if (!open) {
      setSelectedLead(null);
    }
  };

  const handleEditClose = (open: boolean) => {
    setIsEditFormOpen(open);
    if (!open) {
      setSelectedLead(null);
    }
  };

  return {
    selectedLead,
    isDetailsDialogOpen,
    setIsDetailsDialogOpen: handleDetailsClose,
    isEditFormOpen,
    setIsEditFormOpen: handleEditClose,
    handleViewDetails,
    handleEditLead,
    handleLeadUpdated
  };
}
