
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWhatsAppConnections } from "@/hooks/useWhatsAppConnections";
import { WhatsAppConnection, UpdateWhatsAppConnectionRequest } from "@/types/whatsapp";

interface EditWhatsAppConnectionDialogProps {
  connection: WhatsAppConnection | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditWhatsAppConnectionDialog({ connection, isOpen, onClose }: EditWhatsAppConnectionDialogProps) {
  const [formData, setFormData] = useState<UpdateWhatsAppConnectionRequest>({
    name: '',
    phone_number: '',
    webhook_url: '',
    status: 'disconnected',
  });

  const { updateConnection, isUpdating } = useWhatsAppConnections();

  useEffect(() => {
    if (connection) {
      setFormData({
        name: connection.name,
        phone_number: connection.phone_number,
        webhook_url: connection.webhook_url || '',
        status: connection.status,
      });
    }
  }, [connection]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connection || !formData.name || !formData.phone_number) {
      return;
    }

    const updateData: UpdateWhatsAppConnectionRequest & { id: string } = {
      id: connection.id,
      ...formData,
      webhook_url: formData.webhook_url || undefined,
    };

    updateConnection(updateData);
    onClose();
  };

  const formatPhoneNumber = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos (formato brasileiro)
    const limited = numbers.slice(0, 11);
    
    // Aplica a máscara
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 7) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone_number: formatted }));
  };

  if (!connection) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Conexão WhatsApp</DialogTitle>
          <DialogDescription>
            Faça alterações na conexão WhatsApp selecionada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Conexão *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Atendimento Principal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">Número do WhatsApp *</Label>
            <Input
              id="phone_number"
              value={formData.phone_number}
              onChange={handlePhoneChange}
              placeholder="(11) 99999-9999"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook_url">URL do Webhook</Label>
            <Input
              id="webhook_url"
              type="url"
              value={formData.webhook_url}
              onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
              placeholder="https://seu-site.com/webhook"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'connected' | 'disconnected' | 'pending') => 
                setFormData(prev => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="connected">Conectado</SelectItem>
                <SelectItem value="disconnected">Desconectado</SelectItem>
                <SelectItem value="pending">Conectando</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
