import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, X } from "lucide-react";
import { useLossReasonsGlobal } from "@/hooks/useLossReasonsGlobal";
import { useToast } from "@/hooks/use-toast";
import { DeleteButton } from "@/components/DeleteButton";

// Removido: Edit2 do lucide-react

export function LossReasonsManager() {
  const { lossReasons, loading, addLossReason, deleteLossReason } = useLossReasonsGlobal();
  const [newReason, setNewReason] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  // Removido: editingId, editingValue (edição)
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  console.log(`🔍 LossReasonsManager - Renderizando com ${lossReasons.length} motivos de perda`);

  const handleAddNew = async () => {
    if (!newReason.trim()) return;

    console.log(`➕ LossReasonsManager - Adicionando novo motivo: ${newReason.trim()}`);
    setIsLoading(true);
    const success = await addLossReason(newReason.trim());
    if (success) {
      console.log(`✅ LossReasonsManager - Motivo adicionado com sucesso`);
      setNewReason("");
      setIsAddingNew(false);
    }
    setIsLoading(false);
  };

  // Removido: Funções de edição (handleStartEdit, handleSaveEdit, handleCancelEdit)

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
                        <DeleteButton
                          onDelete={async () => {
                            setIsLoading(true);
                            await deleteLossReason(reason.id);
                            setIsLoading(false);
                          }}
                          itemName={reason.reason}
                          itemType="motivo de perda"
                          disabled={isLoading}
                          size="sm"
                          variant="ghost"
                        />
                      </>
                    )}
                  </div>
                </>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
