
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AddLossReasonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onReasonAdded: () => void;
}

export function AddLossReasonDialog({ isOpen, onClose, onReasonAdded }: AddLossReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      toast({
        title: "Erro",
        description: "O motivo da perda não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('loss_reasons')
        .insert([{ reason: reason.trim() }]);

      if (error) {
        console.error('Erro ao criar motivo de perda:', error);
        toast({
          title: "Erro",
          description: "Não foi possível criar o motivo de perda.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Motivo de perda criado com sucesso.",
      });

      setReason("");
      onReasonAdded();
      onClose();
    } catch (error) {
      console.error('Erro inesperado ao criar motivo de perda:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao criar o motivo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Motivo de Perda</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Perda</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Digite o motivo da perda"
              disabled={isLoading}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Criando..." : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
