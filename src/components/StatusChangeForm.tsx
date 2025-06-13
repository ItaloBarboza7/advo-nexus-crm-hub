import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLeadStatusUpdate } from "@/hooks/useLeadStatusUpdate";
import { Lead } from "@/types/lead";

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order_position: number;
  is_default: boolean;
}

interface StatusChangeFormProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChanged: () => void;
  kanbanColumns: KanbanColumn[];
}

const COMMON_LOSS_REASONS = [
  "Preço muito alto",
  "Optou por outro fornecedor",
  "Não teve interesse",
  "Sem orçamento disponível",
  "Projeto cancelado",
  "Não retornou contato",
  "Falta de necessidade",
  "Timing inadequado"
];

export function StatusChangeForm({ lead, open, onOpenChange, onStatusChanged, kanbanColumns }: StatusChangeFormProps) {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [lossReason, setLossReason] = useState("");
  const [customLossReason, setCustomLossReason] = useState("");
  const [isFormReady, setIsFormReady] = useState(false);
  const { updateLeadStatus, isUpdating } = useLeadStatusUpdate();

  useEffect(() => {
    if (lead && open && kanbanColumns.length > 0) {
      console.log("🔄 StatusChangeForm - Inicializando com lead:", lead.name, "Status:", lead.status);
      setSelectedStatus(lead.status);
      setLossReason(lead.loss_reason || "");
      setCustomLossReason("");
      setIsFormReady(true);
    } else if (!open) {
      // Reset quando o modal fechar
      setIsFormReady(false);
      setSelectedStatus("");
      setLossReason("");
      setCustomLossReason("");
    }
  }, [lead, open, kanbanColumns]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lead || !selectedStatus) return;

    // Se está mudando para "Perdido" e não há motivo da perda
    if (selectedStatus === "Perdido" && !lossReason && !customLossReason) {
      return; // O formulário não deve permitir submissão sem motivo
    }

    const finalLossReason = selectedStatus === "Perdido" 
      ? (customLossReason || lossReason) 
      : undefined;

    const success = await updateLeadStatus(lead.id, selectedStatus, finalLossReason);
    
    if (success) {
      onStatusChanged();
      onOpenChange(false);
    }
  };

  const getStatusColor = (status: string) => {
    const column = kanbanColumns.find(col => col.name === status);
    if (column) {
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const showLossReasonField = selectedStatus === "Perdido";

  // Mostrar loading enquanto o formulário não estiver pronto
  if (!isFormReady) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Status do Lead</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Status do Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {lead && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm">
                {lead.name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{lead.name}</h3>
                <Badge className={getStatusColor(lead.status)} variant="outline">
                  {lead.status}
                </Badge>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">Novo Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o novo status" />
              </SelectTrigger>
              <SelectContent>
                {kanbanColumns.map((column) => (
                  <SelectItem key={column.id} value={column.name}>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(column.name)}`}>
                        {column.name}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showLossReasonField && (
            <div className="space-y-2">
              <Label htmlFor="lossReason">Motivo da Perda *</Label>
              <Select value={lossReason} onValueChange={(value) => {
                setLossReason(value);
                if (value !== "Outro") {
                  setCustomLossReason("");
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo da perda" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_LOSS_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                  <SelectItem value="Outro">Outro motivo</SelectItem>
                </SelectContent>
              </Select>
              
              {lossReason === "Outro" && (
                <div className="space-y-2">
                  <Label htmlFor="customLossReason">Especifique o motivo</Label>
                  <Textarea
                    id="customLossReason"
                    value={customLossReason}
                    onChange={(e) => setCustomLossReason(e.target.value)}
                    placeholder="Descreva o motivo da perda..."
                    required
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isUpdating || (showLossReasonField && !lossReason && !customLossReason)}
              className="flex-1"
            >
              {isUpdating ? "Atualizando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
