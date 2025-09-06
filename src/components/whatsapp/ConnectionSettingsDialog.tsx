import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { whatsappGateway, type GatewayConnection } from "@/integrations/whatsapp/gateway";
import { DeleteButton } from "@/components/DeleteButton";

interface ConnectionSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: GatewayConnection | null;
  onUpdated: () => void;
  onDeleted: () => void;
}

export const ConnectionSettingsDialog: React.FC<ConnectionSettingsDialogProps> = ({
  open,
  onOpenChange,
  connection,
  onUpdated,
  onDeleted
}) => {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshInfo = async () => {
    if (!connection) return;

    setIsRefreshing(true);
    try {
      await whatsappGateway.refreshConnection(connection.id);
      toast({
        title: "Sucesso",
        description: "Informações da conexão atualizadas"
      });
      onUpdated();
    } catch (error: any) {
      console.error('Erro ao atualizar informações:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar informações da conexão",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!connection) return;

    try {
      await whatsappGateway.deleteConnection(connection.id);
      toast({
        title: "Sucesso",
        description: "Conexão excluída com sucesso"
      });
      onDeleted();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao excluir conexão:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir a conexão",
        variant: "destructive"
      });
      throw error; // Re-throw para o DeleteButton handle
    }
  };

  if (!connection) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurações da Conexão</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="connection-name">Nome da Conexão</Label>
            <Input
              id="connection-name"
              value={connection.name}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>Informações</Label>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Telefone:</strong> {
                connection.phone_number || (
                  connection.status === 'connected' ? 
                    <span className="text-orange-600">Sincronizando...</span> : 
                    'Não configurado'
                )
              }</p>
              <p><strong>Status:</strong> {connection.status}</p>
              {connection.last_connected_at && (
                <p><strong>Última conexão:</strong> {new Date(connection.last_connected_at).toLocaleString('pt-BR')}</p>
              )}
            </div>
            
            {!connection.phone_number && connection.status === 'connected' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshInfo}
                disabled={isRefreshing}
                className="mt-2"
              >
                {isRefreshing ? "Carregando..." : "Recarregar informações"}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <DeleteButton
            onDelete={handleDelete}
            itemName={connection.name}
            itemType="conexão"
            size="default"
          />
          
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};