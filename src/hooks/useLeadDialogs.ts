
import { useState, useEffect } from "react";
import { Lead } from "@/types/lead";

export function useLeadDialogs(leads?: Lead[]) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  // 🎯 ATUALIZAR selectedLead quando leads mudarem (para refletir mudanças de status)
  useEffect(() => {
    if (selectedLead && leads) {
      const updatedLead = leads.find(lead => lead.id === selectedLead.id);
      if (updatedLead && updatedLead.status !== selectedLead.status) {
        console.log(`🔄 useLeadDialogs - Atualizando selectedLead: ${selectedLead.name}, status: ${selectedLead.status} -> ${updatedLead.status}`);
        setSelectedLead(updatedLead);
      }
    }
  }, [leads, selectedLead]);

  const handleViewDetails = (lead: Lead) => {
    console.log("🔍 handleViewDetails chamado com lead:", lead.name, "status:", lead.status);
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
