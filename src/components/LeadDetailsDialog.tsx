import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, User, FileText, Tag, DollarSign, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";
import { LeadStatusHistory } from "@/types/leadStatusHistory";

interface LeadDetailsDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditLead?: (lead: Lead) => void;
}

const LEAD_STATUSES = [
  { id: "Novo", title: "Novo", color: "bg-blue-100 text-blue-800" },
  { id: "Proposta", title: "Proposta", color: "bg-purple-100 text-purple-800" },
  { id: "Reunião", title: "Reunião", color: "bg-orange-100 text-orange-800" },
  { id: "Contrato Fechado", title: "Contrato Fechado", color: "bg-green-100 text-green-800" },
  { id: "Perdido", title: "Perdido", color: "bg-red-100 text-red-800" },
  { id: "Finalizado", title: "Finalizado", color: "bg-gray-100 text-gray-800" },
];

export function LeadDetailsDialog({ lead, open, onOpenChange, onEditLead }: LeadDetailsDialogProps) {
  const [statusHistory, setStatusHistory] = useState<LeadStatusHistory[]>([]);

  const fetchStatusHistory = async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from('lead_status_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('changed_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico de status:', error);
        return;
      }

      setStatusHistory(data || []);
    } catch (error) {
      console.error('Erro inesperado ao buscar histórico:', error);
    }
  };

  useEffect(() => {
    if (lead && open) {
      fetchStatusHistory(lead.id);
    }
  }, [lead, open]);

  if (!lead) return null;

  const getStatusColor = (status: string) => {
    const statusConfig = LEAD_STATUSES.find(s => s.id === status);
    return statusConfig ? statusConfig.color : 'bg-gray-100 text-gray-800';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleEditClick = () => {
    if (onEditLead && lead) {
      onEditLead(lead);
      onOpenChange(false);
    }
  };

  // Combinar histórico de status com a criação do lead
  const getCompleteHistory = () => {
    const history = [...statusHistory];
    
    // Adicionar a criação do lead ao histórico se não houver histórico ou se o mais antigo não for a criação
    const hasCreationEntry = history.some(h => h.old_status === null);
    
    if (!hasCreationEntry) {
      history.push({
        id: `creation-${lead.id}`,
        lead_id: lead.id,
        old_status: null,
        new_status: lead.status,
        changed_at: lead.created_at,
        created_at: lead.created_at
      });
    }
    
    return history.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
  };

  const completeHistory = getCompleteHistory();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-semibold">
              {getInitials(lead.name)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{lead.name}</h2>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(lead.status)}>
                  {lead.status}
                </Badge>
                <div className="flex items-center gap-1 text-green-600 font-medium">
                  <DollarSign className="h-4 w-4" />
                  <span>{formatCurrency(lead.value)}</span>
                </div>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Informações de Contato */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Informações de Contato
            </h3>
            <div className="space-y-3">
              {lead.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{lead.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{lead.phone}</span>
              </div>
              {lead.state && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{lead.state}</span>
                </div>
              )}
            </div>
          </div>

          {/* Informações Comerciais */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Informações Comerciais
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Valor Potencial:</span>
                <span className="text-green-600 font-semibold">{formatCurrency(lead.value)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Status:</span>
                <Badge className={getStatusColor(lead.status)} variant="outline">
                  {lead.status}
                </Badge>
              </div>
              {lead.loss_reason && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Motivo da Perda:</span>
                  <span className="text-red-600">{lead.loss_reason}</span>
                </div>
              )}
            </div>
          </div>

          {/* Informações Adicionais */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Informações Adicionais
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Fonte:</span>
                <span>{lead.source || 'Não informado'}</span>
              </div>
              {lead.action_type && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Tipo de Ação:</span>
                  <span>{lead.action_type}</span>
                </div>
              )}
            </div>
          </div>

          {/* Descrição */}
          {lead.description && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Descrição
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{lead.description}</p>
            </div>
          )}

          {/* Histórico de Status Completo */}
          {completeHistory.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Histórico de Status
              </h3>
              <div className="space-y-3">
                {completeHistory.map((history) => (
                  <div key={history.id} className="flex items-center justify-between text-sm border-l-2 border-blue-200 pl-3">
                    <div>
                      <span className="text-gray-600">
                        {history.old_status ? `${history.old_status} → ` : 'Lead criado em '}
                      </span>
                      <Badge className={getStatusColor(history.new_status)} variant="outline">
                        {history.new_status}
                      </Badge>
                    </div>
                    <span className="text-gray-400">{formatDate(history.changed_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Fechar
          </Button>
          <Button 
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={handleEditClick}
          >
            Editar Lead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
