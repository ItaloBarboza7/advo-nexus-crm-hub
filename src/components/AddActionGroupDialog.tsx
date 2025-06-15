import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DeleteButton } from "@/components/DeleteButton";
import { Badge } from "@/components/ui/badge";

interface ActionGroup {
  id: string;
  name: string;
  description: string;
  user_id: string | null;
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
        .rpc('get_visible_action_groups');

      if (error) {
        console.error('Erro ao buscar grupos (dialog):', error);
        return;
      }
      
      const sortedData = (data || []).sort((a, b) => 
        (a.description || a.name).localeCompare(b.description || b.name)
      );
      setActionGroups(sortedData as ActionGroup[]);
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

  const handleRemoveOrHideGroup = async (group: ActionGroup) => {
    if (group.user_id === null) {
      const { error } = await supabase
        .from('hidden_default_items')
        .insert({ item_id: group.id, item_type: 'action_group' });

      if (error) {
        console.error('❌ Erro ao ocultar grupo:', error);
        toast({ title: "Erro", description: "Não foi possível remover o grupo de ação.", variant: "destructive" });
        return;
      }
      toast({ title: "Sucesso", description: "Grupo de ação padrão removido da sua visualização." });
    } else {
      const { error } = await supabase
        .from('action_groups')
        .delete()
        .eq('id', group.id);

      if (error) {
        console.error('❌ Erro ao excluir grupo:', error);
        let description = "Não foi possível excluir o grupo de ação.";
        if (error.code === '42501') {
          description = "Você não tem permissão para excluir este grupo de ação.";
        }
        toast({ title: "Erro", description, variant: "destructive" });
        return;
      }
      toast({ title: "Sucesso", description: "Grupo de ação excluído com sucesso." });
    }

    fetchActionGroups();
    onGroupAdded();
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
            Crie novos grupos de ação ou gerencie os existentes.
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
                placeholder="Ex: Vendas, Marketing, Suporte..."
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
                <div key={group.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{group.description}</span>
                  <div className="flex items-center gap-2">
                    {group.user_id === null && (
                      <Badge variant="secondary" className="text-xs font-medium">
                        Padrão
                      </Badge>
                    )}
                    <DeleteButton
                      onDelete={() => handleRemoveOrHideGroup(group)}
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
