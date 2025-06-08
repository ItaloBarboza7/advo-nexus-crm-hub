
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLossReasonsGlobal } from "@/hooks/useLossReasonsGlobal";

interface LossReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReasonSelected: (reason: string) => void;
  onCancel: () => void;
}

export function LossReasonDialog({ open, onOpenChange, onReasonSelected, onCancel }: LossReasonDialogProps) {
  const { lossReasons, addLossReason } = useLossReasonsGlobal();
  const [selectedReason, setSelectedReason] = useState("");
  const [newReason, setNewReason] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setSelectedReason("");
      setNewReason("");
      setIsAddingNew(false);
    }
  }, [open]);

  const handleAddNewReason = async () => {
    if (!newReason.trim()) return;

    setIsLoading(true);
    const success = await addLossReason(newReason.trim());
    
    if (success) {
      setNewReason("");
      setIsAddingNew(false);
    }
    
    setIsLoading(false);
  };

  const handleConfirm = () => {
    if (!selectedReason) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um motivo para a perda.",
        variant: "destructive"
      });
      return;
    }

    onReasonSelected(selectedReason);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Motivo da Perda</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Por que este lead foi perdido?</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {lossReasons.map((reason) => (
                  <SelectItem key={reason.id} value={reason.reason}>
                    {reason.reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isAddingNew ? (
            <div className="space-y-2">
              <Label htmlFor="newReason">Novo motivo</Label>
              <div className="flex gap-2">
                <Input
                  id="newReason"
                  placeholder="Digite o novo motivo"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                />
                <Button
                  onClick={handleAddNewReason}
                  disabled={isLoading || !newReason.trim()}
                  size="sm"
                >
                  Adicionar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsAddingNew(false)}
                  size="sm"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsAddingNew(true)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar novo motivo
            </Button>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!selectedReason}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Confirmar Perda
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
