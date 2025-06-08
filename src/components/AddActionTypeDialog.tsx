
import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Trash2 } from "lucide-react";

interface ActionGroup {
  id: string;
  name: string;
  description: string;
}

interface ActionType {
  id: string;
  name: string;
  action_group_id: string;
  action_groups?: ActionGroup;
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
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<ActionType | null>(null);
  const { toast } = useToast();

  const fetchActionTypes = async () => {
    setIsLoadingTypes(true);
    try {
      const { data, error } = await supabase
        .from('action_types')
        .select(`
          *,
          action_groups:action_group_id (
            id,
            name,
            description
          )
        `)
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro ao buscar tipos:', error);
        return;
      }

      setActionTypes(data || []);
    } catch (error) {
      console.error('Erro inesperado ao buscar tipos:', error);
    } finally {
      setIsLoadingTypes(false);
    }
  };

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
      fetchActionTypes();
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

  const handleDeleteClick = (e: React.MouseEvent, type: ActionType) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🗑️ Delete button clicked for type:', type.name);
    console.log('🔍 Setting typeToDelete:', type);
    setTypeToDelete(type);
    console.log('📋 Opening delete dialog...');
    setDeleteDialogOpen(true);
    console.log('✅ Delete dialog state set to true');
  };

  const handleDeleteConfirm = async () => {
    console.log('🔥 handleDeleteConfirm chamado para tipo');
    if (!typeToDelete) {
      console.log('❌ Nenhum tipo selecionado para exclusão');
      return;
    }

    console.log('🗑️ Confirmando exclusão do tipo:', typeToDelete.name);

    try {
      const { error } = await supabase
        .from('action_types')
        .delete()
        .eq('id', typeToDelete.id);

      if (error) {
        console.error('❌ Erro ao excluir tipo:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o tipo de ação.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Tipo excluído com sucesso');
      toast({
        title: "Sucesso",
        description: "Tipo de ação excluído com sucesso.",
      });

      fetchActionTypes();
      onTypeAdded();
    } catch (error) {
      console.error('❌ Erro inesperado ao excluir tipo:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      console.log('🔄 Fechando dialog e limpando estado');
      setDeleteDialogOpen(false);
      setTypeToDelete(null);
    }
  };

  const handleDeleteDialogClose = (open: boolean) => {
    console.log('🔄 Delete dialog onOpenChange called with:', open);
    if (!open) {
      console.log('❌ Fechando dialog de exclusão de tipo');
      setDeleteDialogOpen(false);
      setTypeToDelete(null);
    }
  };

  const handleClose = () => {
    setName("");
    setSelectedGroupId("");
    onClose();
  };

  React.useEffect(() => {
    if (isOpen) {
      fetchActionTypes();
    }
  }, [isOpen]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Gerenciar Tipos de Ação</DialogTitle>
            <DialogDescription>
              Crie novos tipos de ação ou gerencie os existentes.
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
                <Label htmlFor="name">Nome do Novo Tipo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ligação, Email, Reunião..."
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Criando..." : "Criar Tipo"}
              </Button>
            </DialogFooter>
          </form>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Tipos Existentes</h4>
            {isLoadingTypes ? (
              <div className="text-sm text-gray-500">Carregando...</div>
            ) : actionTypes.length === 0 ? (
              <div className="text-sm text-gray-500">Nenhum tipo cadastrado</div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {actionTypes.map((type) => (
                  <div key={type.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{type.name}</span>
                      <span className="text-xs text-gray-500">
                        {type.action_groups?.description || 'Grupo não encontrado'}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteClick(e, type)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={handleDeleteDialogClose}
        itemName={typeToDelete?.name || ""}
        itemType="o tipo de ação"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
