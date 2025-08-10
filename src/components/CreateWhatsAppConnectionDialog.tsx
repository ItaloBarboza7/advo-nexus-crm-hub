
import { useState } from "react";
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
import { useWhatsAppConnections } from "@/hooks/useWhatsAppConnections";
import { CreateWhatsAppConnectionRequest } from "@/types/whatsapp";

interface CreateWhatsAppConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWhatsAppConnectionDialog({ isOpen, onClose }: CreateWhatsAppConnectionDialogProps) {
  const [formData, setFormData] = useState<CreateWhatsAppConnectionRequest>({
    name: '',
    phone_number: '',
    webhook_url: '',
  });

  const { createConnection, isCreating } = useWhatsAppConnections();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone_number) {
      return;
    }

    const connectionData: CreateWhatsAppConnectionRequest = {
      ...formData,
      webhook_url: formData.webhook_url || undefined,
    };

    createConnection(connectionData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      phone_number: '',
      webhook_url: '',
    });
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Conexão WhatsApp</DialogTitle>
          <DialogDescription>
            Adicione uma nova conexão WhatsApp para atendimento.
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
            <p className="text-xs text-muted-foreground">
              Digite apenas o número com DDD (sem +55)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook_url">URL do Webhook (Opcional)</Label>
            <Input
              id="webhook_url"
              type="url"
              value={formData.webhook_url}
              onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
              placeholder="https://seu-site.com/webhook"
            />
            <p className="text-xs text-muted-foreground">
              URL para receber notificações de mensagens
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Criando..." : "Criar Conexão"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
