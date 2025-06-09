
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { useLossReasonsGlobal } from "@/hooks/useLossReasonsGlobal";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useToast } from "@/hooks/use-toast";

export function LossReasonsManager() {
  const { lossReasons, loading, addLossReason, updateLossReason, deleteLossReason, refreshData } = useLossReasonsGlobal();
  const [newReason, setNewReason] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reasonToDelete, setReasonToDelete] = useState<{id: string, reason: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  console.log(`🔍 LossReasonsManager - Renderizando com ${lossReasons.length} motivos de perda`);
  console.log(`📋 LossReasonsManager - Motivos:`, lossReasons.map(r => `${r.reason} (fixed: ${r.is_fixed}, ID: ${r.id})`));

  const handleAddNew = async () => {
    if (!newReason.trim()) return;

    console.log(`➕ LossReasonsManager - Adicionando novo motivo: ${newReason.trim()}`);
    setIsLoading(true);
    const success = await addLossReason(newReason.trim());
    
    if (success) {
      console.log(`✅ LossReasonsManager - Motivo adicionado com sucesso`);
      setNewReason("");
      setIsAddingNew(false);
      // Forçar refresh para garantir sincronização
      await refreshData();
    }
    
    setIsLoading(false);
  };

  const handleStartEdit = (id: string, currentReason: string) => {
    console.log(`✏️ LossReasonsManager - Iniciando edição do motivo ID: ${id}, valor: ${currentReason}`);
    setEditingId(id);
    setEditingValue(currentReason);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingValue.trim()) return;

    console.log(`💾 LossReasonsManager - Salvando edição do motivo ID: ${editingId}, novo valor: ${editingValue.trim()}`);
    setIsLoading(true);
    const success = await updateLossReason(editingId, editingValue.trim());
    
    if (success) {
      console.log(`✅ LossReasonsManager - Motivo editado com sucesso`);
      setEditingId(null);
      setEditingValue("");
      // Forçar refresh para garantir sincronização
      await refreshData();
    }
    
    setIsLoading(false);
  };

  const handleCancelEdit = () => {
    console.log(`❌ LossReasonsManager - Cancelando edição`);
    setEditingId(null);
    setEditingValue("");
  };

  const handleDeleteClick = (id: string, reason: string, isFixed: boolean) => {
    console.log(`🗑️ LossReasonsManager - Clique para excluir motivo ID: ${id}, motivo: ${reason}, fixo: ${isFixed}`);
    
    if (isFixed) {
      toast({
        title: "Erro",
        description: "Este motivo não pode ser excluído pois é um motivo base do sistema.",
        variant: "destructive"
      });
      return;
    }

    setReasonToDelete({ id, reason });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!reasonToDelete) {
      console.log(`❌ LossReasonsManager - Nenhum motivo selecionado para exclusão`);
      return;
    }

    console.log(`✅ LossReasonsManager - Confirmando exclusão do motivo ID: ${reasonToDelete.id}, motivo: ${reasonToDelete.reason}`);
    setIsLoading(true);
    
    try {
      const success = await deleteLossReason(reasonToDelete.id);
      
      if (success) {
        console.log(`✅ LossReasonsManager - Motivo excluído com sucesso via hook`);
        
        // Fechar dialog imediatamente
        setReasonToDelete(null);
        setDeleteDialogOpen(false);
        
        // Forçar refresh completo dos dados para garantir sincronização
        console.log(`🔄 LossReasonsManager - Forçando refresh completo após exclusão`);
        await refreshData();
        
        console.log(`✅ LossReasonsManager - Refresh completo concluído`);
      } else {
        console.error(`❌ LossReasonsManager - Falha ao excluir motivo via hook`);
      }
    } catch (error) {
      console.error(`❌ LossReasonsManager - Erro ao excluir motivo:`, error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao excluir o motivo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelDelete = () => {
    console.log(`❌ LossReasonsManager - Cancelando exclusão`);
    setReasonToDelete(null);
    setDeleteDialogOpen(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Motivos de Perda</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Carregando motivos de perda...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Motivos de Perda
            {!isAddingNew && (
              <Button
                onClick={() => setIsAddingNew(true)}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAddingNew && (
            <div className="flex gap-2 p-3 border rounded-lg bg-gray-50">
              <Input
                placeholder="Digite o novo motivo de perda"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddNew()}
              />
              <Button
                onClick={handleAddNew}
                disabled={isLoading || !newReason.trim()}
                size="sm"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingNew(false);
                  setNewReason("");
                }}
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {lossReasons.length === 0 ? (
              <p className="text-sm text-gray-500 italic text-center py-4">
                Nenhum motivo de perda cadastrado
              </p>
            ) : (
              lossReasons.map((reason) => (
                <div key={reason.id} className="flex items-center gap-2 p-3 border rounded-lg">
                  {editingId === reason.id ? (
                    <div className="flex gap-2 flex-1">
                      <Input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSaveEdit}
                        disabled={isLoading || !editingValue.trim()}
                        size="sm"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{reason.reason}</span>
                      {reason.is_fixed && (
                        <Badge variant="secondary" className="text-xs">
                          Sistema
                        </Badge>
                      )}
                      <div className="flex gap-1">
                        {!reason.is_fixed && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEdit(reason.id, reason.reason)}
                              disabled={isLoading}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(reason.id, reason.reason, reason.is_fixed)}
                              disabled={isLoading}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={reasonToDelete?.reason || ""}
        itemType="motivo de perda"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
