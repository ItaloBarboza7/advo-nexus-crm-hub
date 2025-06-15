import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DeleteButton } from "@/components/DeleteButton";
import { Pencil } from "lucide-react";

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
  user_id?: string | null;
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
  const [editingType, setEditingType] = useState<{ id: string; name: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const fetchActionTypes = async () => {
    setIsLoadingTypes(true);
    try {
      const { data, error } = await supabase
        .rpc('get_visible_action_types')
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro ao buscar tipos de ação (dialog):', error);
        return;
      }

      console.log('Fetched Action Types from Dialog:', data);
      setActionTypes(data || []);
    } catch (error) {
      console.error('Erro inesperado ao buscar tipos (dialog):', error);
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

  const handleUpdateType = async () => {
    if (!editingType || !editingType.name.trim()) {
      toast({
        title: "Erro",
        description: "O nome não pode ser vazio.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.from("action_types").update({ name: editingType.name.trim() }).eq("id", editingType.id);

      if (error) {
        console.error("❌ Erro ao atualizar tipo:", error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o tipo de ação.",
          variant: "destructive",
        });
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Tipo de ação atualizado com sucesso.",
      });

      setEditingType(null);
      fetchActionTypes();
    } catch (e) {
      // erro já tratado
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteType = async (typeId: string) => {
    console.log('🗑️ Iniciando exclusão do tipo com ID:', typeId);
    
    const { error } = await supabase
      .from('action_types')
      .delete()
      .eq('id', typeId);

    if (error) {
      console.error('❌ Erro ao excluir tipo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o tipo de ação.",
        variant: "destructive"
      });
      throw error;
    }

    console.log('✅ Tipo excluído com sucesso');
    toast({
      title: "Sucesso",
      description: "Tipo de ação excluído com sucesso.",
    });

    fetchActionTypes();
    onTypeAdded();
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
              {actionTypes.map((type) => {
                const group = actionGroups.find((g) => g.id === type.action_group_id);
                return (
                  <div key={type.id} className="flex items-center justify-between p-2 bg-gray-50 rounded gap-2">
                    {editingType?.id === type.id ? (
                      <>
                        <Input
                          value={editingType.name}
                          onChange={(e) => setEditingType({ ...editingType, name: e.target.value })}
                          className="h-9"
                          disabled={isUpdating}
                        />
                        <div className="flex items-center gap-1">
                          <Button size="sm" onClick={handleUpdateType} disabled={isUpdating}>
                            {isUpdating ? "..." : "Salvar"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingType(null)} disabled={isUpdating}>
                            Cancelar
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {type.name}
                            {!type.user_id && <span className="ml-2 text-xs text-gray-400">(padrão)</span>}
                          </span>
                          <span className="text-xs text-gray-500">{group?.description || "Grupo não encontrado"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingType({ id: type.id, name: type.name })}
                            disabled={!type.user_id}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <DeleteButton
                            onDelete={() => handleDeleteType(type.id)}
                            itemName={type.name}
                            itemType="o tipo de ação"
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
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
