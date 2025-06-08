
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, DollarSign, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";
import { LossReasonDialog } from "@/components/LossReasonDialog";
import { DeleteLeadDialog } from "@/components/DeleteLeadDialog";
import { useLeadStatusHistory } from "@/hooks/useLeadStatusHistory";

interface TransformedLead {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: string;
  interest: string;
  value: string;
  lastContact: string;
  avatar: string;
  originalId: string;
  numericValue: number;
}

interface StatusConfig {
  id: string;
  title: string;
  color: string;
}

interface KanbanViewProps {
  leads: TransformedLead[];
  statuses: StatusConfig[];
  onLeadUpdated: () => void;
  onViewDetails: (lead: Lead) => void;
  originalLeads: Lead[];
}

export function KanbanView({ leads, statuses, onLeadUpdated, onViewDetails, originalLeads }: KanbanViewProps) {
  const { toast } = useToast();
  const [pendingStatusChange, setPendingStatusChange] = useState<{leadId: string, newStatus: string} | null>(null);
  const [isLossReasonDialogOpen, setIsLossReasonDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<{ id: string; name: string } | null>(null);
  const { hasLeadPassedThroughStatus } = useLeadStatusHistory();

  const getLeadsByStatus = (status: string) => {
    return leads.filter(lead => lead.status === status);
  };

  const getStatusTotal = (status: string) => {
    const statusLeads = getLeadsByStatus(status);
    const total = statusLeads.reduce((sum, lead) => sum + (lead.numericValue || 0), 0);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(total);
  };

  // Status que não devem mostrar o valor total
  const statusesWithoutTotal = ["Novo", "Contrato Fechado", "Finalizado"];

  const shouldShowTotal = (status: string) => {
    return !statusesWithoutTotal.includes(status);
  };

  const updateLeadStatus = async (leadId: string, newStatus: string, lossReason?: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (lossReason) {
        updateData.loss_reason = lossReason;
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId);

      if (error) {
        console.error('Erro ao atualizar status do lead:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o status do lead.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Status do lead atualizado com sucesso.",
      });

      onLeadUpdated();
    } catch (error) {
      console.error('Erro inesperado ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const deleteLead = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) {
        console.error('Erro ao excluir lead:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o lead.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Lead excluído com sucesso.",
      });

      onLeadUpdated();
    } catch (error) {
      console.error('Erro inesperado ao excluir lead:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao excluir o lead.",
        variant: "destructive"
      });
    }
  };

  const handleViewDetails = (transformedLead: TransformedLead) => {
    const originalLead = originalLeads.find(lead => lead.id === transformedLead.originalId);
    if (originalLead) {
      onViewDetails(originalLead);
    }
  };

  const handleDeleteLead = (leadId: string, leadName: string) => {
    setLeadToDelete({ id: leadId, name: leadName });
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteLead = () => {
    if (leadToDelete) {
      deleteLead(leadToDelete.id);
      setLeadToDelete(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, lead: TransformedLead) => {
    e.dataTransfer.setData('leadId', lead.originalId);
    e.dataTransfer.setData('currentStatus', lead.status);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    const currentStatus = e.dataTransfer.getData('currentStatus');

    if (leadId && currentStatus !== newStatus) {
      // Verificar se está tentando mover para "Finalizado" um lead que passou por "Proposta" ou "Reunião"
      if (newStatus === "Finalizado") {
        const hasPassedThroughRestrictedStatuses = hasLeadPassedThroughStatus(leadId, ["Proposta", "Reunião"]);
        
        if (hasPassedThroughRestrictedStatuses) {
          toast({
            title: "Movimento não permitido",
            description: "Leads que passaram por 'Proposta' ou 'Reunião' não podem ser movidos para 'Finalizado'.",
            variant: "destructive"
          });
          return;
        }
      }

      if (newStatus === "Perdido") {
        setPendingStatusChange({ leadId, newStatus });
        setIsLossReasonDialogOpen(true);
      } else {
        await updateLeadStatus(leadId, newStatus);
      }
    }
  };

  const handleLossReasonSelected = async (reason: string) => {
    if (pendingStatusChange) {
      await updateLeadStatus(pendingStatusChange.leadId, pendingStatusChange.newStatus, reason);
      setPendingStatusChange(null);
    }
  };

  const handleLossReasonCancel = () => {
    setPendingStatusChange(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statuses.map((status) => (
          <div 
            key={status.id} 
            className="bg-gray-50 rounded-lg p-4 min-h-[200px]"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status.id)}
          >
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{status.title}</h3>
                <Badge className={status.color}>
                  {getLeadsByStatus(status.id).length}
                </Badge>
              </div>
              {shouldShowTotal(status.id) && (
                <div className="text-sm font-medium text-green-600">
                  {getStatusTotal(status.id)}
                </div>
              )}
            </div>
            <div className="space-y-3">
              {getLeadsByStatus(status.id).map((lead) => (
                <Card 
                  key={lead.id} 
                  className="p-4 cursor-grab hover:shadow-md transition-shadow active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
                      {lead.avatar}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-gray-900">{lead.name}</h4>
                      <div className="flex items-center gap-1 text-xs">
                        <DollarSign className="h-3 w-3 text-green-600" />
                        <span className="text-green-600 font-medium">{lead.value}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{lead.phone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{lead.company}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">{lead.interest}</p>
                    <p className="text-xs text-gray-400">Último contato: {lead.lastContact}</p>
                  </div>

                  <div className="mt-2 flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-xs"
                      onClick={() => handleViewDetails(lead)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver
                    </Button>
                    <Button 
                      variant="destructive"
                      size="sm" 
                      className="flex-1 text-xs"
                      onClick={() => handleDeleteLead(lead.originalId, lead.name)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <LossReasonDialog
        open={isLossReasonDialogOpen}
        onOpenChange={setIsLossReasonDialogOpen}
        onReasonSelected={handleLossReasonSelected}
        onCancel={handleLossReasonCancel}
      />

      <DeleteLeadDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        leadName={leadToDelete?.name || ""}
        onConfirm={confirmDeleteLead}
      />
    </>
  );
}
