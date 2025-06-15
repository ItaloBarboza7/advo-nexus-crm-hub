import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DeleteButton } from "@/components/DeleteButton";

interface LeadSource {
  id: string;
  name: string;
  label: string;
  user_id?: string | null;
}

interface AddLeadSourceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSourceAdded: () => void;
}

export function AddLeadSourceDialog({ isOpen, onClose, onSourceAdded }: AddLeadSourceDialogProps) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [editingSource, setEditingSource] = useState<{ id: string; label: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Busca somente fontes visíveis para este tenant
  const fetchLeadSources = async () => {
    setIsLoadingSources(true);
    try {
      // Use função de visibilidade
      const { data, error } = await supabase
        .rpc('get_visible_lead_sources')
        .order('label', { ascending: true });

      if (error) {
        console.error('Erro ao buscar fontes:', error);
        return;
      }

      setLeadSources(data || []);
    } catch (error) {
      console.error('Erro inesperado ao buscar fontes:', error);
    } finally {
      setIsLoadingSources(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      // Cria uma fonte "do tenant" (user_id set via trigger no backend)
      const { error } = await supabase
        .from('lead_sources')
        .insert({
          name: name.toLowerCase().replace(/\s+/g, '-'),
          label: name.trim()
        });

      if (error) {
        console.error('Erro ao criar fonte:', error);
        toast({
          title: "Erro",
          description: "Não foi possível criar a fonte de lead.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Fonte de lead criada com sucesso.",
      });

      setName("");
      onSourceAdded();
      fetchLeadSources();
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

  const handleUpdateSource = async () => {
    if (!editingSource || !editingSource.label.trim()) {
      toast({ title: "Erro", description: "O nome não pode ser vazio.", variant: "destructive" });
      return;
    }

    setIsUpdating(true);
    const newLabel = editingSource.label.trim();
    const newName = newLabel.toLowerCase().replace(/\s+/g, "-");

    try {
      const { error } = await supabase
        .from("lead_sources")
        .update({ label: newLabel, name: newName })
        .eq("id", editingSource.id);

      if (error) {
        console.error("Erro ao atualizar fonte:", error);
        toast({ title: "Erro", description: "Não foi possível atualizar a fonte.", variant: "destructive" });
        return;
      }

      toast({ title: "Sucesso", description: "Fonte atualizada com sucesso." });
      setEditingSource(null);
      fetchLeadSources();
    } catch (error) {
      console.error("Erro inesperado ao atualizar fonte:", error);
      toast({ title: "Erro", description: "Ocorreu um erro inesperado.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  // Só permite excluir fontes do tenant (não as default/globais - proteger frontend)
  const handleDeleteSource = async (sourceId: string) => {
    const thisSource = leadSources.find(s => s.id === sourceId);
    if (!thisSource) return; // Não achou, não faz nada
    if (!thisSource.user_id) {
      toast({
        title: "Ação bloqueada",
        description: "Não é possível excluir uma fonte global/padrão.",
        variant: "destructive"
      });
      return;
    }

    console.log('🗑️ Iniciando exclusão da fonte com ID:', sourceId);
    const { error } = await supabase
      .from('lead_sources')
      .delete()
      .eq('id', sourceId);

    if (error) {
      console.error('❌ Erro ao excluir fonte:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a fonte de lead.",
        variant: "destructive"
      });
      throw error;
    }

    console.log('✅ Fonte excluída com sucesso');
    toast({
      title: "Sucesso",
      description: "Fonte de lead excluída com sucesso.",
    });

    fetchLeadSources();
    onSourceAdded();
  };

  const handleClose = () => {
    setName("");
    onClose();
  };

  React.useEffect(() => {
    if (isOpen) {
      fetchLeadSources();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Fontes de Lead</DialogTitle>
          <DialogDescription>
            Crie novas fontes de lead ou gerencie as existentes.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Nova Fonte</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Site, Indicação, Facebook..."
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Criando..." : "Criar Fonte"}
            </Button>
          </DialogFooter>
        </form>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Fontes Existentes</h4>
          {isLoadingSources ? (
            <div className="text-sm text-gray-500">Carregando...</div>
          ) : leadSources.length === 0 ? (
            <div className="text-sm text-gray-500">Nenhuma fonte cadastrada</div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {leadSources.map((source) => (
                <div key={source.id} className="flex items-center justify-between p-2 bg-gray-50 rounded gap-2">
                  {editingSource?.id === source.id ? (
                    <>
                      <Input
                        value={editingSource.label}
                        onChange={(e) => setEditingSource({ ...editingSource, label: e.target.value })}
                        className="h-9"
                        disabled={isUpdating}
                      />
                      <div className="flex items-center gap-1">
                        <Button size="sm" onClick={handleUpdateSource} disabled={isUpdating}>
                          {isUpdating ? "..." : "Salvar"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingSource(null)} disabled={isUpdating}>
                          Cancelar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">
                        {source.label}
                        {!source.user_id && (
                          <span className="ml-2 text-xs text-gray-400">(padrão)</span>
                        )}
                      </span>
                      <div className="flex items-center gap-1">
                        <DeleteButton
                          onDelete={() => handleDeleteSource(source.id)}
                          itemName={source.label}
                          itemType="a fonte de lead"
                          disabled={!source.user_id}
                        />
                      </div>
                    </>
                  )}
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
