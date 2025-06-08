
import { useState } from "react";
import { Lead } from "@/types/lead";
import { useLeadsData } from "./useLeadsData";

export function useLeadDialogsWithData() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  
  const { lossReasons, addLossReason, fetchLeads } = useLeadsData();

  const handleEditLead = (lead: Lead) => {
    console.log("✏️ useLeadDialogsWithData - handleEditLead chamado com lead:", lead.name);
    console.log("📋 Lead completo:", lead);
    setSelectedLead(lead);
    setIsEditFormOpen(true);
    // Fechar o dialog de detalhes se estiver aberto
    setIsDetailsDialogOpen(false);
  };

  const handleViewDetails = (lead: Lead) => {
    console.log("🔍 useLeadDialogsWithData - handleViewDetails chamado com lead:", lead.name);
    setSelectedLead(lead);
    setIsDetailsDialogOpen(true);
  };

  const handleLeadUpdated = async () => {
    console.log("🔄 useLeadDialogsWithData - Lead atualizado, recarregando dados...");
    await fetchLeads();
  };

  return {
    selectedLead,
    isDetailsDialogOpen,
    setIsDetailsDialogOpen,
    isEditFormOpen,
    setIsEditFormOpen,
    handleEditLead,
    handleViewDetails,
    handleLeadUpdated,
    lossReasons,
    addLossReason
  };
}
