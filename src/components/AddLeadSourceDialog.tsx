
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
  const { toast } = useToast();

  const fetchLeadSources = async () => {
    setIsLoadingSources(true);
    try {
      const { data, error } = await supabase
        .from('lead_sources')
        .select('*')
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

  const handleDeleteSource = async (sourceId: string) => {
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
                <div key={source.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{source.label}</span>
                  <DeleteButton
                    onDelete={() => handleDeleteSource(source.id)}
                    itemName={source.label}
                    itemType="a fonte de lead"
                  />
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
