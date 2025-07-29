import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DeleteButton } from "@/components/DeleteButton";

interface ActionGroup {
  id: string;
  name: string;
  description: string;
  user_id?: string | null;
}

interface AddActionGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupAdded: () => void;
}

export function AddActionGroupDialog({ isOpen, onClose, onGroupAdded }: AddActionGroupDialogProps) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [actionGroups, setActionGroups] = useState<ActionGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const { toast } = useToast();

  const fetchActionGroups = async () => {
    setIsLoadingGroups(true);
    try {
      const { data, error } = await supabase
        .rpc('get_visible_action_groups')
        .order('description', { ascending: true });

      if (error) {
        console.error('Erro ao buscar grupos (dialog):', error);
        return;
      }
      
      setActionGroups(data || []);
    } catch (error) {
      console.error('Erro inesperado ao buscar grupos (dialog):', error);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('action_groups')
        .insert({
          name: name.toLowerCase().replace(/\s+/g, '-'),
          description: name.trim()
        });

      if (error) {
        console.error('Erro ao criar grupo:', error);
        toast({
          title: "Erro",
          description: "Não foi possível criar o grupo de ação.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Grupo de ação criado com sucesso.",
      });

      setName("");
      onGroupAdded();
      fetchActionGroups();
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

  const handleDeleteGroup = async (groupId: string, groupDescription: string) => {
    try {
      const { error } = await supabase
        .from('action_groups')
        .delete()
        .eq('id', groupId);

      if (error) {
        console.error('❌ Erro ao excluir grupo:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o grupo de ação. Verifique se ele já foi removido.",
          variant: "destructive"
        });
        throw error;
      }

      toast({
        title: "Sucesso",
        description: `Grupo de ação "${groupDescription}" e seus tipos associados foram excluídos.`,
      });

      setActionGroups((prev) => prev.filter((g) => g.id !== groupId));
      onGroupAdded();
    } catch (e) {
      // erro já tratado acima
    }
  };

  const handleClose = () => {
    setName("");
    onClose();
  };

  React.useEffect(() => {
    if (isOpen) {
      fetchActionGroups();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Grupos de Ação</DialogTitle>
          <DialogDescription>
            Crie novos grupos de ação ou gerencie os existentes.<br />
            <span className="text-xs text-muted-foreground block mt-1">
              Ao excluir um grupo, todos os tipos de ação vinculados a ele também serão excluídos automaticamente.
            </span>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Novo Grupo</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do grupo"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Criando..." : "Criar Grupo"}
            </Button>
          </DialogFooter>
        </form>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Grupos Existentes</h4>
          {isLoadingGroups ? (
            <div className="text-sm text-gray-500">Carregando...</div>
          ) : actionGroups.length === 0 ? (
            <div className="text-sm text-gray-500">Nenhum grupo cadastrado</div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {actionGroups.map((group) => (
                <div key={group.id} className="flex items-center justify-between p-2 bg-gray-50 rounded gap-2">
                  <span className="text-sm">
                    {group.description}
                    {!group.user_id && (
                      <span className="ml-2 text-xs text-gray-400">(padrão)</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    <DeleteButton
                      onDelete={() => handleDeleteGroup(group.id, group.description)}
                      itemName={group.description}
                      itemType="o grupo de ação"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
