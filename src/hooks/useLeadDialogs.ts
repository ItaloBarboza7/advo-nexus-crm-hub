
import { useState, useEffect } from "react";
import { Lead } from "@/types/lead";

export function useLeadDialogs(leads?: Lead[]) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  // 🎯 EXPANDIDO: Atualizar selectedLead quando leads mudarem para qualquer campo alterado
  useEffect(() => {
    if (selectedLead && leads) {
      const updatedLead = leads.find(lead => lead.id === selectedLead.id);
      if (updatedLead) {
        // Verificar se qualquer campo relevante mudou
        const fieldsToCheck = [
          'status', 'action_group', 'action_type', 'loss_reason', 
          'source', 'state', 'value', 'updated_at'
        ] as const;
        
        const hasChanges = fieldsToCheck.some(field => {
          const oldValue = selectedLead[field];
          const newValue = updatedLead[field];
          return oldValue !== newValue;
        });

        if (hasChanges) {
          console.log(`🔄 useLeadDialogs - Sync selectedLead: ${selectedLead.name}, mudanças detectadas:`, {
            old: {
              status: selectedLead.status,
              action_group: selectedLead.action_group,
              action_type: selectedLead.action_type,
              loss_reason: selectedLead.loss_reason,
              source: selectedLead.source,
              state: selectedLead.state,
              value: selectedLead.value
            },
            new: {
              status: updatedLead.status,
              action_group: updatedLead.action_group,
              action_type: updatedLead.action_type,
              loss_reason: updatedLead.loss_reason,
              source: updatedLead.source,
              state: updatedLead.state,
              value: updatedLead.value
            }
          });
          setSelectedLead(updatedLead);
        }
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
