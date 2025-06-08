
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ActionGroup {
  id: string;
  name: string;
  description: string;
}

interface AddActionTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTypeAdded: () => void;
  actionGroups: ActionGroup[];
}

export function AddActionTypeDialog({ isOpen, onClose, onTypeAdded, actionGroups }: AddActionTypeDialogProps) {
  const [name, setName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !selectedGroupId) {
      toast({
        title: "Erro",
        description: "Nome e grupo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('action_types')
        .insert({
          name: name.toLowerCase().replace(/\s+/g, '-'),
          action_group_id: selectedGroupId
        });

      if (error) {
        console.error('Erro ao criar tipo:', error);
        toast({
          title: "Erro",
          description: "Não foi possível criar o tipo de ação.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Tipo de ação criado com sucesso.",
      });

      setName("");
      setSelectedGroupId("");
      onTypeAdded();
      onClose();
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setSelectedGroupId("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Tipo de Ação</DialogTitle>
          <DialogDescription>
            Crie um novo tipo de ação para um grupo específico.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="group">Grupo de Ação</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um grupo" />
                </SelectTrigger>
                <SelectContent>
                  {actionGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.description || group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Tipo</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: E-mail Marketing"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Criando..." : "Criar Tipo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
