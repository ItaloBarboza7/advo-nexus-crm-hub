import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Phone, Mail, MapPin, Eye, Trash2, Edit } from "lucide-react";
import { Lead } from "@/types/lead";
import { DeleteLeadDialog } from "./DeleteLeadDialog";
import { useSimpleLeadOperations } from "@/hooks/useSimpleLeadOperations";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionControl } from "@/hooks/useSubscriptionControl";

interface Status {
  id: string;
  title: string;
  color: string;
}

// KanbanLead is a display-specific interface, not extending Lead
interface KanbanLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: string;
  interest: string;
  value: string; // Formatted currency string for display
  lastContact: string; // Formatted date string for display
  avatar: string; // Generated initials
  originalId: string;
  numericValue: number; // Original numeric value for calculations
  description: string | null;
  state: string | null;
  action_group: string | null;
  action_type: string | null;
}

interface KanbanViewProps {
  leads: KanbanLead[];
  statuses: Status[];
  onLeadUpdated: () => void;
  onViewDetails: (lead: Lead) => void;
  originalLeads: Lead[];
  onStatusChange?: (leadId: string, newStatus: string) => void;
}

export function KanbanView({ 
  leads, 
  statuses, 
  onLeadUpdated, 
  onViewDetails,
  originalLeads,
  onStatusChange 
}: KanbanViewProps) {
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [localLeads, setLocalLeads] = useState<KanbanLead[]>(leads);
  const { deleteLead, updateLead } = useSimpleLeadOperations();
  const { toast } = useToast();
  const { canAccessFeature } = useSubscriptionControl();

  // Sincronizar leads quando props mudarem
  React.useEffect(() => {
    console.log(`🔄 KanbanView - Sincronizando localLeads com props, ${leads.length} leads recebidos`);
    setLocalLeads(leads);
  }, [leads]);

  const handleDeleteLead = (leadId: string) => {
    if (!canAccessFeature('delete_lead')) {
      toast({
        title: "Acesso Restrito",
        description: "Deletar leads requer uma assinatura ativa.",
        variant: "destructive",
      });
      return;
    }

    const originalLead = originalLeads.find(l => l.id === leadId);
    if (originalLead) {
      setDeletingLead(originalLead);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLead) return;

    console.log('🗑️ KanbanView - Confirmando exclusão do lead:', deletingLead.id);
    
    // Use the unified simple deleteLead function
    const success = await deleteLead(deletingLead.id);
    
    if (success) {
      console.log('✅ KanbanView - Lead excluído com sucesso, atualizando dados...');
      setDeletingLead(null);
      onLeadUpdated(); // Força atualização imediata
    }
    // O toast já é mostrado pelo hook useSimpleLeadOperations
  };

  const getLeadsByStatus = (statusId: string) => {
    return localLeads.filter(lead => lead.status === statusId);
  };

  // 🎯 FUNÇÃO CORRIGIDA: handleStatusChange com logs detalhados e evitar dupla atualização otimista
  const handleStatusChange = async (leadId: string, newStatus: string) => {
    if (!canAccessFeature('edit_lead')) {
      toast({
        title: "Acesso Restrito", 
        description: "Alterar status requer uma assinatura ativa.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log(`🔄 KanbanView.handleStatusChange - Lead: ${leadId}, Status: ${newStatus}, barbozaeribeiro@gmail.com debug`);
      
      // 🎯 APENAS atualizar localLeads se NÃO há custom handler (para evitar dupla atualização otimista)
      if (!onStatusChange) {
        console.log(`✨ KanbanView - Atualizando localLeads otimisticamente (sem custom handler)`);
        setLocalLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId 
              ? { ...lead, status: newStatus }
              : lead
          )
        );
      }
      
      // If there's a custom status change handler (for loss reason logic), use it
      if (onStatusChange) {
        console.log(`🔄 KanbanView - Delegando para custom onStatusChange handler`);
        onStatusChange(leadId, newStatus);
        return;
      }
      
      // Otherwise, proceed with direct update
      console.log(`🔄 KanbanView - Executando update direto via useSimpleLeadOperations`);
      const success = await updateLead(leadId, { status: newStatus });
      
      if (success) {
        console.log(`✅ KanbanView - Status alterado com sucesso`);
        onLeadUpdated();
      } else {
        // Se falhou, reverter a mudança local
        console.log(`❌ KanbanView - Falha ao alterar status, revertendo mudança local`);
        setLocalLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId 
              ? { ...lead, status: leads.find(l => l.id === leadId)?.status || lead.status }
              : lead
          )
        );
      }
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error);
      
      // Reverter a mudança local em caso de erro (apenas se não há custom handler)
      if (!onStatusChange) {
        setLocalLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId 
              ? { ...lead, status: leads.find(l => l.id === leadId)?.status || lead.status }
              : lead
          )
        );
      }
      
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do lead.",
        variant: "destructive",
      });
    }
  };

  const onDragStart = (e: React.DragEvent, leadId: string) => {
    console.log(`🎯 KanbanView - Drag iniciado para lead: ${leadId}`);
    e.dataTransfer.setData("text/plain", leadId);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    if (leadId) {
      console.log(`🎯 KanbanView - Drop executado para lead: ${leadId} -> status: ${newStatus}`);
      await handleStatusChange(leadId, newStatus);
    }
  };

  // 🎯 FUNÇÃO CORRIGIDA: handleViewDetails com merge do status atual do localLeads
  const handleViewDetails = (leadId: string) => {
    console.log(`🔍 KanbanView.handleViewDetails - Abrindo detalhes para lead: ${leadId}, barbozaeribeiro@gmail.com debug`);
    
    const originalLead = originalLeads.find(l => l.id === leadId);
    const localLead = localLeads.find(l => l.id === leadId);
    
    if (originalLead && localLead) {
      // 🎯 MERGE: Usar dados originais mas com status atualizado do localLeads
      const mergedLead: Lead = {
        ...originalLead,
        status: localLead.status, // Usar status atualizado do Kanban
        updated_at: new Date().toISOString() // Simular atualização recente
      };
      
      console.log(`🔄 KanbanView - Lead mesclado para detalhes:`, {
        originalStatus: originalLead.status,
        localStatus: localLead.status,
        finalStatus: mergedLead.status,
        leadName: mergedLead.name
      });
      
      onViewDetails(mergedLead);
    } else {
      console.error(`❌ KanbanView - Lead não encontrado para detalhes: ${leadId}`);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
      {statuses.map((status) => {
        const statusLeads = getLeadsByStatus(status.id);
        const totalValue = statusLeads.reduce((sum, lead) => sum + lead.numericValue, 0);
        
        return (
          <div
            key={status.id}
            className="bg-gray-50 rounded-lg p-4 min-h-[500px]"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, status.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge className={status.color}>
                  {status.title}
                </Badge>
                <span className="text-sm text-gray-600">
                  ({statusLeads.length})
                </span>
              </div>
              {(status.title !== "Contrato Fechado" && status.title !== "Finalizado") && (
                <div className="text-sm font-semibold text-green-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(totalValue)}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {statusLeads.map((lead) => (
                <Card
                  key={lead.id}
                  className="cursor-move hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={(e) => onDragStart(e, lead.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium text-sm">
                          {lead.avatar}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-medium">
                            {lead.name}
                          </CardTitle>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleViewDetails(lead.id)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteLead(lead.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {lead.email && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Phone className="h-3 w-3" />
                        <span>{lead.phone}</span>
                      </div>
                      {lead.state && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin className="h-3 w-3" />
                          <span>{lead.state}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-medium text-green-600">
                          {lead.value}
                        </span>
                        <span className="text-xs text-gray-500">
                          {lead.lastContact}
                        </span>
                      </div>
                      {lead.interest && (
                        <Badge variant="outline" className="text-xs">
                          {lead.interest}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {deletingLead && (
        <DeleteLeadDialog
          open={!!deletingLead}
          onOpenChange={(open) => !open && setDeletingLead(null)}
          leadName={deletingLead.name}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
