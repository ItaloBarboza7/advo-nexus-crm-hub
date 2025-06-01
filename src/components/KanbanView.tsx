
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, DollarSign, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";

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

  const getLeadsByStatus = (status: string) => {
    return leads.filter(lead => lead.status === status);
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
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

  const deleteLead = async (leadId: string, leadName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o lead "${leadName}"?`)) {
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
    }
  };

  const handleViewDetails = (transformedLead: TransformedLead) => {
    const originalLead = originalLeads.find(lead => lead.id === transformedLead.originalId);
    if (originalLead) {
      onViewDetails(originalLead);
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
      await updateLeadStatus(leadId, newStatus);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statuses.map((status) => (
        <div 
          key={status.id} 
          className="bg-gray-50 rounded-lg p-4 min-h-[200px]"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, status.id)}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{status.title}</h3>
            <Badge className={status.color}>
              {getLeadsByStatus(status.id).length}
            </Badge>
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
                    onClick={() => deleteLead(lead.originalId, lead.name)}
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
  );
}
